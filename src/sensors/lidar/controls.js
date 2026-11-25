/* sensors/lidar/controls.js — UI-schema van de lidar (tabblad Sensor); sleutels zonder prefix, core/ui.js zet er "lidar." voor */
import {MOUNTS} from '../../core/vehicle.js';
export default [
  {g:'Sensor',items:[
   {k:'preset',t:'sel',label:'Voorbeeld',opts:[['vlp16','Roterend, 16 lagen'],['os64','Roterend, 64 lagen'],['hr128','Roterend, 128 lagen, lang bereik'],['solid','Solid-state in grille, 120°'],['safety','2D-veiligheidsscanner (270°)'],['lds','Goedkope 2D (TurtleBot-klasse)'],['custom','— eigen instelling —']]},
   {k:'type',t:'sel',label:'Bouwwijze',opts:[['rot','Roterend'],['static','Statisch / solid-state']]},
   {k:'hfov',label:'Horizontale FOV',min:20,max:360,step:10,u:'°',d:0},
   {k:'hres',t:'sel',label:'Hor. resolutie',num:true,opts:[[0.1,'0,1°'],[0.2,'0,2°'],[0.35,'0,35°'],[0.5,'0,5°'],[1,'1°'],[1.6,'1,6°'],[3.2,'3,2°']]},
   {k:'layers',t:'sel',label:'Aantal lagen',num:true,opts:[1,2,4,8,16,32,64,128].map(v=>[v,String(v)])},
   {k:'vfov',label:'Verticale FOV',min:2,max:90,step:1,u:'°',d:0},
   {k:'vcenter',label:'Middenhoek verticaal',min:-30,max:15,step:1,u:'°',d:0},
   {k:'rmax',label:'Bereik @10 % reflectie',min:5,max:300,step:5,u:' m',d:0},
   {k:'freq',label:'Scanfrequentie',min:2,max:30,step:1,u:' Hz',d:0}]},
  {g:'Montage',items:[
   {k:'mount',t:'sel',label:'Plaats',opts:Object.entries(MOUNTS).map(([k,m])=>[k,m.label])},
   {k:'mountH',label:'Montagehoogte',min:0.1,max:3.5,step:0.05,u:' m',d:2}]},
  {g:'Kalibratiefout',note:'Verschil tussen de werkelijke montage en wat de software denkt. De sensor in 3D staat echt scheef, de punten worden berekend alsof hij recht staat.',items:[
   {k:'err.yaw',label:'Gierhoek (yaw)',min:-10,max:10,step:0.5,u:'°',d:1},
   {k:'err.pitch',label:'Kanteling (pitch)',min:-5,max:5,step:0.25,u:'°',d:2},
   {k:'err.h',label:'Hoogte',min:-0.5,max:0.5,step:0.05,u:' m',d:2},
   {k:'err.x',label:'Positie voor/achter',min:-1,max:1,step:0.05,u:' m',d:2}]},
  {g:'Verwerking',items:[
   {k:'echo',t:'sel',label:'Echo-keuze',opts:[['first','Eerste echo'],['last','Laatste echo'],['strong','Sterkste echo']]},
   {k:'noise',label:'Afstandsruis (1σ)',min:0,max:0.15,step:0.005,u:' m',d:3},
   {k:'deskew',t:'chk',label:'Bewegingscompensatie (deskew)'}]},
  {g:'Weergave puntenwolk',items:[
   {k:'color',t:'sel',label:'Kleur punten',opts:[['height','Hoogte (berekend)'],['class','Grond / obstakel'],['intensity','Intensiteit'],['layer','Laag'],['source','Werkelijke oorzaak']]},
   {k:'psize',label:'Puntgrootte',min:0.5,max:3,step:0.25,fmt:v=>String(v.toFixed(2)).replace('.',',')+'×'},
   {k:'beams',t:'chk',label:'Stralen tonen (sweep vertraagd)'},
   {k:'live',t:'chk',label:'Ruis en weer per scan vernieuwen'}]}
 ];
