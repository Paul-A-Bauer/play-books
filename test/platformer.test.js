const test = require('node:test');
const assert = require('node:assert');
const { Game, demo, mkPlatformer, normalizeProject } = require('./load');

const setup = (mutate) => {
  const d = demo();
  d.levels = [mkPlatformer('P')];
  if (mutate) mutate(d);
  Game.configure(d);
  return new Game();
};
const at = (g) => [g.x, g.y];

test('player falls to the ground when the level starts in the air', () => {
  const g = setup(d => { d.levels[0].start = { x: 0, y: 0 }; });
  assert.deepStrictEqual(at(g), [0, 6]);
});

test('walking moves one cell; walking off a ledge falls', () => {
  const g = setup();
  g.move(1, 0);
  assert.deepStrictEqual(at(g), [1, 6]);
  g.x = 4; g.y = 4; // standing on the small platform's left end
  g.move(-1, 0);
  assert.deepStrictEqual(at(g), [3, 6]); // stepped off and fell to the ground
});

test('jump-right from (2,6) lands on the small platform, then the high ledge, then wins', () => {
  const g = setup();
  g.x = 2; g.y = 6;
  g.move(1, -1);
  assert.deepStrictEqual(at(g), [5, 4]);
  g.move(1, -1);
  assert.deepStrictEqual(at(g), [8, 2]);
  g.move(1, 0); g.move(1, 0);
  assert.strictEqual(g.over, 'win');
});

test('a ceiling stops the rise but the sideways part of the jump still happens', () => {
  const g = setup();
  g.x = 4; g.y = 6; // platform directly above
  g.move(0, -1);
  assert.deepStrictEqual(at(g), [4, 6]); // straight jump is blocked: no change
  g.move(1, -1);
  assert.deepStrictEqual(at(g), [7, 6]);
});

test('falling into the pit loses', () => {
  const g = setup();
  g.x = 5; g.y = 6;
  g.move(1, 0);
  assert.strictEqual(g.over, 'lose');
  assert.strictEqual(g.msg, 'You fell!');
});

test('rules fire on every cell crossed while jumping', () => {
  const g = setup(d => { d.levels[0].grid[5][0] = 'key'; });
  g.move(0, -1); // rise through (0,5), then fall back to (0,6)
  assert.deepStrictEqual(at(g), [0, 6]);
  assert.strictEqual(g.vars.keys, 1);
  assert.strictEqual(g.msg, 'Got a key!');
});

test('actions() lists only moves that change the state', () => {
  const g = setup();
  assert.deepStrictEqual(g.actions().map(a => [a.dx, a.dy]), [[1, 0], [1, -1]]); // left edge, straight jump is a no-op
  g.x = 2;
  assert.strictEqual(g.actions().length, 4);
  g.over = 'win';
  assert.deepStrictEqual(g.actions(), []);
});

test('grid levels reject diagonal moves and list orthogonal actions', () => {
  Game.configure(demo());
  const g = new Game();
  g.move(1, 1);
  assert.deepStrictEqual(at(g), [1, 1]);
  assert.deepStrictEqual(g.actions().map(a => [a.dx, a.dy]), [[1, 0], [0, 1]]);
});

test('platformer settings survive import normalization', () => {
  const d = demo(); d.levels = [mkPlatformer('P')]; d.levels[0].jumpReach = 0;
  const { project } = normalizeProject(JSON.parse(JSON.stringify(d)));
  assert.strictEqual(project.levels[0].mode, 'platformer');
  assert.strictEqual(project.levels[0].jumpReach, 0);
  const bad = JSON.parse(JSON.stringify(d)); bad.levels[0].jumpHeight = 99;
  assert.strictEqual(normalizeProject(bad).project.levels[0].jumpHeight, 6);
});
