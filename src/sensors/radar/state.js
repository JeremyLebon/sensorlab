/* sensors/radar/state.js — toestand van de radar (UI-sleutels "radar.<key>") */
export const R={preset:'mrr',hfov:90,angRes:5,rangeRes:0.3,vRes:0.15,rmax:80,vfov:14,freq:20,mount:'front',mountH:0.5,
  dirt:0,statFilter:false,multipath:true,
  color:'vr',show3d:true,vectors:true};
export const RBASE=JSON.parse(JSON.stringify(R));
