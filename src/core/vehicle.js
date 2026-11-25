/* core/vehicle.js — eigen wagen (sedan, voorkant op x = 0): afmetingen, botsvorm, montageplaatsen */
const CARL=4.66,CARC=-2.33;                     // lengte, middelpunt t.o.v. voorkant
const VEHB=[{x0:-4.66,x1:0,y0:-0.92,y1:0.92,z0:0.25,z1:0.97},{x0:-3.88,x1:-1.33,y0:-0.76,y1:0.76,z0:0.97,z1:1.43}];
function carTop(x){const l=x-CARC;if(l<-2.36||l>2.36)return 0;if(l<-1.55||l>1.0)return 0.97;if(l<-0.95)return 0.95+(l+1.55)/0.6*0.46;if(l<0.25)return 1.43;return 1.43-(l-0.25)/0.75*0.46;}
const MOUNTS={front:{x:0.06,label:'Grille / voorbumper'},roofF:{x:-1.7,label:'Dak, boven voorruit'},roofM:{x:-2.55,label:'Dak, midden'}};
