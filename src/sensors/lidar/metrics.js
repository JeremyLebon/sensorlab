/* sensors/lidar/metrics.js — legende, meetwaardentabel, objecttabel, HUD */
function legendHtml(){const m=S.color;
  if(m==='height')return '0 m<span class="barc" style="background:linear-gradient(90deg,hsl(240,85%,50%),hsl(120,85%,53%),hsl(0,85%,56%))"></span>3 m+';
  if(m==='class')return '<span><i style="background:#8a949e"></i>grond (z &lt; 0,2 m)</span><span><i style="background:#ff9a1f"></i>obstakel</span>';
  if(m==='intensity')return 'zwak<span class="barc" style="background:linear-gradient(90deg,hsl(45,95%,12%),hsl(45,95%,78%))"></span>sterk';
  if(m==='layer')return 'onderste laag<span class="barc" style="background:linear-gradient(90deg,hsl(0,85%,55%),hsl(120,85%,55%),hsl(240,85%,55%),hsl(300,85%,55%))"></span>bovenste';
  return SRCNAME.map((n,i)=>'<span><i style="background:'+SRCCOL[i]+'"></i>'+n+'</span>').join('');}
function metrics(){
  const st=STAT,L=st.L,rows=[],pps=st.N*S.freq;
  rows.push(['Stralen per scan',st.N.toLocaleString('nl-BE')]);
  rows.push(['Stralen per seconde',pps.toLocaleString('nl-BE')]);
  rows.push(['Gemeten punten (laatste scan)',st.n.toLocaleString('nl-BE')]);
  rows.push(['Geblokkeerd door eigen wagen',nl(100*st.blocked/st.N,1)+' %',st.blocked/st.N>0.05?'w':'']);
  rows.push(['Horizontale puntafstand op 10 m',nl(10*S.hres*D2R*100,1)+' cm']);
  rows.push(['Horizontale puntafstand op 100 m',nl(100*S.hres*D2R*100,0)+' cm']);
  if(L>1){const dv=S.vfov/(L-1),g=20*Math.tan(dv*D2R),g2=100*Math.tan(dv*D2R);rows.push(['Hoek tussen lagen',nl(dv,2)+'°']);rows.push(['Afstand tussen lagen op 20 m',nl(g,2)+' m',g>0.5?'w':'']);rows.push(['Afstand tussen lagen op 100 m',nl(g2,2)+' m',g2>0.5?'w':'']);}
  else rows.push(['Lagen','1 — enkel het vlak op '+nl(S.mountH,2)+' m','w']);
  const elMin=S.vcenter-(L>1?S.vfov/2:0)+S.err.pitch;
  rows.push(['Eerste grondpunt vooraan',elMin<0?nl(S.mountH/Math.tan(-elMin*D2R),1)+' m voor de sensor':'grond nooit gezien',elMin<0?'':'r']);
  const rw=effRange(0.8),rb=effRange(0.05);
  rows.push(['Bereik wit object (80 %)',nl(rw,0)+' m']);rows.push(['Bereik zwart object (5 %)',nl(rb,0)+' m',rb<S.rmax*0.5?'w':'']);
  const v=S.speed,stop=v*1+v*v/(2*7);rows.push(['Stopafstand bij '+Math.round(v*3.6)+' km/h (1 s + 7 m/s²)',nl(stop,0)+' m',stop>rb?'w':'']);
  if(S.type==='rot')rows.push(['Verplaatsing tijdens 1 scan',driving?nl(S.speed/S.freq,2)+' m':'stilstand',driving&&S.speed/S.freq>0.3&&!S.deskew?'w':'']);
  if(S.err.yaw)rows.push(['Zijdelingse fout op 30 m (yaw)',nl(30*Math.tan(Math.abs(S.err.yaw)*D2R),2)+' m','w']);
  if(S.err.pitch)rows.push(['Hoogtefout op 20 m (pitch)',nl(20*Math.tan(Math.abs(S.err.pitch)*D2R),2)+' m','w']);
  $('metrics').innerHTML='<table>'+rows.map(r=>'<tr><td class="lbl">'+r[0]+'</td><td><b class="'+(r[2]||'')+'">'+r[1]+'</b></td></tr>').join('')+'</table>';
  let t='<table>';const done=new Set();
  for(const o of W.objs){if(!o.key||done.has(o.name))continue;done.add(o.name);const n=st.cnt.get(o.name)||0;
    const cls=n===0?'no':n<5?'lo':'ok',lab=n===0?'niet gezien':n<5?'zwak':'gezien';
    t+='<tr><td class="lbl">'+o.name+'</td><td>'+n+' <span class="pill '+cls+'">'+lab+'</span></td></tr>';}
  $('objtab').innerHTML=t+'</table>';
  const cl=n=>n===0?'r':n<5?'w':'g',sx=S.vx+mountX(),sy0=S.vy;
  const items=W.hud.map(([name,lab])=>{const o=W.objs.find(q=>q.name===name);const n=st.cnt.get(name)||0;const d=o&&o.hx!==undefined?Math.hypot(o.hx+o.dx-sx,o.hy-sy0):0;
    return lab+' ('+nl(d,0)+' m): <span class="'+cl(n)+'">'+n+'</span>';});
  const hud=(S.type==='rot'?'roterend':'solid-state')+' · '+S.layers+' lagen · '+S.hfov+'° · '+String(S.hres).replace('.',',')+'° · '+S.freq+' Hz\n'+
    pps.toLocaleString('nl-BE')+' stralen/s · '+st.n.toLocaleString('nl-BE')+' punten'+(driving?' · '+Math.round(S.speed*3.6)+' km/h':'')+(driving&&S.type==='rot'&&effHz>0&&effHz<S.freq*0.9?' · <span class="w">pc haalt '+nl(effHz,0)+' van '+S.freq+' Hz</span>':'')+'\n'+items.join(' · ');
  $('hud').innerHTML=hud;
  $('pcvHead').innerHTML='<b>PUNTENWOLK</b>  /points · '+st.n.toLocaleString('nl-BE')+' punten · '+S.freq+' Hz\nringen 10 · 20 · 30 · 50 · 100 m';
  const lg=legendHtml();$('legend').innerHTML=lg;$('pcvLeg').innerHTML=lg;
}
