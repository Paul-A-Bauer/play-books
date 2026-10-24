// Validates and normalizes a project object read from disk (game.json / saved JSON).
// Returns { project, warnings }. Throws Error when the file cannot be a project at all.
function normalizeProject(raw) {
  const warnings = [];
  const fallbackGlyph = id => ({ player: '@', floor: '.', wall: '#', key: 'k', door: 'D', exit: '>', goal: '*' }[id] || (id.match(/[A-Za-z0-9]/) || ['?'])[0]);
  if (!raw || typeof raw !== 'object') throw new Error('Not a project object');
  if (!Array.isArray(raw.levels) || !raw.levels.length) throw new Error('Project has no levels');

  const P = {
    title: String(raw.title || 'Untitled'),
    author: String(raw.author || ''),
    vars: {},
    rules: String(raw.rules || ''),
    template: typeof raw.template === 'string' && raw.template.trim() ? raw.template : TEMPLATES.level,
    sprites: [],
    levels: []
  };
  if (P.template === TEMPLATES.level && !(typeof raw.template === 'string' && raw.template.trim())) {
    warnings.push('No template in file; used the default level template.');
  }

  for (const k in (raw.vars || {})) {
    const n = Number(raw.vars[k]);
    if (/^\w+$/.test(k) && Number.isFinite(n)) P.vars[k] = Math.trunc(n);
    else warnings.push('Dropped invalid variable "' + k + '".');
  }

  const ids = new Set();
  for (const s of (Array.isArray(raw.sprites) ? raw.sprites : [])) {
    const id = String((s && s.id) || '').replace(/\W/g, '');
    if (!id || ids.has(id)) { warnings.push('Skipped a sprite with a missing or duplicate id.'); continue; }
    ids.add(id);
    const glyph = String(s.glyph || '');
    const o = {
      id,
      glyph: /^[\x20-\x7e]$/.test(glyph) ? glyph : fallbackGlyph(id),
      color: /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : '#cccccc',
      solid: id === 'player' ? false : !!s.solid,
      rules: id === 'player' ? '' : String(s.rules || '')
    };
    if (typeof s.img === 'string' && s.img.startsWith('data:image/')) o.img = s.img;
    P.sprites.push(o);
  }
  if (!ids.has('player')) {
    P.sprites.unshift({ id: 'player', glyph: /^[\x20-\x7e]$/.test(String(raw.player || '')) ? String(raw.player) : '@', color: '#e8e2d0', solid: false, rules: '' });
    ids.add('player');
    if (raw.player != null) warnings.push('Moved the legacy player glyph into the "player" sprite.');
  }
  if (!ids.has('floor')) {
    P.sprites.unshift({ id: 'floor', glyph: '.', color: '#e8e2d0', solid: false, rules: '' });
    ids.add('floor');
    warnings.push('Added the missing "floor" sprite.');
  }

  const names = new Set();
  let unknownTiles = 0, raggedRows = false;
  raw.levels.forEach((l, i) => {
    if (!l || !Array.isArray(l.grid) || !Array.isArray(l.grid[0])) throw new Error('Level ' + (i + 1) + ' has no grid');
    const h = l.grid.length, w = l.grid[0].length;
    if (w < 2 || h < 2 || w > 30 || h > 30) throw new Error('Level ' + (i + 1) + ' must be between 2x2 and 30x30');
    const grid = l.grid.map(row => {
      if (!Array.isArray(row) || row.length !== w) raggedRows = true;
      return Array.from({ length: w }, (_, x) => {
        const id = Array.isArray(row) ? row[x] : undefined;
        if (ids.has(id) && id !== 'player') return id;
        unknownTiles++;
        return 'floor';
      });
    });
    let name = String(l.name || 'Level ' + (i + 1));
    if (names.has(name)) { const base = name; let n = 2; while (names.has(base + ' (' + n + ')')) n++; name = base + ' (' + n + ')'; warnings.push('Renamed duplicate level "' + base + '" to "' + name + '".'); }
    names.add(name);
    const st = l.start || {};
    const clamp = (v, max) => Math.max(0, Math.min(max, Math.trunc(Number(v)) || 0));
    const lvl = { name, w, h, grid, start: { x: clamp(st.x, w - 1), y: clamp(st.y, h - 1) }, rules: String(l.rules || '') };
    if (l.mode === 'platformer') {
      const num = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isNaN(n) ? d : Math.max(lo, Math.min(hi, n)); };
      lvl.mode = 'platformer';
      lvl.jumpHeight = num(l.jumpHeight, 1, 6, 2);
      lvl.jumpReach = num(l.jumpReach, 0, 6, 2);
    }
    P.levels.push(lvl);
  });
  if (unknownTiles) warnings.push(unknownTiles + ' tile(s) used unknown sprites and became "floor".');
  if (raggedRows) warnings.push('Some grid rows had the wrong length and were padded.');
  return { project: P, warnings };
}
