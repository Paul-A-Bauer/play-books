// Global tab: metadata, variables, global rules, Pug template.
function vGlobal(){const f=(l,k)=>lab(l,h('input',{value:P[k]||'',on:{input(e){P[k]=e.target.value;save()}}}));
return h('div',{},f('Title','title'),f('Author','author'),
lab('Variables (name=value per line)',h('textarea',{rows:3,value:Object.entries(P.vars).map(([k,v])=>k+'='+v).join('\n'),on:{input(e){P.vars={};e.target.value.split('\n').forEach(l=>{const m=l.match(/^\s*(\w+)\s*=\s*(-?\d+)/);if(m)P.vars[m[1]]=+m[2]});save()}}})),
lab('Global rules (run in every level)',bind(P,'rules',4)),
lab('Storyteller page template (Pug; {{TITLE}} = level name). Used by Storyteller exports; the build server ignores it unless ALLOW_CUSTOM_TEMPLATES=1',bind(P,'template',12)),h('div',{className:'row'},h('button',{on:{click(){P.template=TEMPLATES.level;render()}}},'Reset template to default')))}
