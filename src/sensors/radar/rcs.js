/* sensors/radar/rcs.js — radarterugkaatsing per object (op naam, zodat de wereldbestanden sensor-onafhankelijk blijven)
   mode 'obj'  : rcs [m²] voor het hele object (verdeeld over de zichtbare hoekvakjes)
   mode 'part' : rcs per onderdeel (bv. elke paal apart)
   mode 'ext'  : rcs per meter zichtbare lengte (muren, vangrail, gevels)
   T     : doorlaatbaarheid heen en terug (glas, gewas, haag); ontbreekt = ondoorlaatbaar
   under : voertuig met vrije bodem — de radar ziet via een weerkaatsing onder het voertuig door nog een deel erachter
   mirror: vlakke wand die spookdoelen geeft (multipath)
   Kleur en lidar-reflectie (ρ) spelen geen rol: een zwarte auto is voor radar even goed zichtbaar als een witte. */
const CAR={rcs:10,mode:'obj',under:0.1},PERSON={rcs:0.5,mode:'obj'};
export const RCS={
  'Voetganger':PERSON,'Persoon achter glas':PERSON,'Persoon (in het veld)':PERSON,'Persoon tussen gewas':PERSON,'Persoon op pechstrook':PERSON,
  'Hond (0,5 m)':{rcs:0.1,mode:'obj'},
  'Witte auto':CAR,'Zwarte auto (5 %)':CAR,'Auto voor ons':CAR,'Auto achter ons':CAR,'Pechauto op pechstrook':CAR,'Tegenliggers':CAR,
  'Vrachtwagen-laadbak (vanaf 1,0 m)':{rcs:30,mode:'obj'},'Vrachtwagen-cabine en wielen':{rcs:20,mode:'obj'},'Vrachtwagen met oplegger':{rcs:100,mode:'obj'},
  'Motorrijder':{rcs:2,mode:'obj'},'Verloren band (0,25 m)':{rcs:0.3,mode:'obj'},
  'Slagboom (0,9–1,0 m)':{rcs:1,mode:'obj'},'Slagboompaal':{rcs:0.3,mode:'obj'},
  'Stoeprand (15 cm)':{rcs:0.02,mode:'ext'},'Palen (Ø 12 cm)':{rcs:0.3,mode:'part'},
  'Verkeersbord (retroreflecterend)':{rcs:5,mode:'obj'},'Paal verkeersbord':{rcs:0.2,mode:'obj'},
  'Glaswand bushokje':{rcs:0.05,mode:'ext',T:0.9},'Bushokje (dak en zijkant)':{rcs:1,mode:'ext'},
  'Haag':{rcs:0.2,mode:'ext',T:0.5},'Gebouw':{rcs:10,mode:'ext'},'Muur':{rcs:10,mode:'ext',mirror:true},
  'Maïsrijen (0,8 m)':{rcs:0.1,mode:'ext',T:0.8},'Ronde balen':{rcs:0.3,mode:'part'},'Draadafsluiting (1,0 m)':{rcs:0.01,mode:'ext'},
  'Afsluitpalen (Ø 10 cm)':{rcs:0.05,mode:'part'},'Tractor':{rcs:30,mode:'obj'},'Schuur':{rcs:10,mode:'ext'},'Silo':{rcs:40,mode:'obj'},
  'Graanwagen (vanaf 1,1 m)':{rcs:30,mode:'obj'},
  'Vangrail (0,55–0,8 m)':{rcs:5,mode:'ext',mirror:true},'Vangrailpalen':{rcs:0.1,mode:'part'},'Middenberm (New Jersey, 0,85 m)':{rcs:3,mode:'ext',mirror:true},
  'Hectometerpaaltjes (retro)':{rcs:0.1,mode:'part'},'Portiek met borden':{rcs:40,mode:'obj'},'Borden boven de weg (retro)':{rcs:60,mode:'obj'},
  'Brug (onderkant 5,4 m)':{rcs:300,mode:'obj'},'Geluidsmuur':{rcs:10,mode:'ext',mirror:true}
};
export const rcsOf=o=>RCS[o.name]||{rcs:Math.max(0.05,o.rho*2),mode:'obj'};
