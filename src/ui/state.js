// App state: project P, persistence, current selections.
function load(){try{const p=JSON.parse(localStorage.getItem('slb1'));return p&&p.levels?p:null}catch(e){return null}}
function save(){try{localStorage.setItem('slb1',JSON.stringify(P))}catch(e){}}
let P=load()||demo(),cur=0,tool='wall',tab='levels',G=null,draw=()=>{};
const sp=id=>P.sprites.find(s=>s.id===id)||{};
