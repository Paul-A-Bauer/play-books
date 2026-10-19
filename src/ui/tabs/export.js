// Project tab: export, import, save JSON.
let prevProject = null, importMsg = '', serverInfo = null; // serverInfo: null = unknown, false = no build server

function vExport() {
  const fileIn = h('input', {
    type: 'file', accept: '.json,.zip,application/json,application/zip',
    on: { change(e) { const f = e.target.files[0]; if (f) importProject(f); } }
  });
  return h('div', {},
    h('h3', {}, 'Build ePUB'),
    serverInfo
      ? h('div', {}, h('p', { className: 'mut' }, 'Builds with Storyteller on the server (limit ' + serverInfo.limits.maxPages + ' pages).'),
          h('div', { className: 'row' }, h('button', { className: 'on', on: { click: buildOnServer } }, 'Build ePUB')),
          h('p', { className: 'lint', id: 'xb' }, ''))
      : h('p', { className: 'mut' }, 'No build server detected. Run the container (docker compose up) and open http://localhost:8080, or use the Storyteller project export below and build it yourself.'),
    h('h3', {}, 'Storyteller project (advanced)'),
    h('p', {}, 'Export a Storyteller project (engine, game.json, one Pug template per level), or a build kit that adds package.json so ', h('code', {}, 'npm install && npm run build'), ' produces the .epub.'),
    h('div', { className: 'row' }, h('button', { on: { click() { exp(0); } } }, 'Export project (.zip)'), h('button', { className: 'on', on: { click() { exp(1); } } }, 'Export build kit (.zip)')),
    h('p', { className: 'mut', id: 'xm' }, 'Storyteller runs on Node, so the .epub itself is built by that one command, not in the browser.'),
    h('h3', {}, 'Import / save'),
    h('p', { className: 'mut' }, 'Open a game.json, a saved project JSON, or a project/build-kit zip exported from this tool. The current project is replaced (you can undo).'),
    h('div', { className: 'row' }, fileIn, prevProject ? h('button', { on: { click: undoImport } }, 'Undo import') : ''),
    h('div', { className: 'row' }, h('button', { on: { click: saveJson } }, 'Save project JSON'), h('button', { on: { click: loadExample } }, 'Load example project')),
    h('div', { className: 'lint', id: 'xi' }, importMsg));
}

async function saveBlob(filename, blob) {
  // Inside claude.ai the host mediates downloads; elsewhere use a plain anchor.
  const dl = window.claude ? await claude.use('downloads') : null;
  if (dl) return dl.save({ filename, data: blob });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
}
const fileBase = () => (P.title || 'game').replace(/\W+/g, '-');

async function exp(kit) {
  const out = $('#xm');
  try {
    const z = new JSZip(), files = buildFiles(P, kit);
    for (const p in files) z.file(p, files[p]);
    await saveBlob(fileBase() + (kit ? '-buildkit' : '-project') + '.zip', await z.generateAsync({ type: 'blob' }));
    out.textContent = 'Saved.';
  } catch (e) {
    out.textContent = e && e.code === 'declined' ? 'Cancelled.' : 'Export failed: ' + ((e && e.message) || e);
  }
}

async function saveJson() {
  try { await saveBlob(fileBase() + '.json', new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' })); }
  catch (e) { if (!(e && e.code === 'declined')) { importMsg = 'Save failed: ' + ((e && e.message) || e); render(); } }
}

async function readProjectFile(file) {
  if (/\.zip$/i.test(file.name)) {
    const z = await JSZip.loadAsync(file);
    const entry = z.file(/(^|\/)game\.json$/)[0];
    if (!entry) throw new Error('No game.json found in the zip');
    return JSON.parse(await entry.async('string'));
  }
  return JSON.parse(await file.text());
}

async function importProject(file) {
  try {
    const { project, warnings } = normalizeProject(await readProjectFile(file));
    prevProject = P; P = project; cur = 0; tool = 'floor';
    importMsg = 'Imported "' + P.title + '" (' + P.levels.length + ' level' + (P.levels.length > 1 ? 's' : '') + ', ' + P.sprites.length + ' sprites).' + (warnings.length ? '\n' + warnings.map(w => '! ' + w).join('\n') : '');
  } catch (e) {
    importMsg = 'Import failed: ' + ((e && e.message) || e) + '. Nothing was changed.';
  }
  render();
}

function undoImport() {
  if (!prevProject) return;
  P = prevProject; prevProject = null; cur = 0; tool = 'floor';
  importMsg = 'Import undone.';
  render();
}

function loadExample() {
  prevProject = P; P = demo(); cur = 0; tool = 'floor';
  importMsg = 'Loaded the example project (you can undo).';
  render();
}

async function probeServer() {
  try {
    const r = await fetch('/healthz', { cache: 'no-store' });
    const j = r.ok ? await r.json() : null;
    serverInfo = j && j.app === 'play-books' ? j : false;
  } catch (e) { serverInfo = false; }
  if (tab === 'export') render();
}

async function buildOnServer() {
  const out = $('#xb');
  try {
    const max = serverInfo.limits.maxPages, est = estimatePages(P, max + 1);
    if (est.n > max) { out.textContent = 'Too many pages (over ' + max + ') for this server. Simplify the game; see the page estimate in Preview.'; return; }
    out.textContent = 'Building ' + est.n + ' pages...';
    const r = await fetch('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(P) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'HTTP ' + r.status); }
    await saveBlob(fileBase() + '.epub', await r.blob());
    out.textContent = 'Done: ' + est.n + ' pages.';
  } catch (e) { out.textContent = 'Build failed: ' + ((e && e.message) || e); }
}
