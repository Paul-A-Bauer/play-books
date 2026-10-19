// Tab registry, render loop, keyboard controls.
const TABS={levels:['Levels',vLevels],sprites:['Sprites',vSprites],global:['Global',vGlobal],script:['Rules',vScript],preview:['Preview',vPreview],export:['Project',vExport]};
function render(){$('#tabs').replaceChildren(...Object.keys(TABS).map(k=>h('button',{className:k===tab?'on':'',on:{click(){tab=k;if(k==='preview')pvStart=null;render()}}},TABS[k][0])));$('#main').replaceChildren(TABS[tab][1]());save()}
addEventListener('keydown', e => {
  if (tab !== 'preview' || !G) return;
  const plat = G.L().mode === 'platformer';
  const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], q: plat && [-1, -1], e: plat && [1, -1] }[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (d) { e.preventDefault(); G.move(...d); draw(); }
});
render();
probeServer();
