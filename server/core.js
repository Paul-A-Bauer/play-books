'use strict';
// Loads the DOM-free core (engine, estimator, normalizer, exporter) exactly as the browser build does.
const fs = require('fs'), path = require('path');
const { CORE } = require('../scripts/sources');
const { generateTemplates } = require('../scripts/build');

const generated = path.join(__dirname, '..', 'src', 'generated', 'templates.js');
// In production the image is read-only and templates were generated at build time.
if (process.env.NODE_ENV !== 'production' || !fs.existsSync(generated)) generateTemplates();

const code = CORE.map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n') +
  '\nreturn { Game, mk, mkPlatformer, demo, buildFiles, normalizeProject, estimatePages, escPugText, TEMPLATES };';
module.exports = new Function(code)();
