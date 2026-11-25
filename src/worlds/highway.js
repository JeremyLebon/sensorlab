/* worlds/highway.js — snelweg: 3 rijstroken per richting (rijstrookmiddens y = -3,5 / 0 / +3,5),
   pechstrook rechts, middenberm met New Jersey, rijdend verkeer */
import {S} from '../core/state.js';
import {fmod} from '../core/util.js';
export default {
  label:'Snelweg',
  build({O,box,cyl,wall,car,truck,person}){let o;
    const W={ground:'highway',lanes:[-3.5,0,3.5],x0:-300,x1:1100,roads:[[-8.2,5.6],[6.3,17.6]],start:0,end:860,dust:{dx:12,dy:0,r:5},
       hud:[['Auto voor ons','auto voor ons'],['Verloren band (0,25 m)','verloren band']]};
    o=O('Auto voor ons',0.7,'#f1f4f6',{key:true,v:29});car(o,40,0,0);
    o=O('Zwarte auto (5 %)',0.05,'#16191c',{key:true,v:33});car(o,14,3.5,0);
    o=O('Auto achter ons',0.5,'#b3262b',{key:true,v:30.5});car(o,-26,0,0);
    o=O('Vrachtwagen met oplegger',0.45,'#d9dde0',{key:true,v:24});truck(o,70,-3.5);
    o=O('Motorrijder',0.3,'#2d2f33',{key:true,v:36});box(o,-45,3.5,2.1,0.75,0,1.5,0,false);o.models.push({k:'moto',cx:-45,cy:3.5});o.hx=-45;o.hy=3.5;
    for(const [x,y,c,v] of [[120,11.95,'#8c97a3',-31],[260,8.45,'#2b5aa8',-34],[360,15.45,'#e6e9ec',-28]]){o=O('Tegenliggers',0.6,c,{key:true,v});o.tid=x;car(o,x,y,Math.PI,c);}
    o=O('Verloren band (0,25 m)',0.08,'#1d1f22',{key:true});cyl(o,130,0.2,0.36,0,0.25,'tire');o.hx=130;o.hy=0.2;
    o=O('Pechauto op pechstrook',0.6,'#c7a12b',{key:true});car(o,330,-6.6,0.05);
    o=O('Persoon op pechstrook',0.35,'#ff7a1a',{key:true});person(o,S.ped.x,S.ped.y);
    o=O('Vangrail (0,55–0,8 m)',0.6,'#c3c9ce',{key:true});wall(o,-300,-8.8,1100,-8.8,0.55,0.8,0.08);wall(o,-300,18.2,1100,18.2,0.55,0.8,0.08);
    o=O('Vangrailpalen',0.4,'#8d959c');for(let x=-120;x<=1100;x+=4)box(o,x,-8.9,0.1,0.1,0,0.8);
    o=O('Middenberm (New Jersey, 0,85 m)',0.35,'#c5c3bc',{key:true});box(o,400,5.95,1400,0.6,0,0.85);
    o=O('Hectometerpaaltjes (retro)',2.0,'#f2f4f5',{key:true});for(let x=-200;x<=1100;x+=100)box(o,x,-9.3,0.12,0.12,0,1.0);
    o=O('Portiek met borden',0.5,'#8d959c',{key:true});box(o,240,-10,0.5,0.5,0,7.2);box(o,240,19,0.5,0.5,0,7.2);box(o,240,4.5,0.6,29.5,6.5,7.1);
    o=O('Borden boven de weg (retro)',3,'#1f6fb8',{key:true});for(const y of [-3.5,0,3.5])box(o,239.6,y,0.12,3.3,5.3,6.9);
    o=O('Brug (onderkant 5,4 m)',0.35,'#b0b4b3',{key:true});box(o,520,4.5,12,56,5.4,6.4);for(const y of [-11.5,5.95,20])box(o,520,y,1.2,1.2,0,5.4);
    o=O('Geluidsmuur',0.3,'#8b9a86');wall(o,-300,-14,1100,-14,0,4,0.3);
    return W;
  },
  isMark(x,y){
    for(const yl of [-1.75,1.75,10.2,13.7])if(Math.abs(y-yl)<0.08&&fmod(x,12)<3)return true;
    for(const yl of [-5.25,5.25,6.75,17.15])if(Math.abs(y-yl)<0.1)return true;return false;
  },
  marks(dashes,solids,W){for(const yl of [-1.75,1.75,10.2,13.7])for(let x=W.x0;x<W.x1;x+=12)dashes.push([x+1.5,yl,3,0.16]);solids.push([-5.25,0.2],[5.25,0.2],[6.75,0.2],[17.15,0.2]);}
};
