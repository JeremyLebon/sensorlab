/* core/experiments.js — experimenten-engine: "Instellen" zet de simulator in een gekende toestand
   De experimenten zelf staan per sensor (sensors/<id>/experiments.js) in EXPS. */
function applyState(over){
  const keep={color:S.color,psize:S.psize,live:S.live};
  const ns=JSON.parse(JSON.stringify(BASE));Object.assign(ns,keep);
  const pr=over.preset||'vlp16';Object.assign(ns,PRESETS[pr]);ns.preset=pr;
  const w=WORLDSTART[over.world||'street'];ns.ped={...w.ped};ns.dog={...w.dog};ns.speed=w.speed;
  for(const k in over){if(k==='err')Object.assign(ns.err,over.err);else if(!['drive','view','layout'].includes(k))ns[k]=over[k];}
  for(const k in ns)S[k]=(k==='err'||k==='ped'||k==='dog')?Object.assign({},ns[k]):ns[k];
  TDX.clear();S.vy=0;EGO.yaw=0;EGO.vyRate=0;EGO.target=0;setDriving(!!over.drive);
  worldDirty=true;dirty=true;applyObjMode();updateFog();syncControls();
  view=over.view||'free';if(over.layout)setLayout(over.layout);
  pendingCam=true;
}
let pendingCam=false;
function buildExps(){$('exps').innerHTML=EXPS.map((e,i)=>'<div class="exp" id="exp'+i+'"><div class="nr">EXPERIMENT '+(i+1)+'</div><h3>'+e.t+'</h3><p>'+e.u+'</p><p class="q">'+e.q+'</p><button class="act" data-i="'+i+'">Instellen</button><details><summary>Toon antwoord</summary><p>'+e.a+'</p></details></div>').join('');
  $('exps').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;applyState(EXPS[i].set);markExp(i);toast('Experiment '+(i+1)+' ingesteld');}));}
function markExp(i){document.querySelectorAll('.exp').forEach((e,k)=>e.classList.toggle('active',k===i));}
