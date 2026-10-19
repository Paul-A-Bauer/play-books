// Preview tab: playable simulator + state-count estimate.
function est() { return estimatePages(P); }

const PAD_ICON = { '0,-1': '\u25B2', '0,1': '\u25BC', '-1,0': '\u25C0', '1,0': '\u25B6', '-1,-1': '\u2196', '1,-1': '\u2197' };
let pvStart = null, pvVars = '';
const parseVars = t => { const o = {}; (t || '').replace(/(\w+)\s*=\s*(-?\d+)/g, (_, k, v) => { o[k] = +v; }); return o; };
const pvNew = () => { Game.configure(P); return Game.at(Math.min(pvStart, P.levels.length - 1), parseVars(pvVars)); };

function vPreview() {
  if (pvStart == null || pvStart >= P.levels.length) pvStart = cur; // preview the level being edited
  G = pvNew();
  const box = h('div', {}), info = h('p', { className: 'mut' });
  const mv = (dx, dy) => { G.move(dx, dy); draw(); };
  const pad = () => {
    const plat = G.L().mode === 'platformer';
    const layout = plat ? [[-1, -1], [0, -1], [1, -1], [-1, 0], null, [1, 0]] : [null, [0, -1], null, [-1, 0], null, [1, 0], null, [0, 1], null];
    const ok = new Set(G.actions().map(a => a.dx + ',' + a.dy));
    return h('div', { className: 'dpad' }, ...layout.map(d => d
      ? h('button', { disabled: !ok.has(d.join(',')), on: { click() { mv(d[0], d[1]); } } }, PAD_ICON[d.join(',')])
      : h('span')));
  };
  draw = () => {
    const L = G.L(), last = G.lv >= P.levels.length - 1;
    const hint = G.over === 'win' && !last ? '`win` ends the whole game. Use `next` (Sprites tab: "win \u2192 next") or `goto` to continue to the next level.' : '';
    box.replaceChildren(
      h('div', { className: 'row' }, 'Start at',
        h('select', { on: { change(e) { pvStart = +e.target.value; G = pvNew(); draw(); } } }, ...P.levels.map((l, i) => h('option', { value: i, selected: i === pvStart }, (i + 1) + '. ' + l.name))),
        'vars', h('input', { value: pvVars, placeholder: 'keys=1', style: 'width:110px', on: { change(e) { pvVars = e.target.value; G = pvNew(); draw(); } } })),
      h('div', { className: 'row' }, h('b', {}, (G.lv + 1) + '/' + P.levels.length + ' ' + L.name), h('span', { className: 'mut' }, JSON.stringify(G.vars))),
      gridEl(L.w, L.h, (x, y) => G.tileAt(x, y), G.x, G.y),
      h('p', { className: 'msg' }, G.over ? 'YOU ' + G.over.toUpperCase() : G.msg || '\u00a0'),
      h('p', { className: 'mut' }, hint),
      pad(),
      h('div', { className: 'row' },
        h('button', { on: { click() { G = pvNew(); draw(); } } }, 'Restart'),
        h('button', { disabled: last, on: { click() { G = Game.at(G.lv + 1, G.vars); draw(); } } }, 'Next level \u23ED')));
  };
  draw();
  return h('div', {}, box,
    h('div', { className: 'row' }, h('button', { on: { click() { const r = est(); info.textContent = r.n + (r.full ? '' : '+') + ' pages would be generated (whole game)' + (r.full ? '.' : ' \u2014 state explosion risk; simplify rules or shrink levels.'); } } }, 'Estimate page count')),
    info, h('p', { className: 'mut' }, 'Starts at the level you were editing. "Next level" skips ahead keeping variables. Keys: arrows; in platformer levels Up = jump, Q / E = jump left / right.'));
}
