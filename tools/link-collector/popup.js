const $ = (id) => document.getElementById(id);
const LIST_LIMIT = 50;
// User id = first path segment after /u/, e.g. /u/aWYy9yopNb9mvqkufn3KoG/x.webp
const USER_RE = /^\/u\/([^/]+)\//;
const NO_USER = '(bez usera)';

let items = [];

function send(msg) {
  return chrome.runtime.sendMessage(msg);
}

function status(text) {
  $('status').textContent = text;
}

function userOf(item) {
  return item.path.match(USER_RE)?.[1] ?? NO_USER;
}

function fileOf(item) {
  return item.path.split('/').pop();
}

// { userId: { count, firstSeen, lastSeen, images: [...] } }, in order of first appearance
function grouped() {
  const groups = {};
  for (const i of items) {
    const user = userOf(i);
    const g = (groups[user] ??= { count: 0, firstSeen: i.capturedAt, lastSeen: i.capturedAt, images: [] });
    g.images.push({
      file: fileOf(i),
      url: i.url,
      expires: i.expires,
      capturedAt: i.capturedAt,
      source: i.source,
      status: i.status,
      fromCache: i.fromCache,
      page: i.page,
    });
    g.count++;
    g.lastSeen = i.capturedAt;
  }
  return groups;
}

function render() {
  const groups = grouped();
  const users = Object.keys(groups);
  $('count').textContent = items.length;
  $('users').textContent = `${users.length} user${users.length === 1 ? '' : 'ów'}`;

  const list = $('list');
  list.replaceChildren(
    ...users
      .slice(-LIST_LIMIT)
      .reverse()
      .map((user) => {
        const g = groups[user];
        const li = document.createElement('li');
        const head = document.createElement('div');
        head.className = 'user';
        head.textContent = `${user} (${g.count})`;
        head.title = 'Kliknij, aby skopiować JSON tego usera';
        head.onclick = () => copy(JSON.stringify({ [user]: g }, null, 2), `JSON usera ${user}`, g.count);
        const files = document.createElement('div');
        files.className = 'meta';
        for (const img of g.images) {
          const a = document.createElement('a');
          a.href = img.url;
          a.target = '_blank';
          a.title = [img.url, img.expires && 'wygasa ' + img.expires.slice(0, 16).replace('T', ' ')]
            .filter(Boolean)
            .join('\n');
          a.textContent = img.file;
          files.append(a, ' ');
        }
        li.append(head, files);
        return li;
      })
  );
}

async function refresh(full) {
  const s = await send({ type: 'get' });
  const changed = full || s.items.length !== items.length;
  items = s.items;
  if (full) {
    $('enabled').checked = s.enabled;
    $('pattern').value = s.pattern;
  }
  if (changed) render();
}

async function copy(text, what, n = items.length) {
  try {
    await navigator.clipboard.writeText(text);
    status(`Skopiowano ${what} (${n}) do schowka.`);
  } catch (e) {
    status('Nie udało się skopiować: ' + e.message);
  }
}

$('copyJson').onclick = async () => {
  await refresh();
  copy(JSON.stringify(grouped(), null, 2), 'JSON per user');
};

$('copyFlat').onclick = async () => {
  await refresh();
  const flat = items.map((i) => ({
    user: userOf(i),
    file: fileOf(i),
    url: i.url,
    path: i.path,
    expires: i.expires,
    capturedAt: i.capturedAt,
    source: i.source,
    status: i.status,
    fromCache: i.fromCache,
    page: i.page,
  }));
  copy(JSON.stringify(flat, null, 2), 'płaski JSON');
};

$('copyUrls').onclick = async () => {
  await refresh();
  copy(items.map((i) => i.url).join('\n'), 'URL-e');
};

$('download').onclick = async () => {
  await refresh();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(grouped(), null, 2)], { type: 'application/json' }));
  a.download = `links-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  status(`Pobrano ${items.length} linków.`);
};

$('clear').onclick = async () => {
  if (!confirm(`Usunąć wszystkie ${items.length} zebrane linki?`)) return;
  await send({ type: 'clear' });
  await refresh();
  status('Wyczyszczono.');
};

$('enabled').onchange = async (e) => {
  await send({ type: 'setEnabled', enabled: e.target.checked });
  status(e.target.checked ? 'Zbieranie włączone.' : 'Zbieranie wstrzymane.');
};

$('savePattern').onclick = async () => {
  const r = await send({ type: 'setPattern', pattern: $('pattern').value });
  status(r.error ? 'Błędny regex: ' + r.error : 'Zapisano wzorzec.');
};

refresh(true);
setInterval(refresh, 1000);
