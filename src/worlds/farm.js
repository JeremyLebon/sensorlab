/* worlds/farm.js — erf en akker: maïsrijen met persoon, balen, draadafsluiting, tractor, graanwagen */
WORLDS.farm={
  label:'Erf en akker',
  build({O,box,cyl,wall,person}){let o;
    W={ground:'farm',lanes:[0],x0:-40,x1:90,roads:[[-3,3]],start:0,end:40,dust:{dx:10,dy:0,r:5},hud:[['Persoon (in het veld)','persoon'],['Hond (0,5 m)','hond']]};
    o=O('Persoon (in het veld)',0.35,'#e2557a',{key:true});person(o,S.ped.x,S.ped.y);
    o=O('Hond (0,5 m)',0.3,'#c98a4b',{key:true});box(o,S.dog.x,S.dog.y,0.75,0.28,0,0.5,0.4,'dog');o.hx=S.dog.x;o.hy=S.dog.y;
    o=O('Maïsrijen (0,8 m)',0.2,'#6b9a3a',{key:true});for(let i=0;i<12;i++)box(o,25,5+i*0.75,40,0.25,0,0.8);
    o=O('Persoon tussen gewas',0.35,'#e2557a',{key:true});person(o,22,8.4);
    o=O('Ronde balen',0.3,'#d9b45a',{key:true});for(const [x,y] of [[14,-6],[16,-6],[15,-7.7]])cyl(o,x,y,0.75,0,1.5);
    o=O('Draadafsluiting (1,0 m)',0.5,'#b9c0c6',{key:true,thin:0.003});wall(o,-30,-12,80,-12,0.98,1.01,0.01);wall(o,-30,-12,80,-12,0.48,0.51,0.01);
    o=O('Afsluitpalen (Ø 10 cm)',0.3,'#8a6a45',{key:true});for(let x=-30;x<=80;x+=5)cyl(o,x,-12,0.05,0,1.2);
    o=O('Tractor',0.4,'#2f8a3d',{key:true});box(o,32,-4.5,3.2,1.9,0.6,1.6);box(o,31.5,-4.5,1.6,1.4,1.6,2.9);
    for(const [x,y,r] of [[30.7,-3.6,0.8],[30.7,-5.4,0.8],[33.3,-3.7,0.5],[33.3,-5.3,0.5]])cyl(o,x,y,r*0.35,0,r*2,'twheel');
    o=O('Schuur',0.4,'#a94f3c');box(o,0,16,20,10,0,7);
    o=O('Silo',0.6,'#c9ced2');cyl(o,-16,12,3,0,12);
    o=O('Graanwagen (vanaf 1,1 m)',0.4,'#d07a2a',{key:true});box(o,48,-4,5,2.3,1.1,3.0);for(const x of [47,49])for(const y of [-3,-5])box(o,x,y,1.0,0.35,0,1.1,0,'wheel');
  },
  isMark(){return false;},
  marks(){}
};
