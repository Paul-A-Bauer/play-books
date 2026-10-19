const fs = require('fs');
const Storyteller = require('@eit6609/storyteller');
const Game = require('./engine');
const D = require('./game.json');
Game.configure(D);
fs.mkdirSync('out', { recursive: true });
const storyteller = new Storyteller({
    templatesDir: 'templates',
    outputDir: 'out',
    metadata: { title: D.title || 'Game', author: D.author || 'Unknown', filename: 'game.epub' },
    templateEngine: 'pug'
});
storyteller.generate('level0', new Game()).then(() => console.log('Done: game.epub'));
