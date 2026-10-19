// Game engine. Shared by the in-browser preview AND exported verbatim as engine.js
// (via Game.toString()), so it must stay self-contained: no outer references.
class Game{
static configure(d){Game.D=d}
// Start a game at level `lv`, optionally overriding variables (used by the preview).
static at(lv, vars) { const g = Object.create(Game.prototype); g.vars = Object.assign({}, Game.D.vars, vars); g.mods = {}; g.over = ''; g.msg = ''; g.start(lv); return g; }
constructor(){this.reset()}
reset(){this.vars=Object.assign({},Game.D.vars);this.mods={};this.over='';this.msg='';this.start(0)}
cfg(){return Game.D}
sprite(id){return Game.D.sprites.find(s=>s.id===id)||{}}
L(){return Game.D.levels[this.lv]}
tileAt(x,y){const L=this.L();if(x<0||y<0||x>=L.w||y>=L.h)return null;return this.mods[this.lv+':'+x+','+y]||L.grid[y][x]}
start(lv) {
  this.lv = lv;
  const L = this.L();
  this.x = L.start.x; this.y = L.start.y;
  this.run(L.rules, 'start', this.x, this.y, '');
  if (L.mode === 'platformer') this.fall(lv);
}
clone(){return Object.assign(Object.create(Game.prototype),JSON.parse(JSON.stringify(this)))}
alive(lv) { return this.lv === lv && !this.over; }
// Try to enter one cell. Returns true only if the player entered it and play may continue.
step(dx, dy) {
  const lv = this.lv, ox = this.x, oy = this.y, nx = ox + dx, ny = oy + dy, t = this.tileAt(nx, ny);
  if (!t || this.sprite(t).solid) return false;
  this.blocked = false; this.x = nx; this.y = ny;
  this.run(this.sprite(t).rules, 'enter', nx, ny, '');
  this.run(this.L().rules, 'enter', nx, ny, t);
  this.run(Game.D.rules, 'enter', nx, ny, t);
  const stay = this.blocked && this.lv === lv && this.x === nx && this.y === ny;
  if (stay) { this.x = ox; this.y = oy; }
  delete this.blocked;
  return !stay && this.alive(lv);
}
move(dx, dy) {
  if (this.over) return;
  this.msg = '';
  if (this.L().mode === 'platformer') return this.pmove(dx, dy);
  if (!dx !== !dy) this.step(dx, dy); // grid levels: one orthogonal step
}
// Platformer: walk (dx,0) or jump (dy<0, optional dx). Jump = rise jumpHeight, move jumpReach sideways, then fall.
pmove(dx, dy) {
  const L = this.L(), lv = this.lv;
  if (dy < 0) {
    if (!this.grounded()) return;
    const H = L.jumpHeight || 2, R = dx ? (L.jumpReach == null ? 2 : L.jumpReach) : 0;
    for (let i = 0; i < H && this.alive(lv); i++) if (!this.step(0, -1)) break;
    for (let i = 0; i < R && this.alive(lv); i++) if (!this.step(dx, 0)) break;
  } else if (dx && !dy) this.step(dx, 0);
  this.fall(lv);
}
grounded() { const t = this.tileAt(this.x, this.y + 1); return t !== null && !!this.sprite(t).solid; }
fall(lv) {
  let guard = Game.D.levels[lv].h + 1;
  while (this.alive(lv) && guard-- > 0) {
    const t = this.tileAt(this.x, this.y + 1);
    if (t === null) { this.over = 'lose'; this.msg = 'You fell!'; return; }
    if (this.sprite(t).solid || !this.step(0, 1)) return;
  }
}
// Moves that change the state from here (used for links and preview buttons).
actions() {
  if (this.over) return [];
  const p = this.L().mode === 'platformer';
  const all = p
    ? [['\u25C0 left', -1, 0], ['right \u25B6', 1, 0], ['\u25B2 jump', 0, -1], ['\u2196 jump left', -1, -1], ['jump right \u2197', 1, -1]]
    : [['\u25B2 up', 0, -1], ['\u25C0 left', -1, 0], ['right \u25B6', 1, 0], ['\u25BC down', 0, 1]];
  const before = JSON.stringify(this);
  return all.filter(a => { const g = this.clone(); g.move(a[1], a[2]); return JSON.stringify(g) !== before; })
    .map(a => ({ label: a[0], dx: a[1], dy: a[2] }));
}
next(dx,dy){const g=this.clone();g.move(dx,dy);return 'level'+g.lv}
run(t,ev,x,y,sid){for(const ln of (t||'').split('\n')){const m=ln.trim().match(/^on (\w+)(?:\s+(?!if\b)([^\s:]+))?(?:\s+if\s+([^:]+))?\s*:\s*(.*)$/);if(!m||m[1]!==ev)continue;if(m[2]&&m[2]!==sid&&m[2]!==x+','+y)continue;if(m[3]&&!m[3].split(/\s+and\s+/).every(c=>this.cond(c.trim())))continue;for(const a of m[4].split(';'))this.act(a.trim(),x,y)}}
cond(c){const m=c.match(/^(!?)(\w+)(?:\s*(==|!=|>=|<=|>|<)\s*(-?\d+))?$/);if(!m)return false;const v=this.vars[m[2]]||0,n=+m[4];let r=!!v;if(m[3])r=m[3]=='=='?v==n:m[3]=='!='?v!=n:m[3]=='>='?v>=n:m[3]=='<='?v<=n:m[3]=='>'?v>n:v<n;return m[1]?!r:r}
act(a,x,y){let m;if(m=a.match(/^set (\w+)\s*=\s*(-?\d+)$/))this.vars[m[1]]=+m[2];else if(m=a.match(/^add (\w+) (-?\d+)$/))this.vars[m[1]]=(this.vars[m[1]]||0)+ +m[2];else if(m=a.match(/^tile (\w+)$/)){const k=this.lv+':'+x+','+y;if(m[1]===this.L().grid[y][x])delete this.mods[k];else this.mods[k]=m[1]}else if(a==='block')this.blocked=true;else if(m=a.match(/^goto (.+)$/)){const i=Game.D.levels.findIndex(l=>l.name===m[1].trim());if(i>=0)this.start(i)}else if(a==='win'||a==='lose')this.over=a;else if(a==='next'){if(this.lv+1<Game.D.levels.length)this.start(this.lv+1);else this.over='win'}else if(m=a.match(/^say (.+)$/))this.msg=m[1].replace(/^"|"$/g,'')}
}
