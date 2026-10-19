#!/usr/bin/env node
'use strict';
const { createApp } = require('./app');
const cfg = require('./config')();

const server = createApp(cfg);
server.listen(cfg.port, cfg.host, () => {
  console.log('Play Books listening on http://' + cfg.host + ':' + cfg.port +
    ' (max ' + cfg.maxPages + ' pages, custom templates ' + (cfg.allowCustomTemplates ? 'ON' : 'off') + ')');
});
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => process.exit(0)));
