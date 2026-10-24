// Exports the demo project and builds a real ePUB with Storyteller.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const JSZip = require('jszip');
const { demo, mkPlatformer, buildFiles } = require('./load');

function build(project, name) {
  const dir = path.join(__dirname, '..', '.tmp-e2e-' + name);
  fs.rmSync(dir, { recursive: true, force: true });
  const files = buildFiles(project, true);
  for (const p in files) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), files[p]);
  }
  execFileSync('node', ['main.js'], { cwd: dir, stdio: 'pipe' });
  const pages = fs.readdirSync(path.join(dir, 'out')).filter(f => f.endsWith('.html')).length;
  const epub = fs.existsSync(path.join(dir, 'game.epub'));
  const text = fs.readdirSync(path.join(dir, 'out')).filter(f => f.endsWith('.html')).map(f => fs.readFileSync(path.join(dir, 'out', f), 'utf8')).join('\n');
  const epubBuffer = fs.readFileSync(path.join(dir, 'game.epub'));
  const archive = JSZip.loadAsync(epubBuffer);
  fs.rmSync(dir, { recursive: true, force: true });
  return archive.then(async zip => {
    const pageFiles = Object.keys(zip.files).filter(p => /^OEBPS\/\d+\.html$/.test(p));
    const pageMarkup = await Promise.all(pageFiles.map(p => zip.file(p).async('string')));
    return {
      pages, epub, text, epubBuffer, pageMarkup,
      opf: await zip.file('OEBPS/content.opf').async('string'),
      page: await zip.file('OEBPS/0000.html').async('string'),
      nav: await zip.file('OEBPS/nav.xhtml').async('string')
    };
  });
}

test('demo project builds an ePUB with Storyteller', { timeout: 120000 }, async () => {
  const r = await build(demo(), 'grid');
  assert.ok(r.epub);
  assert.strictEqual(r.epubBuffer.toString('utf8', 0, 2), 'PK');
  assert.strictEqual(r.epubBuffer.readUInt16LE(8), 0, 'EPUB mimetype entry must be stored without compression');
  assert.strictEqual(r.epubBuffer.toString('utf8', 30, 38), 'mimetype', 'EPUB mimetype must be the first ZIP entry');
  assert.ok(r.pages > 10);
  for (const t of ['Maze', 'Platforms', 'Vault', 'YOU WIN']) assert.ok(r.text.includes(t), 'missing page text: ' + t);
  assert.match(r.text, /<pre>[^]*#@\.{6}#/);
  assert.ok(!r.text.includes('<table'), 'ASCII map should not depend on table rendering');
  assert.match(r.opf, /version="3\.0"/);
  assert.match(r.opf, /rendition:layout">pre-paginated/);
  assert.match(r.page, /name="viewport" content="width=600,height=800"/);
  assert.strictEqual(r.pageMarkup.length, r.pages);
  assert.ok(r.pageMarkup.every(page => /name="viewport" content="width=600,height=800"/.test(page)));
  assert.match(r.nav, /epub:type="toc"/);
  const map = r.page.match(/<pre>([\s\S]*?)<\/pre>/)[1].replace(/&gt;/g, '>').split('\n');
  assert.strictEqual(map.length, 7);
  assert.ok(map.every(row => row.length === 9 && /^[\x20-\x7e]+$/.test(row)));
  for (const label of ['Left', 'Right', 'Down', 'Jump', 'Jump left', 'Jump right']) {
    assert.ok(r.text.includes('>' + label + '</a>'), 'missing ASCII action: ' + label);
  }
  assert.ok(!/[←↑→↓↖↗🙂]/u.test(r.text), 'default export should use ASCII glyphs');
});

test('platformer project builds an ePUB with a bounded page count', { timeout: 120000 }, async () => {
  const d = demo(); d.levels = [mkPlatformer('Platform')];
  const r = await build(d, 'plat');
  assert.ok(r.epub);
  assert.ok(r.pages > 5 && r.pages < 200, 'pages: ' + r.pages);
});

test('grid action links target the state one cell in the labelled direction', { timeout: 120000 }, async () => {
  const d = demo();
  d.sprites = d.sprites.filter(s => s.id === 'player' || s.id === 'floor' || s.id === 'wall');
  d.levels = [{ name: 'Open', w: 5, h: 5, grid: Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => x === 0 || y === 0 || x === 4 || y === 4 ? 'wall' : 'floor')), start: { x: 2, y: 2 }, rules: '' }];
  const r = await build(d, 'links');
  const pages = new Map(r.pageMarkup.map((html, i) => [String(i).padStart(4, '0') + '.html', html]));
  const source = pages.get('0000.html');
  const origin = source.match(/<pre>([\s\S]*?)<\/pre>/)[1].split('\n');
  const sourceY = origin.findIndex(row => row.includes('@'));
  const sourceX = origin[sourceY].indexOf('@');
  const offsets = { Up: [0, -1], Left: [-1, 0], Right: [1, 0], Down: [0, 1] };
  const links = [...source.matchAll(/<a href="(\d{4}\.html)">(Up|Left|Right|Down)<\/a>/g)];
  assert.strictEqual(links.length, 4);
  for (const [, href, label] of links) {
    const destination = pages.get(href);
    assert.ok(destination, 'missing destination page ' + href);
    const rows = destination.match(/<pre>([\s\S]*?)<\/pre>/)[1].split('\n');
    const y = rows.findIndex(row => row.includes('@'));
    const x = rows[y].indexOf('@');
    assert.deepStrictEqual([x, y], [sourceX + offsets[label][0], sourceY + offsets[label][1]], label + ' points to the wrong state');
  }
});
