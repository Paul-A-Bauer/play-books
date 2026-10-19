'use strict';
const path = require('path');
const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };

module.exports = function loadConfig(env = process.env) {
  return {
    host: env.HOST || '0.0.0.0',
    port: int(env.PORT, 8080),
    maxBodyBytes: int(env.MAX_BODY_MB, 20) * 1024 * 1024,
    maxPages: int(env.MAX_PAGES, 2000),
    maxLevels: int(env.MAX_LEVELS, 100),
    maxSprites: int(env.MAX_SPRITES, 300),
    buildTimeoutMs: int(env.BUILD_TIMEOUT_MS, 120000),
    maxConcurrent: int(env.MAX_CONCURRENT_BUILDS, 2),
    maxQueue: int(env.MAX_QUEUED_BUILDS, 8),
    workerMemoryMb: int(env.WORKER_MEMORY_MB, 768),
    // Pug templates can run arbitrary JavaScript. Only enable for a single trusted user.
    allowCustomTemplates: env.ALLOW_CUSTOM_TEMPLATES === '1',
    distDir: env.DIST_DIR || path.join(__dirname, '..', 'dist')
  };
};
