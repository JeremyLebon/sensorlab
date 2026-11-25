/* worlds/street.js — straat met voetganger, hond, auto's, vrachtwagen, slagboom, bushokje met glas */
import {S} from '../core/state.js';
import {fmod} from '../core/util.js';
export default {
  label:'Straat',
  build({O,box,cyl,wall,car,person}){let o;
    const W={ground:'street',lanes:[0,3.5],x0:-60,x1:110,roads:[[-5.75,7.75]],start:0,end:46,dust:{dx:10,dy:-0.5,r:4.5},
       hud:[['Voetganger','voetganger'],['Hond (0,5 m)','hond']]};
    o=O('Voetganger',0.35,'#e2557a',{key:true});person(o,S.ped.x,S.ped.y);
    o=O('Hond (0,5 m)',0.3,'#c98a4b',{key:true});box(o,S.dog.x,S.dog.y,0.75,0.28,0,0.5,0.4,'dog');o.hx=S.dog.x;o.hy=S.dog.y;
    o=O('Witte auto',0.7,'#f1f4f6',{key:true});car(o,16,-3.6,0);
    o=O('Zwarte auto (5 %)',0.05,'#16191c',{key:true});car(o,25,4.6,Math.PI);
    o=O('Vrachtwagen-laadbak (vanaf 1,0 m)',0.45,'#3d7cc9',{key:true});box(o,38,-3.4,6.5,2.4,1.0,3.6);
    o=O('Vrachtwagen-cabine en wielen',0.45,'#2f5e98');box(o,42.4,-3.4,2.2,2.4,0.4,3.2);
    for(const x of [37.5,40.8])for(const y of [-2.4,-4.4])box(o,x,y,1.0,0.3,0,1.0,0,'wheel');
    o=O('Slagboom (0,9–1,0 m)',0.6,'#e04848',{key:true});box(o,52,-0.6,0.1,7.6,0.9,1.0);
    o=O('Slagboompaal',0.5,'#cfd5da');box(o,52,-4.8,0.3,0.3,0,1.1);
    o=O('Stoeprand (15 cm)',0.25,'#9aa3ab',{key:true});wall(o,-60,-5.9,110,-5.9,0,0.15,0.25);wall(o,-60,7.9,110,7.9,0,0.15,0.25);
    o=O('Palen (Ø 12 cm)',0.5,'#7fb03c',{key:true});for(let x=-36;x<=100;x+=8)cyl(o,x+2,-7.2,0.06,0,3.5);
    o=O('Verkeersbord (retroreflecterend)',3,'#2a8fd6',{key:true});box(o,20,-7.6,0.05,0.8,1.7,2.4);
    o=O('Paal verkeersbord',0.5,'#9aa3ab');cyl(o,20,-7.6,0.04,0,1.7);
    o=O('Glaswand bushokje',0.08,'#8fc4ff',{glass:true,key:true});wall(o,22,9.4,29,9.4,0,2.5,0.04);
    o=O('Bushokje (dak en zijkant)',0.4,'#7b8794');box(o,25.5,10.4,7.2,2.2,2.5,2.65);wall(o,22,9.4,22,11.4,0,2.5,0.08);
    o=O('Persoon achter glas',0.35,'#e2557a',{key:true});person(o,25.5,10.6);
    o=O('Haag',0.15,'#4f9a52',{key:true});box(o,-10,-10,8,1.4,0,1.3);
    o=O('Gebouw',0.4,'#a7b0b8');box(o,46,19,18,8,0,9);box(o,-26,16,14,8,0,7);box(o,8,17,12,7,0,6);
    o=O('Muur',0.5,'#a7b0b8');wall(o,-60,-15,110,-15,0,2.5,0.3);
    return W;
  },
  isMark(x,y){
    if(Math.abs(y-1)<0.07&&fmod(x,6)<3)return true;if(Math.abs(y+5.45)<0.07||Math.abs(y-7.45)<0.07)return true;
    if(x>30&&x<34&&y>-5.6&&y<7.6&&fmod(y+5.6,1)<0.5)return true;return false;
  },
  marks(dashes,solids,W){for(let x=W.x0;x<W.x1;x+=6)dashes.push([x+1.5,1,3,0.14]);solids.push([-5.45,0.14],[7.45,0.14]);for(let y=-5.6;y<7.6;y+=1)dashes.push([32,y+0.25,4,0.5]);}
};
