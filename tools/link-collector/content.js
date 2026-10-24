// Content script: picks up matching URLs from the DOM (img src/srcset,
// <source srcset>, inline background-image). This catches images served
// from the memory cache, which never show up in webRequest.

(() => {
  let regex = null;
  let enabled = true;
  const sent = new Set();
  let pending = [];
  let flushTimer = null;

  function flush() {
    flushTimer = null;
    if (!pending.length) return;
    const urls = pending;
    pending = [];
    chrome.runtime.sendMessage({ type: 'found', urls }).catch(() => {});
  }

  function consider(raw) {
    if (!regex || !enabled || !raw) return;
    let href;
    try {
      href = new URL(raw, location.href).href;
    } catch {
      return;
    }
    if (sent.has(href) || !regex.test(href)) return;
    sent.add(href);
    pending.push(href);
    flushTimer ??= setTimeout(flush, 200);
  }

  function scanEl(el) {
    if (el.nodeType !== 1) return;
    if (el.tagName === 'IMG' || el.tagName === 'SOURCE') {
      consider(el.getAttribute('src') && el.src);
      for (const part of (el.getAttribute('srcset') || '').split(',')) {
        consider(part.trim().split(/\s+/)[0]);
      }
    }
    const bg = el.style && el.style.backgroundImage;
    if (bg) {
      for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) consider(m[1]);
    }
  }

  function scanTree(root) {
    scanEl(root);
    root.querySelectorAll?.('img, source, [style*="url("]').forEach(scanEl);
  }

  function rescan() {
    sent.clear();
    if (document.documentElement) scanTree(document.documentElement);
  }

  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes') scanEl(m.target);
      else m.addedNodes.forEach(scanTree);
    }
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'style'],
  });

  chrome.storage.local.get({ pattern: 'images-ssl\\.gotestsite\\.com/u/', enabled: true }).then((s) => {
    try {
      regex = new RegExp(s.pattern, 'i');
    } catch {}
    enabled = s.enabled;
    rescan();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.pattern) {
      try {
        regex = new RegExp(changes.pattern.newValue, 'i');
      } catch {}
    }
    if (changes.enabled) enabled = changes.enabled.newValue;
    if (changes.pattern || changes.enabled || (changes.items && !changes.items.newValue?.length)) rescan();
  });
})();
