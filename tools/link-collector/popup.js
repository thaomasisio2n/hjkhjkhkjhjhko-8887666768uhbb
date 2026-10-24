const $ = (id) => document.getElementById(id);
const LIST_LIMIT = 100;

let items = [];

function send(msg) {
  return chrome.runtime.sendMessage(msg);
}

function status(text) {
  $('status').textContent = text;
}

function render() {
  $('count').textContent = items.length;
  const list = $('list');
  list.replaceChildren(
    ...items
      .slice(-LIST_LIMIT)
      .reverse()
      .map((i) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = i.url;
        a.target = '_blank';
        a.title = i.url;
        a.textContent = i.path;
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = [i.source, i.status, i.expires && 'wygasa ' + i.expires.slice(0, 16).replace('T', ' ')]
          .filter(Boolean)
          .join(' · ');
        li.append(a, meta);
        return li;
      })
  );
  list.start = items.length;
}

async function refresh(full) {
  const s = await send({ type: 'get' });
  items = s.items;
  if (full) {
    $('enabled').checked = s.enabled;
    $('pattern').value = s.pattern;
  }
  render();
}

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    status(`Skopiowano ${what} (${items.length}) do schowka.`);
  } catch (e) {
    status('Nie udało się skopiować: ' + e.message);
  }
}

$('copyJson').onclick = async () => {
  await refresh();
  copy(JSON.stringify(items, null, 2), 'JSON');
};

$('copyUrls').onclick = async () => {
  await refresh();
  copy(items.map((i) => i.url).join('\n'), 'URL-e');
};

$('download').onclick = async () => {
  await refresh();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }));
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
