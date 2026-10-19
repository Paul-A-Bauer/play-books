'use strict';
// Runs Storyteller for one exported project directory. Spawned per build so each build is isolated,
// memory-capped and killable. Usage: node worker.js <workdir>
const fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2] || '');
const Storyteller = require('@eit6609/storyteller');
const Game = require(path.join(dir, 'engine.js'));
const D = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8'));

const xml = s => String(s).replace(/]]>/g, ']] >'); // "]]>" is illegal in XML text
Game.configure(D);
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
process.chdir(dir);
console.log = () => {}; // Storyteller prints a per-page report; the server does not need it
new Storyteller({
  templatesDir: path.join(dir, 'templates'),
  outputDir: path.join(dir, 'out'),
  metadata: { title: xml(D.title || 'Game'), author: xml(D.author || 'Unknown'), filename: 'game.epub' },
  templateEngine: 'pug'
}).generate('level0', new Game())
  .then(() => process.exit(0))
  .catch(e => { console.error(String((e && e.message) || e)); process.exit(1); });
