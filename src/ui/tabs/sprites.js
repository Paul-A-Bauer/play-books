// Sprites tab: glyph/image/color/solid + per-sprite rules.
function vSprites(){const nid=h('input',{placeholder:'new sprite id',style:'width:140px'});
return h('div',{},...P.sprites.map(s=>h('div',{className:'card'},
h('div',{className:'row'},h('b',{},s.id),h('div',{style:'width:30px'},cellEl(s.id,s.id==='player')),
h('input',{value:s.glyph,size:1,maxLength:1,placeholder:'glyph',on:{input(e){s.glyph=e.target.value ? e.target.value.slice(0,1) : (s.id==='floor'?'.':(s.id.match(/[A-Za-z0-9]/)||['?'])[0]);e.target.value=s.glyph;save()}}}),
h('input',{type:'color',value:s.color,on:{input(e){s.color=e.target.value;save()}}}),
s.id==='player'?'':h('label',{},h('input',{type:'checkbox',checked:!!s.solid,on:{change(e){s.solid=e.target.checked;save()}}}),' solid')),
h('div',{className:'row'},h('input',{type:'file',accept:'image/*',on:{change(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{s.img=r.result;render()};r.readAsDataURL(f)}}}),
s.img?h('button',{on:{click(){delete s.img;render()}}},'Clear image'):'',
s.id==='player'?'':fixWin(s),s.id==='floor'||s.id==='player'?'':h('button',{on:{click(){P.levels.forEach(l=>l.grid=l.grid.map(r=>r.map(t=>t===s.id?'floor':t)));P.sprites=P.sprites.filter(x=>x!==s);if(tool===s.id)tool='floor';render()}}},'Delete')),
s.id==='player'?'':h('textarea',{rows:3,placeholder:'Sprite rules, e.g. on enter: add keys 1; tile floor',value:s.rules||'',on:{input(e){s.rules=e.target.value;save()}}}))),
h('div',{className:'row'},nid,h('button',{on:{click(){const id=nid.value.trim().replace(/\W/g,'');if(!id||sp(id).id)return;P.sprites.push({id,glyph:(id.match(/[A-Za-z0-9]/)||['?'])[0],color:'#cccccc',solid:false,rules:''});render()}}},'+ Sprite')))}

const WIN_RE = /(:|;)(\s*)win(\s*)(?=;|$)/gm;
function fixWin(s) {
  if (P.levels.length < 2 || !/(:|;)\s*win\s*(;|$)/m.test(s.rules || '')) return '';
  return h('button', { title: '`win` ends the whole game; `next` goes to the next level (and wins on the last one)', on: { click() { s.rules = s.rules.replace(WIN_RE, '$1$2next$3'); render(); } } }, 'win \u2192 next');
}
