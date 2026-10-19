// Concatenation order for the single-file build. Plain scripts sharing one global scope.
const CORE = [
  'src/generated/templates.js',
  'src/engine/game.js',
  'src/engine/estimate.js',
  'src/data/demo.js',
  'src/data/project.js',
  'src/export/exporter.js'
];
const UI = [
  'src/ui/rules-help.js',
  'src/ui/state.js',
  'src/ui/helpers.js',
  'src/ui/tabs/levels.js',
  'src/ui/tabs/sprites.js',
  'src/ui/tabs/global.js',
  'src/ui/tabs/rules.js',
  'src/ui/tabs/preview.js',
  'src/ui/tabs/export.js',
  'src/ui/app.js'
];
module.exports = { CORE, UI };
