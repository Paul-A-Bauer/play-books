'use strict';
const fsp = require('fs/promises'), os = require('os'), path = require('path');
const { spawn } = require('child_process');
const { buildFiles, normalizeProject, estimatePages, TEMPLATES } = require('./core');

// XML 1.0 forbids most control characters; they would make pages unreadable, so strip them from every string.
const BAD_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const scrub = v => typeof v === 'string' ? v.replace(BAD_XML, '')
  : Array.isArray(v) ? v.map(scrub)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)])) : v;

class BuildError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Limits concurrent builds; extra requests wait in a bounded queue, then get 429.
class Limiter {
  constructor(max, maxQueue) { this.max = max; this.maxQueue = maxQueue; this.active = 0; this.queue = []; }
  async run(fn) {
    if (this.active >= this.max) {
      if (this.queue.length >= this.maxQueue) throw new BuildError(429, 'The server is busy. Try again shortly.');
      await new Promise(resolve => this.queue.push(resolve)); // slot is handed over, active stays the same
    } else this.active++;
    try { return await fn(); }
    finally { const next = this.queue.shift(); if (next) next(); else this.active--; }
  }
}

function runWorker(dir, cfg) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath,
      ['--max-old-space-size=' + cfg.workerMemoryMb, path.join(__dirname, 'worker.js'), dir],
      { stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: process.env.PATH, NODE_ENV: 'production' } });
    let err = '';
    child.stderr.on('data', d => { err = (err + d).slice(-2000); });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new BuildError(504, 'The build took longer than ' + Math.round(cfg.buildTimeoutMs / 1000) + 's. Simplify the game (fewer reachable states).'));
    }, cfg.buildTimeoutMs);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new BuildError(500, 'Storyteller failed: ' + (err.trim().split('\n').pop() || 'exit ' + code)));
    });
  });
}

async function buildEpub(raw, cfg) {
  let normalized;
  try { normalized = normalizeProject(scrub(raw)); }
  catch (e) { throw new BuildError(400, 'Invalid project: ' + e.message); }
  const { project, warnings } = normalized;
  if (project.levels.length > cfg.maxLevels) throw new BuildError(422, 'Too many levels (limit ' + cfg.maxLevels + ').');
  if (project.sprites.length > cfg.maxSprites) throw new BuildError(422, 'Too many sprites (limit ' + cfg.maxSprites + ').');
  // Pug templates can execute code, so untrusted input never chooses the template.
  if (!cfg.allowCustomTemplates) project.template = TEMPLATES.level;

  const est = estimatePages(project, cfg.maxPages + 1);
  if (est.n > cfg.maxPages) {
    throw new BuildError(422, 'This game needs more than ' + cfg.maxPages + ' pages (reachable states). Simplify it: fewer open tiles, fewer variable values.');
  }

  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'slb-'));
  try {
    const files = buildFiles(project, false);
    delete files['main.js'];
    for (const rel of Object.keys(files)) {
      const f = path.join(dir, rel);
      await fsp.mkdir(path.dirname(f), { recursive: true });
      await fsp.writeFile(f, files[rel]);
    }
    await runWorker(dir, cfg);
    return { epub: await fsp.readFile(path.join(dir, 'game.epub')), pages: est.n, warnings, title: project.title };
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

module.exports = { buildEpub, BuildError, Limiter };
