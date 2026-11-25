/* sensors/radar/controls.js — UI-schema van de radar (tabblad Sensor); core/ui.js zet er "radar." voor */
import {MOUNTS} from './presets.js';
export default [
  {g:'Radar',items:[
   {k:'preset',t:'sel',label:'Voorbeeld',opts:[['lrr','Lange afstand (ACC), ±10°'],['mrr','Middellange afstand, ±45°'],['srr','Hoekradar, ±75°'],['img','4D-beeldradar, ±50°'],['custom','— eigen instelling —']]},
   {k:'hfov',label:'Horizontale FOV',min:10,max:160,step:5,u:'°',d:0},
   {k:'angRes',label:'Hoekresolutie',min:1,max:12,step:0.5,u:'°',d:1},
   {k:'rangeRes',label:'Afstandsresolutie',min:0.1,max:1.5,step:0.05,u:' m',d:2},
   {k:'vRes',label:'Snelheidsresolutie (Doppler)',min:0.05,max:1,step:0.05,u:' m/s',d:2},
   {k:'rmax',label:'Bereik voor een auto (10 m²)',min:20,max:250,step:5,u:' m',d:0},
   {k:'vfov',label:'Verticale bundel',min:4,max:30,step:1,u:'°',d:0},
   {k:'freq',label:'Meetfrequentie',min:5,max:30,step:1,u:' Hz',d:0}]},
  {g:'Montage',items:[
   {k:'mount',t:'sel',label:'Plaats',opts:Object.entries(MOUNTS).map(([k,m])=>[k,m.label])},
   {k:'mountH',label:'Montagehoogte',min:0.3,max:1.0,step:0.05,u:' m',d:2},
   {k:'dirt',label:'Vuile radarkap (modder, sneeuw)',min:0,max:1,step:0.05,fmt:v=>v==0?'proper':'−'+String(Math.round(v*15))+' dB'}]},
  {g:'Verwerking',items:[
   {k:'statFilter',t:'chk',label:'Stilstaande doelen wegfilteren (zoals ACC)'},
   {k:'multipath',t:'chk',label:'Weerkaatsing via vangrail en muren (multipath)'}]},
  {g:'Weergave radar',items:[
   {k:'color',t:'sel',label:'Kleur detecties',opts:[['vr','Radiale snelheid (Doppler)'],['stat','Bewegend / stilstaand'],['snr','Signaalsterkte (SNR)'],['source','Werkelijke oorzaak']]},
   {k:'vectors',t:'chk',label:'Snelheidsvectoren tonen (bewegende doelen)'},
   {k:'show3d',t:'chk',label:'Bundel en detecties in de 3D-wereld'}]}
];
