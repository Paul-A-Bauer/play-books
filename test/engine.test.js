const test = require('node:test');
const assert = require('node:assert');
const { Game, demo } = require('./load');

const fresh = (mutate) => {
  const d = demo();
  if (mutate) mutate(d);
  Game.configure(d);
  return new Game();
};
const walk = (g, moves) => moves.forEach(([dx, dy]) => g.move(dx, dy));

test('picking up a key adds to vars and restores the floor tile', () => {
  const g = fresh();
  walk(g, [[0, 1], [0, 1], [0, 1], [0, 1]]); // (1,1) -> (1,5) key
  assert.strictEqual(g.vars.keys, 1);
  assert.strictEqual(g.tileAt(1, 5), 'floor');
  assert.strictEqual(g.mods['0:1,5'], 'floor'); // override stored because base tile is 'key'
});

test('door blocks without a key and keeps the message', () => {
  const g = fresh();
  g.x = 7; g.y = 3;
  g.move(0, 1);
  assert.deepStrictEqual([g.x, g.y], [7, 3]);
  assert.strictEqual(g.msg, 'Locked.');
});

test('door opens with a key and consumes it', () => {
  const g = fresh();
  g.x = 7; g.y = 3; g.vars.keys = 1;
  g.move(0, 1);
  assert.deepStrictEqual([g.x, g.y], [7, 4]);
  assert.strictEqual(g.vars.keys, 0);
  assert.strictEqual(g.tileAt(7, 4), 'floor');
});

test('exit moves to the next level, keeps variables, and runs its start rules', () => {
  const g = fresh();
  g.vars.keys = 3;
  g.x = 7; g.y = 4;
  g.move(0, 1); // onto the exit at (7,5)
  assert.strictEqual(g.L().name, 'Platforms');
  assert.deepStrictEqual([g.x, g.y], [0, 6]); // start (0,6), on the ground
  assert.strictEqual(g.vars.keys, 3);
  assert.match(g.msg, /Jump the pit/);
  assert.strictEqual(g.over, '');
});

test('goal sets win and freezes the game', () => {
  const g = fresh();
  g.start(2); // Vault
  g.vars.keys = 1;
  for (let i = 0; i < 6; i++) g.move(1, 0);
  assert.strictEqual(g.over, 'win');
  g.move(-1, 0);
  assert.strictEqual(g.x, 7);
});

test('solid tiles block movement silently', () => {
  const g = fresh();
  g.move(-1, 0);
  assert.deepStrictEqual([g.x, g.y], [1, 1]);
  assert.strictEqual(g.msg, '');
});

test('goto switches level and runs the target start rules', () => {
  const g = fresh(d => {
    d.levels.push(JSON.parse(JSON.stringify(d.levels[0])));
    d.levels[3].name = 'Two';
    d.levels[3].rules = 'on start: say Welcome';
    d.levels[0].rules = 'on enter floor: goto Two';
  });
  g.move(0, 1);
  assert.strictEqual(g.lv, 3);
  assert.strictEqual(g.msg, 'Welcome');
  assert.strictEqual(g.next(0, 1), 'level3');
});

test('clone is independent and next() does not mutate', () => {
  const g = fresh();
  const c = g.clone();
  c.move(1, 0);
  assert.strictEqual(g.x, 1);
  assert.strictEqual(g.next(1, 0), 'level0');
  assert.strictEqual(g.x, 1);
});

test('level and global rules fire with targets and conditions', () => {
  const g = fresh(d => {
    d.rules = 'on enter: add steps 1';
    d.levels[0].rules = 'on enter 3,1 if steps >= 1: say Gated';
  });
  walk(g, [[1, 0], [1, 0]]); // (2,1) then (3,1)
  assert.strictEqual(g.msg, 'Gated'); // level rules run before global rules: steps was 1 here
  assert.strictEqual(g.vars.steps, 2);
});

test('next advances to the next level, keeps variables, and wins on the last level', () => {
  const g = fresh(d => { d.sprites.find(s => s.id === 'goal').rules = 'on enter: next'; });
  g.vars.keys = 2;
  g.act('next', 1, 1);
  assert.strictEqual(g.L().name, 'Platforms');
  assert.strictEqual(g.vars.keys, 2);
  g.act('next', 1, 1);
  assert.strictEqual(g.L().name, 'Vault');
  g.act('next', 1, 1);
  assert.strictEqual(g.over, 'win');
});

test('a plain two-level project advances through goal tiles with no goto rules', () => {
  const g = fresh(d => {
    const a = d.levels[0];
    a.grid[1][2] = 'goal'; a.rules = '';
    d.levels = [a, d.levels[2]]; // Maze, Vault
  });
  g.move(1, 0); g.move(1, 0); // (2,1) is the goal
  assert.strictEqual(g.L().name, 'Vault');
});

test('Game.at starts at a level with overridden variables and skips level 0 start rules', () => {
  Game.configure(demo());
  const g = Game.at(2, { keys: 1 });
  assert.strictEqual(g.L().name, 'Vault');
  assert.strictEqual(g.vars.keys, 1);
  assert.match(g.msg, /vault door/i);
  for (let i = 0; i < 6; i++) g.move(1, 0);
  assert.strictEqual(g.over, 'win');
});
