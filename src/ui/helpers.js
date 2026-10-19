// ---------- UI helpers ----------
const $=s=>document.querySelector(s);
function h(t,a={},...c){const e=document.createElement(t);for(const k in a){const v=a[k];if(k==='on')for(const n in v)e.addEventListener(n,v[n]);else if(k==='style')e.setAttribute(k,v);else if(k in e)e[k]=v;else e.setAttribute(k,v)}e.append(...c);return e}
const lab=(l,el)=>h('label',{className:'f'},l,el);
const bind=(o,k,rows)=>h('textarea',{rows,value:o[k]||'',on:{input(e){o[k]=e.target.value;save()}}});
function cellEl(id,pl){const s=sp(id);const c=h('div',{className:'c',style:'background:'+(s.color||'#ccc')});if(pl)c.textContent=P.player;else if(s.img)c.append(h('img',{src:s.img,alt:''}));else c.textContent=s.glyph||'';return c}
function gridEl(w,hh,get,px,py,cb){const g=h('div',{className:'grid',style:'--w:'+w+';grid-template-columns:repeat('+w+',1fr)'});for(let y=0;y<hh;y++)for(let x=0;x<w;x++){const c=cellEl(get(x,y),x===px&&y===py);c.dataset.x=x;c.dataset.y=y;g.append(c)}
if(cb){let dn=0;const hit=e=>{const t=document.elementFromPoint(e.clientX,e.clientY),c=t&&t.closest('.c');if(!c||!g.contains(c))return;const x=+c.dataset.x,y=+c.dataset.y;cb(x,y);if(document.body.contains(g)&&g.contains(c)){const n=cellEl(get(x,y),x===px&&y===py);n.dataset.x=x;n.dataset.y=y;c.replaceWith(n)}};g.addEventListener('pointerdown',e=>{dn=1;hit(e)});g.addEventListener('pointermove',e=>{if(dn)hit(e)});addEventListener('pointerup',()=>dn=0)}return g}
function resize(L,k,v){const o=L.grid,w=k==='w'?v:L.w,hh=k==='h'?v:L.h;L.grid=Array.from({length:hh},(_,y)=>Array.from({length:w},(_,x)=>(o[y]&&o[y][x])||'floor'));L.w=w;L.h=hh;L.start.x=Math.min(L.start.x,w-1);L.start.y=Math.min(L.start.y,hh-1)}
