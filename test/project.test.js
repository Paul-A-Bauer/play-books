const test = require('node:test');
const assert = require('node:assert');
const { demo, buildFiles, normalizeProject, TEMPLATES } = require('./load');
const clone = o => JSON.parse(JSON.stringify(o));

test('export -> import round-trips the project exactly', () => {
  const p = demo();
  const files = buildFiles(p, true);
  const { project, warnings } = normalizeProject(JSON.parse(files['game.json']));
  assert.deepStrictEqual(project, p);
  assert.deepStrictEqual(warnings, []);
});

test('old exports without a template get the default and a warning', () => {
  const raw = clone(demo()); delete raw.template;
  const { project, warnings } = normalizeProject(raw);
  assert.strictEqual(project.template, TEMPLATES.level);
  assert.ok(warnings.some(w => /template/i.test(w)));
});

test('old player glyphs migrate to an appearance-only player sprite', () => {
  const raw = clone(demo());
  raw.player = 'P';
  raw.sprites = raw.sprites.filter(s => s.id !== 'player');
  const { project, warnings } = normalizeProject(raw);
  assert.strictEqual(Object.hasOwn(project, 'player'), false);
  assert.strictEqual(project.sprites.find(s => s.id === 'player').glyph, 'P');
  assert.ok(warnings.some(w => /legacy player glyph/i.test(w)));
});

test('player sprite cannot have collision or rules', () => {
  const raw = clone(demo());
  const player = raw.sprites.find(s => s.id === 'player');
  player.solid = true; player.rules = 'on enter: win';
  const normalized = normalizeProject(raw).project.sprites.find(s => s.id === 'player');
  assert.strictEqual(normalized.solid, false);
  assert.strictEqual(normalized.rules, '');
});

test('player sprite cannot be used as a grid tile', () => {
  const raw = clone(demo());
  raw.levels[0].grid[1][2] = 'player';
  assert.strictEqual(normalizeProject(raw).project.levels[0].grid[1][2], 'floor');
});

test('unknown tiles become floor, duplicates and bad data are repaired', () => {
  const raw = clone(demo());
  raw.levels[0].grid[1][2] = 'nope';
  raw.levels.push({ ...clone(raw.levels[0]), start: { x: 99, y: -4 } });
  raw.sprites.push({ id: 'wall', glyph: 'x' }, { id: 'ok!', glyph: 'o', color: 'red' });
  raw.vars = { keys: '2', bad: 'x', 'no good': 1 };
  const { project, warnings } = normalizeProject(raw);
  assert.strictEqual(project.levels[0].grid[1][2], 'floor');
  const dup = project.levels[project.levels.length - 1];
  assert.strictEqual(dup.name, 'Maze (2)');
  assert.deepStrictEqual(dup.start, { x: 8, y: 0 });
  assert.ok(project.sprites.some(s => s.id === 'ok' && s.color === '#cccccc'));
  assert.strictEqual(project.sprites.filter(s => s.id === 'wall').length, 1);
  assert.deepStrictEqual(project.vars, { keys: 2 });
  assert.ok(warnings.length >= 4);
});

test('missing floor sprite is added', () => {
  const raw = clone(demo());
  raw.sprites = raw.sprites.filter(s => s.id !== 'floor');
  const { project } = normalizeProject(raw);
  assert.strictEqual(project.sprites[0].id, 'floor');
});

test('unusable input throws', () => {
  assert.throws(() => normalizeProject(null));
  assert.throws(() => normalizeProject({ levels: [] }));
  assert.throws(() => normalizeProject({ levels: [{ name: 'x', grid: [[]] }] }));
  assert.throws(() => normalizeProject({ levels: [{ name: 'x', grid: [['a']] }] }));
});
