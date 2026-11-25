/* core/panels.js — per sensor een blok in het tabblad Meting (#meas-<id>) en een regel in de HUD (#hud-<id>)
   De sensor vult die zelf in (init / metrics). */
import {$} from './util.js';
import {SENSORS} from './sensors.js';
export function buildPanels(){
  const m=$('meas'),h=$('hud');m.innerHTML='';h.innerHTML='';
  for(const s of SENSORS){
    const d=document.createElement('div');d.id='meas-'+s.id;d.className='meas-s';
    if(SENSORS.length>1)d.innerHTML='<section class="meas-head"><h2 class="big">'+s.label+'</h2></section>';
    m.appendChild(d);
    const l=document.createElement('div');l.id='hud-'+s.id;h.appendChild(l);
  }
}
