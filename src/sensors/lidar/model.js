/* sensors/lidar/model.js — lidarmodel: stralen, raycast, signaal, echo's, weer
   Signaal: ρ · T · exp(-2αR) / R²  tegen drempel 0,1 / Rmax²  (datasheetbereik @10 %) */
const GROUND={name:'grond',rho:0.2};
function layerEls(){const L=S.layers,a=[];if(L===1)return[S.vcenter*D2R];for(let j=0;j<L;j++)a.push((S.vcenter-S.vfov/2+S.vfov*j/(L-1))*D2R);return a;}
function selfBlock(ox,oy,oz,dx,dy,tE){
  for(const B of VEHB){let tmin=0,tmax=1e9;
    if(Math.abs(dx)<1e-12){if(ox<B.x0||ox>B.x1)continue;}else{let a=(B.x0-ox)/dx,b=(B.x1-ox)/dx;if(a>b)[a,b]=[b,a];tmin=Math.max(tmin,a);tmax=Math.min(tmax,b);}
    if(Math.abs(dy)<1e-12){if(oy<B.y0||oy>B.y1)continue;}else{let a=(B.y0-oy)/dy,b=(B.y1-oy)/dy;if(a>b)[a,b]=[b,a];tmin=Math.max(tmin,a);tmax=Math.min(tmax,b);}
    if(tE<-1e-9)tmax=Math.min(tmax,-oz/tE);
    if(tmax<=tmin)continue;
    const za=oz+tmin*tE,zb=oz+tmax*tE,lo=Math.min(za,zb),hi=Math.max(za,zb);
    if(hi>=B.z0&&lo<=B.z1)return true;}
  return false;
}
const CT=new Float64Array(96),CO=new Array(96);
/* hoekvakken: elke straal test enkel de objecten in zijn eigen 0,5°-vak i.p.v. alle objecten */
const NB=720,TWO_PI=2*Math.PI;let BINS=null;
function segDist(ox,oy,p){const ex=p.x2-p.x1,ey=p.y2-p.y1,l2=ex*ex+ey*ey;let t=l2>0?((ox-p.x1)*ex+(oy-p.y1)*ey)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x1+t*ex-ox,p.y1+t*ey-oy);}
function buildBins(ox,oy,margin,rcull){
  const bins=new Array(NB);for(let i=0;i<NB;i++)bins[i]=[];
  for(const p of W.prims){let a0,span,d;
    if(p.k===0){d=segDist(ox,oy,p);if(d>rcull)continue;const a1=Math.atan2(p.y1-oy,p.x1-ox),a2=Math.atan2(p.y2-oy,p.x2-ox);let df=fmod(a2-a1+Math.PI,TWO_PI)-Math.PI;a0=df>=0?a1:a2;span=Math.abs(df);}
    else{const dx=p.cx-ox,dy=p.cy-oy,dc=Math.hypot(dx,dy);d=Math.max(0,dc-p.r);if(d>rcull)continue;const h=dc>p.r+1e-6?Math.asin(p.r/dc):Math.PI;a0=Math.atan2(dy,dx)-h;span=2*h;}
    const mg=d>1e-3?Math.atan((margin+0.25)/d):Math.PI;a0-=mg;span+=2*mg;
    if(span>=TWO_PI){for(let i=0;i<NB;i++)bins[i].push(p);continue;}
    const i0=Math.floor(fmod(a0+Math.PI,TWO_PI)/TWO_PI*NB),cnt=Math.ceil(span/TWO_PI*NB)+1;
    for(let k=0;k<cnt;k++)bins[(i0+k)%NB].push(p);}
  BINS=bins;
}
function dustSpan(ox,oy,dx,dy){const d=W.dustC,fx=ox-d.cx,fy=oy-d.cy,b=fx*dx+fy*dy,c=fx*fx+fy*fy-d.r*d.r,disc=b*b-c;
  if(disc<0)return null;const s=Math.sqrt(disc),a=Math.max(-b-s,0),e=-b+s;return e>a?[a,e]:null;}
function cast(rng,ox,oy,oz,az,el){
  const dx=Math.cos(az),dy=Math.sin(az),tE=Math.tan(el),cE=Math.cos(el);let n=0;
  const list=BINS?BINS[Math.floor(fmod(az+Math.PI,TWO_PI)/TWO_PI*NB)%NB]:W.prims;
  for(const p of list){let t;
    if(p.k===0){const ex=p.x2-p.x1,ey=p.y2-p.y1,den=dx*ey-dy*ex;if(den>-1e-12&&den<1e-12)continue;
      const wx=p.x1-ox,wy=p.y1-oy;t=(wx*ey-wy*ex)/den;if(t<0.05)continue;const u=(wx*dy-wy*dx)/den;if(u<0||u>1)continue;}
    else{const fx=ox-p.cx,fy=oy-p.cy,b=fx*dx+fy*dy,c=fx*fx+fy*fy-p.r*p.r,disc=b*b-c;if(disc<0)continue;t=-b-Math.sqrt(disc);if(t<0.05)continue;}
    const z=oz+t*tE;if(z<p.z0||z>p.z1)continue;CT[n]=t;CO[n]=p.o;n++;if(n>92)break;}
  if(tE<-1e-6){CT[n]=-oz/tE;CO[n]=GROUND;n++;}
  for(let i=1;i<n;i++){const t=CT[i],o=CO[i];let j=i-1;while(j>=0&&CT[j]>t){CT[j+1]=CT[j];CO[j+1]=CO[j];j--;}CT[j+1]=t;CO[j+1]=o;}
  let trans=1,hT=-1,hO=null,glassHit=false;
  for(let i=0;i<n;i++){const o=CO[i];if(o.glass){if(rng()<0.85){trans*=0.8;continue;}glassHit=true;}hT=CT[i];hO=o;break;}
  return{dx,dy,cE,hT,hO,trans,glassHit};
}
const alphaAir=()=>S.fog*0.06+S.rain*0.012;
const sTh=()=>0.1/(S.rmax*S.rmax);
function effRange(rho){const a=alphaAir(),th=sTh();let lo=0.3,hi=2000;if(rho*Math.exp(-2*a*lo)/(lo*lo)<th)return 0;
  for(let i=0;i<60;i++){const m=(lo+hi)/2;(rho*Math.exp(-2*a*m)/(m*m)>=th)?lo=m:hi=m;}return lo;}
// src: 0 grond,1 object,2 glas,3 regen,4 mist,5 stof,6 storing,7 markering
function measure(rng,ox,oy,oz,az,el){
  const r=cast(rng,ox,oy,oz,az,el),a=alphaAir(),th=sTh(),cands=[];
  const span=S.dust?dustSpan(ox,oy,r.dx,r.dy):null,kd=S.dustD*0.12;
  if(r.hO){const R=r.hT/r.cE;let rho=r.hO.rho,src=1;
    if(r.hO===GROUND){src=0;const se=Math.abs(Math.sin(el));
      if(isMark(ox+r.hT*r.dx,oy+r.hT*r.dy)){src=7;rho=(S.wet?0.25:0.6)*Math.sqrt(se);}
      else rho=(S.wet?0.02:(W.ground==='farm'?0.15:0.2))*se;}
    if(r.glassHit){rho=0.08;src=2;}
    if(r.hO.thin)rho*=Math.min(1,r.hO.thin/(0.003*R+0.008));
    let dT=1;if(span){const L=Math.max(0,Math.min(span[1],r.hT)-span[0]);dT=Math.exp(-2*kd*L/r.cE);}
    const sig=rho*r.trans*Math.exp(-2*a*R)*dT/(R*R);
    if(sig>=th&&R>=0.3)cands.push({R,sig,src,o:r.hO});}
  const solidR=cands.length?cands[0].R:1e9;
  const part=(rate,rho,src,start,end)=>{if(rate<=0)return;const d=start-Math.log(1-rng())/rate;
    if(d>=end||d>=solidR||d<0.3)return;const sig=rho*Math.exp(-2*a*d)/(d*d);if(sig>=th)cands.push({R:d,sig,src,o:null});};
  if(S.rain>0)part(S.rain*0.012,0.0015,3,0,1e9);
  if(S.fog>0)part(S.fog*0.03,0.002,4,0,1e9);
  if(span)part(S.dustD*0.5,0.006,5,span[0]/r.cE,span[1]/r.cE);
  if(S.interf&&rng()<0.004)cands.push({R:1+rng()*Math.min(S.rmax*0.6,40),sig:th*3,src:6,o:null});
  if(!cands.length)return null;
  let c=cands[0];
  if(S.echo==='first'){for(const x of cands)if(x.R<c.R)c=x;}
  else if(S.echo==='last'){for(const x of cands)if(x.R>c.R)c=x;}
  else{for(const x of cands)if(x.sig>c.sig)c=x;}
  return c;
}
const mountX=()=>MOUNTS[S.mount].x;
