/* sensors/radar/model.js — 77 GHz-radar (FMCW), didactisch vereenvoudigd
   1. Dieptebuffer in hoekvakjes van 0,1°: per vakje alle raakpunten, gesorteerd op afstand. Een object schermt af in
      verhouding tot het deel van de verticale bundel (± vfov/2 rond de montagehoogte, niet onder de grond) dat het bedekt:
      een stoeprand nauwelijks, een gevel volledig, een auto op afstand maar deels (de radar ziet over/onder de auto).
      Glas, gewas en een haag laten een deel door (T).
   2. Signaal per vakje: σ · T · exp(−2αR) · kap / R⁴ tegen de drempel 10 m² / Rmax⁴ (datasheetbereik voor een auto).
      Regen dempt licht (α), een vuile radarkap tot 15 dB; mist en stof hebben geen invloed.
   3. Resolutie: terugkaatsingen smelten samen tot één detectie (op het zwaartepunt) als hoek (angRes), afstand
      (rangeRes) én radiale snelheid (vRes) binnen de resolutie liggen; de sterkste bepaalt het centrum.
   4. Doppler: radiale snelheid vr = (v_object − v_eigen) · kijkrichting (negatief = naderend).
      Stilstaand = |vr + v_eigen·u| < 0,5 m/s → optioneel weggefilterd (zoals ACC).
   5. Multipath: een doel naast een vlakke wand (vangrail, middenberm, muur) verschijnt ook gespiegeld achter de wand. */
import {D2R,fmod,gauss} from '../../core/util.js';
import {S,EGO,F} from '../../core/state.js';
import {W} from '../../core/world.js';
import {R} from './state.js';
import {MOUNTS} from './presets.js';
import {rcsOf} from './rcs.js';

const BW=0.1,BWR=BW*D2R,TWO_PI=2*Math.PI,PI=Math.PI;
export const thr=()=>10/Math.pow(R.rmax,4);
export const alphaRain=()=>S.rain*0.0012;
export const dirtF=()=>Math.pow(10,-1.5*R.dirt);
// bereik waarop een doel met rcs [m²] nog net gedetecteerd wordt (regen en radarkap inbegrepen)
export function rangeFor(rcs){const a=alphaRain(),d=dirtF(),th=thr();let lo=0.5,hi=2000;
  const ok=t=>rcs*Math.exp(-2*a*t)*d/Math.pow(t,4)>=th;if(!ok(lo))return 0;
  for(let i=0;i<60;i++){const m=(lo+hi)/2;ok(m)?lo=m:hi=m;}return lo;}
// radarpositie en kijkrichting in de wereld
export function radarPose(){const m=MOUNTS[R.mount],c=Math.cos(EGO.yaw),s=Math.sin(EGO.yaw);
  return {ox:S.vx+m.x*c-m.y*s,oy:S.vy+m.x*s+m.y*c,head:EGO.yaw+m.yaw*D2R,h:R.mountH};}
const egoVel=()=>F.driving?[S.speed,EGO.vyRate]:[0,0];
const objVel=o=>F.driving?(o.v||0):0;
function segDist(ox,oy,p){const ex=p.x2-p.x1,ey=p.y2-p.y1,l2=ex*ex+ey*ey;let t=l2>0?((ox-p.x1)*ex+(oy-p.y1)*ey)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x1+t*ex-ox,p.y1+t*ey-oy);}
function hit(p,ox,oy,dx,dy){
  if(p.k===0){const ex=p.x2-p.x1,ey=p.y2-p.y1,den=dx*ey-dy*ex;if(Math.abs(den)<1e-12)return -1;
    const wx=p.x1-ox,wy=p.y1-oy,t=(wx*ey-wy*ex)/den,u=(wx*dy-wy*dx)/den;return u<0||u>1?-1:t;}
  const fx=ox-p.cx,fy=oy-p.cy,b=fx*dx+fy*dy,c=fx*fx+fy*fy-p.r*p.r,disc=b*b-c;return disc<0?-1:-b-Math.sqrt(disc);
}
// spiegelende wanden: lange segmenten evenwijdig met x van objecten met mirror:true
function mirrorLines(oy){
  const L=[];for(const p of W.prims){if(p.k!==0||!rcsOf(p.o).mirror)continue;
    if(Math.abs(p.y1-p.y2)<1e-6&&Math.abs(p.x2-p.x1)>20)L.push({yw:p.y1,xa:Math.min(p.x1,p.x2),xb:Math.max(p.x1,p.x2)});}
  // enkel de dichtste wand aan elke zijde: een wand verderop zit achter de eerste
  const near=s=>L.filter(l=>Math.sign(l.yw-oy)===s).sort((x,y)=>Math.abs(x.yw-oy)-Math.abs(y.yw-oy))[0];
  return [near(1),near(-1)].filter(Boolean);
}

export function detect(rng){
  const P=radarPose(),nb=Math.max(1,Math.round(R.hfov/BW)),a0=P.head-R.hfov/2*D2R,tv=Math.tan(R.vfov/2*D2R),rc=R.rmax*1.6;
  /* 1. dieptebuffer */
  const bins=new Array(nb);for(let i=0;i<nb;i++)bins[i]=[];
  for(const p of W.prims){let aS,span,d;
    if(p.k===0){d=segDist(P.ox,P.oy,p);if(d>rc)continue;const a1=Math.atan2(p.y1-P.oy,p.x1-P.ox),a2=Math.atan2(p.y2-P.oy,p.x2-P.ox),df=fmod(a2-a1+PI,TWO_PI)-PI;aS=df>=0?a1:a2;span=Math.abs(df);}
    else{const dc=Math.hypot(p.cx-P.ox,p.cy-P.oy);if(dc<=p.r)continue;d=dc-p.r;if(d>rc)continue;const h=Math.asin(p.r/dc);aS=Math.atan2(p.cy-P.oy,p.cx-P.ox)-h;span=2*h;}
    const rel=fmod(aS-a0+PI,TWO_PI)-PI;let b0=Math.floor(rel/BWR),b1=Math.floor((rel+span)/BWR);
    if(b1<0||b0>=nb)continue;b0=Math.max(0,b0);b1=Math.min(nb-1,b1);
    for(let b=b0;b<=b1;b++){const a=a0+(b+0.5)*BWR,t=hit(p,P.ox,P.oy,Math.cos(a),Math.sin(a));
      if(t<0.3||t>rc)continue;const zv=t*tv,lo=Math.max(0,P.h-zv),hi=P.h+zv;if(p.z1<lo||p.z0>hi)continue;
      bins[b].push({t,p,cov:(Math.min(p.z1,hi)-Math.max(p.z0,lo))/(hi-lo)});}}
  /* afscherming en doorlaatbaarheid per vakje */
  const rets=[],counts=new Map();
  for(let b=0;b<nb;b++){const list=bins[b];if(!list.length)continue;list.sort((x,y)=>x.t-y.t);
    let T=1;const seen=new Set();
    for(const h of list){const o=h.p.o,info=rcsOf(o),ext=info.mode==='ext';
      const dk=ext?o.idx*4096+h.p.pi:o.idx;if(seen.has(dk))continue;seen.add(dk);
      const key=info.mode==='part'?o.idx*4096+h.p.pi:o.idx;
      rets.push({b,t:h.t,o,key,T,info});if(!ext)counts.set(key,(counts.get(key)||0)+1);
      // afscherming evenredig met het deel van de verticale bundel dat het object bedekt (stoeprand: weinig, gevel: alles);
      // onder een voertuig door gaat nog een deel (under); glas/gewas/haag laten T door
      if(info.T)T*=info.T;else T*=1-h.cov*(1-(info.under||0));
      if(T<0.005)break;}}
  /* 2. signaal en Doppler per terugkaatsing */
  const a=alphaRain(),dF=dirtF(),th=thr(),ve=egoVel(),AR=R.angRes*D2R;
  const items=[],perKey=new Map();
  for(const r of rets){
    const w=r.info.mode==='ext'?r.info.rcs*r.t*BWR:r.info.rcs/counts.get(r.key);
    const sig=w*r.T*Math.exp(-2*a*r.t)*dF/Math.pow(r.t,4);
    const az=a0+(r.b+0.5)*BWR,vo=objVel(r.o),it={t:r.t,az,sig,vr:(vo-ve[0])*Math.cos(az)-ve[1]*Math.sin(az),r};
    if(r.info.mode==='ext'){if(sig>=th*0.02)items.push(it);continue;}
    (perKey.get(r.key)||perKey.set(r.key,[]).get(r.key)).push(it);
  }
  // compact object: zijn vakjes samenvoegen tot stukken van hoogstens één hoekresolutie breed
  // (persoon → één terugkaatsing, vrachtwagen dichtbij → enkele); afstand = dichtste punt, energie opgeteld
  for(const list of perKey.values()){list.sort((x,y)=>x.az-y.az);let g=null;
    const flush=()=>{if(g){g.az=g.as/g.sig;g.vr=g.vs/g.sig;items.push(g);}};
    for(const it of list){if(!g||it.az-g.az0>AR){flush();g={...it,az0:it.az,as:it.sig*it.az,vs:it.sig*it.vr};}
      else{g.t=Math.min(g.t,it.t);g.sig+=it.sig;g.as+=it.sig*it.az;g.vs+=it.sig*it.vr;}}
    flush();}
  /* 3. resolutie: sterkste eerst; een terugkaatsing smelt samen met een bestaande detectie als hoek, afstand
        én radiale snelheid binnen de resolutie liggen. Twee doelen dicht bij elkaar → één detectie. */
  items.sort((x,y)=>y.sig-x.sig);const cls=[];
  for(const it of items){
    let c=null;for(const q of cls)if(Math.abs(it.t-q.t0)<=R.rangeRes&&Math.abs(it.vr-q.v0)<=R.vRes&&Math.abs(it.az-q.a0)<=AR){c=q;break;}
    if(!c){c={t0:it.t,v0:it.vr,a0:it.az,P:0,ts:0,as:0,vs:0,best:it.r};cls.push(c);}
    c.P+=it.sig;c.ts+=it.sig*it.t;c.as+=it.sig*it.az;c.vs+=it.sig*it.vr;
  }
  const dets=[];
  const mk=(t,az,vr,Pw,o,src,info)=>{const ux=Math.cos(az),uy=Math.sin(az),x=P.ox+t*ux,y=P.oy+t*uy;
    const vg=vr+ve[0]*ux+ve[1]*uy,c=Math.cos(-EGO.yaw),s=Math.sin(-EGO.yaw),dx=x-S.vx,dy=y-S.vy;
    return {t,az,vr,snr:10*Math.log10(Pw/th),P:Pw,o,src,info,x,y,vx:dx*c-dy*s,vy:dx*s+dy*c,azv:az-EGO.yaw,stat:Math.abs(vg)<0.5};};
  for(const c of cls){if(c.P<th)continue;
    const t=c.ts/c.P+gauss(rng)*R.rangeRes/4,az=c.as/c.P+gauss(rng)*R.angRes*0.1*D2R,vr=Math.round(c.vs/c.P/R.vRes)*R.vRes;
    dets.push(mk(t,az,vr,c.P,c.best.o,'obj',c.best.info));}
  /* 5. spookdoelen via spiegelende wanden */
  if(R.multipath){const lines=mirrorLines(P.oy),real=dets.slice();
    for(const d of real){if(d.info.mode==='ext'||d.t<2)continue;
      for(const l of lines){if(Math.sign(P.oy-l.yw)!==Math.sign(d.y-l.yw)||Math.abs(d.y-l.yw)<0.3)continue;
        const gx=d.x,gy=2*l.yw-d.y,s=(l.yw-P.oy)/(gy-P.oy);if(s<=0||s>=1)continue;
        const xr=P.ox+s*(gx-P.ox);if(xr<l.xa||xr>l.xb)continue;
        const tg=Math.hypot(gx-P.ox,gy-P.oy),azg=Math.atan2(gy-P.oy,gx-P.ox);
        if(Math.abs(fmod(azg-P.head+PI,TWO_PI)-PI)>R.hfov/2*D2R||tg>rc)continue;
        const Pg=d.P*0.25*Math.pow(d.t/tg,4);if(Pg<th)continue;
        const vo=objVel(d.o),vr=Math.round(((vo-ve[0])*Math.cos(azg)-ve[1]*Math.sin(azg))/R.vRes)*R.vRes;
        dets.push(mk(tg,azg,vr,Pg,d.o,'ghost',d.info));}}}
  for(const d of dets)d.filtered=R.statFilter&&d.stat;
  return {dets,pose:P};
}
