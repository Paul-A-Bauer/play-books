// Exports the demo project and builds a real ePUB with Storyteller.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
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
  fs.rmSync(dir, { recursive: true, force: true });
  return { pages, epub, text };
}

test('demo project builds an ePUB with Storyteller', { timeout: 120000 }, () => {
  const r = build(demo(), 'grid');
  assert.ok(r.epub);
  assert.ok(r.pages > 10);
  for (const t of ['Maze', 'Platforms', 'Vault', 'YOU WIN']) assert.ok(r.text.includes(t), 'missing page text: ' + t);
  assert.match(r.text, /<table[^>]*width="100%"/);
  assert.match(r.text, /<td[^>]*width="[\d.]+%"/);
  for (const label of ['Up', 'Left', 'Right', 'Down', 'Jump', 'Jump left', 'Jump right']) {
    assert.ok(r.text.includes('>' + label + '</a>'), 'missing ASCII action: ' + label);
  }
  assert.ok(!/[←↑→↓↖↗🙂]/u.test(r.text), 'default export should replace unsupported control and player glyphs');
});

test('platformer project builds an ePUB with a bounded page count', { timeout: 120000 }, () => {
  const d = demo(); d.levels = [mkPlatformer('Platform')];
  const r = build(d, 'plat');
  assert.ok(r.epub);
  assert.ok(r.pages > 5 && r.pages < 200, 'pages: ' + r.pages);
});
