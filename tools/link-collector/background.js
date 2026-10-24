// Service worker: collects matching URLs from network requests (webRequest)
// and from content scripts (DOM scan), dedupes them and keeps them in
// chrome.storage.local so they survive browser restarts.

const DEFAULT_PATTERN = 'images-ssl\\.gotestsite\\.com/u/';
const SAVE_DELAY_MS = 300;

let ready = null;
let saveTimer = null;

function compile(pattern) {
  return new RegExp(pattern, 'i');
}

function load() {
  ready ??= (async () => {
    const s = await chrome.storage.local.get({
      items: [],
      pattern: DEFAULT_PATTERN,
      enabled: true,
    });
    return {
      items: s.items,
      seen: new Set(s.items.map((i) => i.url)),
      pattern: s.pattern,
      regex: compile(s.pattern),
      enabled: s.enabled,
    };
  })();
  return ready;
}

function scheduleSave(state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    chrome.storage.local.set({ items: state.items });
  }, SAVE_DELAY_MS);
}

function updateBadge(state) {
  chrome.action.setBadgeText({ text: state.items.length ? String(state.items.length) : '' });
  chrome.action.setBadgeBackgroundColor({ color: state.enabled ? '#1a7f37' : '#888' });
}

// CloudFront signed URLs carry a base64 policy with the expiry time.
// URL-safe alphabet: '-' -> '+', '_' -> '=', '~' -> '/'.
function decodeExpiry(url) {
  try {
    const p = url.searchParams.get('Policy');
    if (p) {
      const policy = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '=').replace(/~/g, '/')));
      const t = policy.Statement[0].Condition.DateLessThan['AWS:EpochTime'];
      return new Date(t * 1000).toISOString();
    }
    const e = url.searchParams.get('Expires');
    if (e && /^\d+$/.test(e)) return new Date(Number(e) * 1000).toISOString();
  } catch {}
  return null;
}

async function add(rawUrl, meta) {
  const state = await load();
  if (!state.enabled) return;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }
  const href = url.href;
  if (!/^https?:$/.test(url.protocol) || !state.regex.test(href) || state.seen.has(href)) return;

  state.seen.add(href);
  state.items.push({
    url: href,
    path: url.pathname,
    expires: decodeExpiry(url),
    capturedAt: new Date().toISOString(),
    ...meta,
  });
  scheduleSave(state);
  updateBadge(state);
}

chrome.webRequest.onCompleted.addListener(
  (d) => {
    add(d.url, {
      source: 'network:' + d.type,
      status: d.statusCode,
      fromCache: d.fromCache,
      page: d.documentUrl || d.initiator || null,
    });
  },
  { urls: ['<all_urls>'] }
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const state = await load();
    switch (msg.type) {
      case 'found':
        for (const u of msg.urls) {
          await add(u, { source: 'dom', page: sender.url || null });
        }
        return { ok: true };
      case 'get':
        return { items: state.items, pattern: state.pattern, enabled: state.enabled };
      case 'setPattern':
        try {
          state.regex = compile(msg.pattern);
        } catch (e) {
          return { error: String(e.message || e) };
        }
        state.pattern = msg.pattern;
        await chrome.storage.local.set({ pattern: msg.pattern });
        return { ok: true };
      case 'setEnabled':
        state.enabled = msg.enabled;
        await chrome.storage.local.set({ enabled: msg.enabled });
        updateBadge(state);
        return { ok: true };
      case 'clear':
        state.items = [];
        state.seen.clear();
        clearTimeout(saveTimer);
        await chrome.storage.local.set({ items: [] });
        updateBadge(state);
        return { ok: true };
    }
    return { error: 'unknown message' };
  })().then(sendResponse);
  return true;
});

load().then(updateBadge);
