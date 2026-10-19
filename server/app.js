'use strict';
const fs = require('fs'), http = require('http'), path = require('path');
const { buildEpub, BuildError, Limiter } = require('./build');
const pkg = require('../package.json');

const PAGE = 'storyteller-level-builder.html';
const CDN_JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

function jszipPath() {
  try { return require.resolve('jszip/dist/jszip.min.js'); } catch (e) { return null; }
}

function loadPage(cfg) {
  const file = path.join(cfg.distDir, PAGE);
  if (!fs.existsSync(file)) throw new Error('Missing ' + file + '. Run "npm run build" first.');
  let html = fs.readFileSync(file, 'utf8');
  if (jszipPath()) html = html.replace(CDN_JSZIP, '/vendor/jszip.min.js'); // works offline
  return html;
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const declared = parseInt(req.headers['content-length'] || '0', 10);
    if (declared > max) return reject(new BuildError(413, 'Project is too large (limit ' + Math.round(max / 1048576) + ' MB).'));
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > max) { reject(new BuildError(413, 'Project is too large (limit ' + Math.round(max / 1048576) + ' MB).')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createApp(cfg) {
  const limiter = new Limiter(cfg.maxConcurrent, cfg.maxQueue);
  const page = loadPage(cfg);
  const base = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  const send = (res, status, headers, body) => { res.writeHead(status, { ...base, ...headers }); res.end(body); };
  const json = (res, status, obj) => send(res, status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, JSON.stringify(obj));

  async function route(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const get = req.method === 'GET' || req.method === 'HEAD';
    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (!get) return json(res, 405, { error: 'Method not allowed' });
      return send(res, 200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP, 'Cache-Control': 'no-cache' }, page);
    }
    if (url.pathname === '/healthz') {
      return json(res, 200, { ok: true, app: 'storyteller-level-builder', version: pkg.version,
        limits: { maxPages: cfg.maxPages, maxLevels: cfg.maxLevels, maxBodyMb: Math.round(cfg.maxBodyBytes / 1048576) },
        customTemplates: cfg.allowCustomTemplates });
    }
    if (url.pathname === '/vendor/jszip.min.js' && get && jszipPath()) {
      return send(res, 200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }, fs.readFileSync(jszipPath()));
    }
    if (url.pathname === '/api/build') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });
      if (!/^application\/json/i.test(req.headers['content-type'] || '')) return json(res, 415, { error: 'Send the project as application/json' });
      const text = await readBody(req, cfg.maxBodyBytes);
      let raw;
      try { raw = JSON.parse(text); } catch (e) { return json(res, 400, { error: 'Body is not valid JSON' }); }
      const result = await limiter.run(() => buildEpub(raw, cfg));
      const name = (result.title || 'game').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) || 'game';
      return send(res, 200, {
        'Content-Type': 'application/epub+zip', 'Content-Disposition': 'attachment; filename="' + name + '.epub"',
        'Content-Length': result.epub.length, 'Cache-Control': 'no-store',
        'X-Pages': String(result.pages), 'X-Warnings': String(result.warnings.length)
      }, result.epub);
    }
    return json(res, 404, { error: 'Not found' });
  }

  return http.createServer(async (req, res) => {
    const t0 = Date.now();
    try { await route(req, res); }
    catch (e) {
      const status = e instanceof BuildError ? e.status : 500;
      if (status === 500) console.error('[error]', e && e.stack || e);
      if (!res.headersSent) json(res, status, { error: status === 500 && !(e instanceof BuildError) ? 'Internal error' : e.message });
      else res.end();
    }
    console.log(req.method + ' ' + req.url.split('?')[0] + ' ' + res.statusCode + ' ' + (Date.now() - t0) + 'ms');
  });
}

module.exports = { createApp };
