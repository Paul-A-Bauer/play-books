// Level names are substituted into Pug text, so neutralise anything Pug would interpret (#{ }, !{ }, #[ ], \\).
function escPugText(s) {
  return String(s).replace(/\s+/g, ' ').replace(/[&<>"'#!\\]/g, c => '&#' + c.charCodeAt(0) + ';');
}

// Pure function: project -> { path: fileContents } for the Storyteller project / build kit.
// game.json is the whole project (template included) so it can be re-imported losslessly.
function buildFiles(P, kit) {
  const D = JSON.parse(JSON.stringify(P));
  const files = {
    'engine.js': 'module.exports = ' + Game.toString() + ';\n',
    'game.json': JSON.stringify(D, null, 2),
    'main.js': TEMPLATES.main
  };
  P.levels.forEach((l, i) => { files['templates/level' + i + '.pug'] = P.template.split('{{TITLE}}').join(escPugText(l.name)); });
  if (kit) { files['package.json'] = TEMPLATES.pkg; files['README.md'] = TEMPLATES.readme; }
  return files;
}
