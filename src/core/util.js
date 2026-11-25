/* core/util.js — kleine hulpfuncties */
const D2R=Math.PI/180;
const nl=(v,d)=>Number(v).toFixed(d).replace('.',',');
const $=id=>document.getElementById(id);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const fmod=(a,b)=>((a%b)+b)%b;
function gauss(rng){return Math.sqrt(-2*Math.log(1-rng()))*Math.cos(2*Math.PI*rng());}
