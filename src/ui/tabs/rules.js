// Rules tab: level rules + live lint.
function vScript(){const L=P.levels[cur],out=h('div',{className:'lint'});
const lint=()=>{const bad=[],chk=(n,t)=>(t||'').split('\n').forEach((ln,i)=>{ln=ln.trim();if(!ln||ln.startsWith('//'))return;const m=ln.match(RULE);if(!m||!/^(enter|start)$/.test(m[1])||!m[4].split(';').every(a=>ACT.test(a.trim())))bad.push(n+' line '+(i+1)+': '+ln)});chk('global',P.rules);chk('level '+L.name,L.rules);P.sprites.forEach(s=>chk('sprite '+s.id,s.rules));const warn=[],isWin=t=>/(:|;)\s*win\s*(;|$)/m.test(t||''),last=P.levels.length-1,W=n=>warn.push('! '+n+': `win` ends the whole game; use `next` to continue to the next level');
if(last>0){P.sprites.forEach(s=>isWin(s.rules)&&W('sprite '+s.id));if(isWin(P.rules))W('global');P.levels.forEach((l,i)=>i<last&&isWin(l.rules)&&W('level '+l.name))}
out.textContent=[...bad,...warn].join('\n')||'✓ all rules parse'};lint();
return h('div',{},h('div',{className:'row'},h('select',{on:{change(e){cur=+e.target.value;render()}}},...P.levels.map((l,i)=>h('option',{value:i,selected:i===cur},l.name)))),
lab('Level rules: '+L.name,h('textarea',{rows:8,placeholder:'on start: say Find the key\non enter goal: win',value:L.rules||'',on:{input(e){L.rules=e.target.value;save();lint()}}})),
out,h('pre',{},HELP))}
