// Plays the whole demo through its level transitions using only player moves.
const test = require('node:test');
const assert = require('node:assert');
const { Game, demo } = require('./load');

const L = [-1, 0], R = [1, 0], U = [0, -1], D = [0, 1], JR = [1, -1];
const play = (g, moves) => moves.forEach(m => g.move(...m));
const rep = (m, n) => Array(n).fill(m);

test('demo can be completed: Maze -> Platforms -> Vault -> win', () => {
  Game.configure(demo());
  const g = new Game();
  assert.strictEqual(g.L().name, 'Maze');

  // Maze: fetch the key, come back, walk the top corridor, open the door, take the exit.
  play(g, [...rep(D, 4), ...rep(U, 4), ...rep(R, 6), ...rep(D, 4)]);
  assert.strictEqual(g.L().name, 'Platforms');
  assert.strictEqual(g.vars.keys, 0); // the door used the maze key

  // Platforms: onto the small platform (picks up the key), onto the high ledge, to the exit.
  play(g, [R, R, JR]);
  assert.deepStrictEqual([g.x, g.y], [5, 4]);
  assert.strictEqual(g.vars.keys, 1);
  play(g, [JR, R, R]);
  assert.strictEqual(g.L().name, 'Vault');
  assert.strictEqual(g.vars.keys, 1); // carried over

  // Vault: the door consumes the carried key; the goal wins.
  play(g, rep(R, 6));
  assert.strictEqual(g.over, 'win');
  assert.strictEqual(g.vars.keys, 0);
});

test('the vault door stays locked without the key', () => {
  Game.configure(demo());
  const g = new Game();
  g.start(2);
  play(g, rep(R, 5));
  assert.deepStrictEqual([g.x, g.y], [3, 1]);
  assert.strictEqual(g.msg, 'Locked.');
  assert.strictEqual(g.over, '');
});
