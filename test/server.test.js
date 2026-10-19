const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const JSZip = require('jszip');
const { demo, estimatePages } = require('./load');
const loadConfig = require('../server/config');
const { createApp } = require('../server/app');

async function withServer(overrides, fn) {
  const server = createApp({ ...loadConfig({}), ...overrides });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try { await fn(base); } finally { await new Promise(r => server.close(r)); }
}
const post = (base, body, headers = { 'Content-Type': 'application/json' }) =>
  fetch(base + '/api/build', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
const marker = name => path.join(os.tmpdir(), 'slb-pwned-' + process.pid + '-' + name);

test('serves the page, healthz and the local JSZip copy', () => withServer({}, async base => {
  const page = await (await fetch(base + '/')).text();
  assert.match(page, /Storyteller Level Builder/);
  assert.ok(page.includes('/vendor/jszip.min.js'), 'CDN script is rewritten to the local copy');
  const hz = await (await fetch(base + '/healthz')).json();
  assert.strictEqual(hz.app, 'storyteller-level-builder');
  assert.strictEqual(hz.limits.maxPages, 2000);
  assert.strictEqual((await fetch(base + '/vendor/jszip.min.js')).status, 200);
  assert.strictEqual((await fetch(base + '/nope')).status, 404);
}));

test('POST /api/build returns a valid ePUB with one page per reachable state', { timeout: 120000 }, () => withServer({}, async base => {
  const r = await post(base, demo());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('content-type'), 'application/epub+zip');
  const zip = await JSZip.loadAsync(Buffer.from(await r.arrayBuffer()));
  assert.strictEqual(Object.keys(zip.files)[0], 'mimetype');
  assert.strictEqual(await zip.file('mimetype').async('string'), 'application/epub+zip');
  const pages = Object.keys(zip.files).filter(f => /OEBPS\/\d{4}\.html$/.test(f)).length;
  assert.strictEqual(pages, estimatePages(demo()).n);
  assert.strictEqual(r.headers.get('x-pages'), String(pages));
  const text = (await Promise.all(Object.keys(zip.files).filter(f => f.endsWith('.html')).map(f => zip.file(f).async('string')))).join('\n');
  for (const t of ['Maze', 'Platforms', 'Vault', 'YOU WIN']) assert.ok(text.includes(t), t);
}));

test('rejects bad input with clear statuses', () => withServer({ maxBodyBytes: 2000 }, async base => {
  assert.strictEqual((await post(base, '{not json')).status, 400);
  assert.strictEqual((await post(base, { levels: [] })).status, 400);
  assert.strictEqual((await post(base, '{}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.strictEqual((await fetch(base + '/api/build')).status, 405);
  assert.strictEqual((await post(base, demo())).status, 413); // demo is larger than 2000 bytes
}));

test('refuses games that exceed the page limit', () => withServer({ maxPages: 50 }, async base => {
  const r = await post(base, demo());
  assert.strictEqual(r.status, 422);
  assert.match((await r.json()).error, /more than 50 pages/);
}));

test('a malicious Pug template is ignored by default', { timeout: 120000 }, () => withServer({}, async base => {
  const m = marker('template');
  const p = demo();
  p.template = "doctype 1.1\nhtml\n  body\n    - require('fs').writeFileSync(" + JSON.stringify(m) + ", 'x')\n";
  const r = await post(base, p);
  assert.strictEqual(r.status, 200);
  assert.ok(!fs.existsSync(m), 'template code must not run');
}));

test('a level name cannot inject Pug code even when custom templates are allowed', { timeout: 120000 }, () => withServer({ allowCustomTemplates: true }, async base => {
  const m = marker('levelname');
  const p = demo();
  p.levels[0].name = "#{require('fs').writeFileSync(" + JSON.stringify(m) + ", 'x')}";
  const r = await post(base, p);
  assert.strictEqual(r.status, 200);
  assert.ok(!fs.existsSync(m), 'level name must not run code');
  const zip = await JSZip.loadAsync(Buffer.from(await r.arrayBuffer()));
  const first = await zip.file('OEBPS/0000.html').async('string');
  assert.ok(first.includes('require('), 'name is shown as literal text');
}));

test('special characters in the title and glyphs produce well-formed output', { timeout: 120000 }, () => withServer({}, async base => {
  const p = demo();
  p.title = 'A & <B> "C" ]]> \u0001x'; p.player = '<&>';
  const r = await post(base, p);
  assert.strictEqual(r.status, 200);
  const zip = await JSZip.loadAsync(Buffer.from(await r.arrayBuffer()));
  const opf = await zip.file('OEBPS/content.opf').async('string');
  assert.ok(!opf.includes('<B') && !opf.includes('\u0001') && !opf.includes(']]>'), 'title must be well-formed XML text');
  assert.ok(opf.includes('A &amp; &lt;B'));
  assert.ok((await zip.file('OEBPS/0000.html').async('string')).includes('&lt;&amp;&gt;'));
}));

test('extra concurrent builds beyond the queue get 429', { timeout: 120000 }, () => withServer({ maxConcurrent: 1, maxQueue: 0 }, async base => {
  const rs = await Promise.all([post(base, demo()), post(base, demo())]);
  assert.deepStrictEqual(rs.map(r => r.status).sort(), [200, 429]);
}));
