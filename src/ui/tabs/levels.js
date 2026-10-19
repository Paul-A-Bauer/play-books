// Levels tab: tile painter.
function vLevels(){const L=P.levels[cur];
const num=k=>h('input',{type:'number',min:2,max:30,value:L[k],style:'width:60px',on:{change(e){resize(L,k,Math.max(2,Math.min(30,+e.target.value||L[k])));render()}}});
const pbtn=id=>h('button',{className:'pb'+(tool===id?' on':''),title:id,on:{click(){tool=id;render()}}},id==='@'?cellEl('floor',true):cellEl(id));
return h('div',{},
h('div',{className:'row'},h('select',{on:{change(e){cur=+e.target.value;render()}}},...P.levels.map((l,i)=>h('option',{value:i,selected:i===cur},l.name))),
h('button',{on:{click(){addLevel('grid')}}},'+ Level'),h('button',{on:{click(){addLevel('platformer')}}},'+ Platformer'),
h('button',{disabled:P.levels.length<2,on:{click(){P.levels.splice(cur,1);cur=0;render()}}},'Delete')),
h('div',{className:'row'},h('input',{value:L.name,style:'width:130px',on:{input(e){L.name=e.target.value.trim()||L.name;save()}}}),'W',num('w'),'H',num('h')),
modeRow(L),
h('div',{className:'pal'},...P.sprites.map(s=>pbtn(s.id)),pbtn('@')),
gridEl(L.w,L.h,(x,y)=>L.grid[y][x],L.start.x,L.start.y,(x,y)=>{if(tool==='@'){L.start={x,y};render()}else{L.grid[y][x]=tool;save()}}),
h('p',{className:'mut'},'Tap or drag to paint. The face tile sets the player start. Brush: '+tool+(L.mode==='platformer'?'. Platformer: the player falls until standing on a solid tile; falling off the bottom loses.':'')))}

function modeRow(L) {
  const plat = L.mode === 'platformer';
  const n = (k, lo, hi, def) => h('input', { type: 'number', min: lo, max: hi, value: L[k] == null ? def : L[k], style: 'width:56px',
    on: { change(e) { const v = parseInt(e.target.value, 10); L[k] = Number.isNaN(v) ? def : Math.max(lo, Math.min(hi, v)); save(); } } });
  return h('div', { className: 'row' }, 'Mode',
    h('select', { on: { change(e) { setMode(L, e.target.value); render(); } } },
      h('option', { value: 'grid', selected: !plat }, 'Grid (4-way)'), h('option', { value: 'platformer', selected: plat }, 'Platformer')),
    ...(plat ? ['Jump height', n('jumpHeight', 1, 6, 2), 'reach', n('jumpReach', 0, 6, 2)] : []));
}
function setMode(L, m) {
  if (m === 'platformer') { L.mode = 'platformer'; L.jumpHeight = L.jumpHeight || 2; L.jumpReach = L.jumpReach == null ? 2 : L.jumpReach; }
  else { delete L.mode; delete L.jumpHeight; delete L.jumpReach; }
}
function ensureSprite(id) { if (!sp(id).id) { const d = demo().sprites.find(s => s.id === id); if (d) P.sprites.push(d); } }
function addLevel(kind) {
  const name = 'Level ' + (P.levels.length + 1);
  P.levels.push(kind === 'platformer' ? mkPlatformer(name) : mk(name, 9, 7));
  if (kind === 'platformer') ['wall', 'goal'].forEach(ensureSprite);
  cur = P.levels.length - 1; render();
}
