/* sensors/radar/metrics.js — meetblok (tabblad Meting), HUD-regel en kop/legende van het radarvenster */
import {$,nl,D2R} from '../../core/util.js';
import {S,F} from '../../core/state.js';
import {W} from '../../core/world.js';
import {R} from './state.js';
import {rangeFor,alphaRain} from './model.js';
import {legendHtml} from './view.js';

export function initMeas(){$('meas-radar').insertAdjacentHTML('beforeend',`
  <section><h2>Wat ziet de radar?</h2><div id="radObj"></div><p class="hint">Aantal detecties per object in de laatste meting, met de radiale snelheid van de sterkste detectie (negatief = naderend). Spookdoelen (multipath) apart.</p></section>
  <section><h2>Meetwaarden radar</h2><div id="radMet"></div></section>
  <section><h2>Radar tegenover lidar</h2>
    <table class="cmp">
      <tr><td>Weer</td><td>Radar (golflengte 4 mm) ziet door mist, stof en regen. Lidar (905/1550 nm) wordt erdoor verblind.</td></tr>
      <tr><td>Snelheid</td><td>Radar meet de radiale snelheid rechtstreeks (Doppler). Lidar moet ze afleiden uit opeenvolgende scans.</td></tr>
      <tr><td>Resolutie</td><td>Radar: enkele graden. Lidar: tienden van een graad. Radar ziet "iets", lidar ziet de vorm.</td></tr>
      <tr><td>Materiaal</td><td>Radar: metaal sterk, mens zwak, kleur maakt niet uit. Lidar: kleur en reflectie bepalen het bereik.</td></tr>
    </table>
  </section>
  <section><h2>Formules</h2>
    <p class="hint">ontvangen vermogen ≈ <span class="f">σ / R⁴</span> → bereik ∝ <span class="f">σ<sup>¼</sup></span> · celbreedte = <span class="f">R · Δθ</span> · Doppler: <span class="f">v<sub>r</sub> = λ·f<sub>D</sub>/2</span> (77 GHz: 1 m/s ≈ 513 Hz) · spookdoel: spiegelbeeld achter de wand</p>
  </section>`);}

export function metrics(res){
  const dets=res?res.dets:[],shown=dets.filter(d=>!d.filtered),ghosts=shown.filter(d=>d.src==='ghost').length,filt=dets.length-shown.length;
  // per object
  const cnt=new Map(),gh=new Map(),fl=new Map(),best=new Map();
  for(const d of dets){const n=d.o.name,m=d.filtered?fl:d.src==='ghost'?gh:cnt;m.set(n,(m.get(n)||0)+1);
    if(d.src!=='ghost'&&(!best.has(n)||d.P>best.get(n).P))best.set(n,d);}
  let t='<table>';const done=new Set();
  for(const o of W.objs){if(!o.key||done.has(o.name))continue;done.add(o.name);
    const n=cnt.get(o.name)||0,f=fl.get(o.name)||0,g=gh.get(o.name)||0;
    const pill=n?'<span class="pill ok">gezien</span>':f?'<span class="pill lo">weggefilterd</span>':'<span class="pill no">niet gezien</span>';
    const b=best.get(o.name),v=b?' · '+(b.vr>0?'+':'')+nl(b.vr,1)+' m/s':'';
    t+='<tr><td class="lbl">'+o.name+'</td><td>'+n+v+(g?' <b class="w">+'+g+' spook</b>':'')+' '+pill+'</td></tr>';}
  $('radObj').innerHTML=t+'</table>';
  const rows=[];
  rows.push(['Detecties (getoond)',String(shown.length)]);
  if(ghosts)rows.push(['waarvan spookdoelen (multipath)',String(ghosts),'w']);
  if(R.statFilter)rows.push(['Stilstaand, weggefilterd',String(filt),filt?'w':'']);
  rows.push(['Celbreedte op 20 m (R·Δθ)',nl(20*R.angRes*D2R,1)+' m']);
  rows.push(['Celbreedte op 100 m',nl(100*R.angRes*D2R,1)+' m',100*R.angRes*D2R>3.5?'w':'']);
  rows.push(['Afstandsresolutie',nl(R.rangeRes,2)+' m']);
  rows.push(['Snelheidsresolutie',nl(R.vRes,2)+' m/s ('+nl(R.vRes*3.6,1)+' km/h)']);
  rows.push(['Bereik vrachtwagen (100 m²)',nl(rangeFor(100),0)+' m']);
  rows.push(['Bereik auto (10 m²)',nl(rangeFor(10),0)+' m']);
  rows.push(['Bereik motorrijder (2 m²)',nl(rangeFor(2),0)+' m']);
  rows.push(['Bereik voetganger (0,5 m²)',nl(rangeFor(0.5),0)+' m']);
  if(S.rain>0)rows.push(['Demping regen op 100 m (heen en terug)',nl(10*Math.log10(Math.exp(2*alphaRain()*100)),1)+' dB']);
  if(R.dirt>0)rows.push(['Demping vuile radarkap',nl(15*R.dirt,1)+' dB','w']);
  if(S.fog>0||S.dust)rows.push(['Mist en stof','geen invloed op radar']);
  $('radMet').innerHTML='<table>'+rows.map(r=>'<tr><td class="lbl">'+r[0]+'</td><td><b class="'+(r[2]||'')+'">'+r[1]+'</b></td></tr>').join('')+'</table>';
  const name={lrr:'lange afstand',mrr:'middellange afstand',srr:'hoekradar',img:'4D-beeldradar',custom:'eigen'}[R.preset];
  $('hud-radar').innerHTML='radar '+name+' · ±'+nl(R.hfov/2,0)+'° · '+nl(R.angRes,1)+'° · '+R.freq+' Hz · '+shown.length+' detecties'+
    (ghosts?' · <span class="w">'+ghosts+' spook</span>':'')+(filt?' · <span class="w">'+filt+' stilstaand weggefilterd</span>':'');
  $('radHead').innerHTML='<b>RADAR 77 GHz</b>  '+shown.length+' detecties · '+R.freq+' Hz'+(F.driving?' · eigen snelheid '+Math.round(S.speed*3.6)+' km/h':'')+'\nbogen om de '+(R.rmax>120?50:R.rmax>50?20:10)+' m · vector = vr × 0,5 s';
  $('radLeg').innerHTML=legendHtml();
}
