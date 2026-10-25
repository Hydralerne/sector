import {MAP,cores,exit,stations} from './world.mjs';
/** HUD reads simulation state; it never changes gameplay. */
export function createHUD(){
  const $=id=>document.getElementById(id),canvas=$('map'),map=canvas.getContext('2d');
  const scale=Math.min(canvas.width/Math.max(...MAP.map(row=>row.length)),canvas.height/MAP.length);
  const ox=(canvas.width-Math.max(...MAP.map(row=>row.length))*scale)/2,oz=(canvas.height-MAP.length*scale)/2;
  function dot(x,z,color,radius=2){map.fillStyle=color;map.beginPath();map.arc(ox+x*scale,oz+z*scale,radius,0,Math.PI*2);map.fill();}
  const stationName={med:'MEDICAL',ammo:'AMMO',terminal:'SUPPLY TERMINAL'};
  return {render({player:p,drones,sprinting,thirdPerson=true},yaw,{damaged=false,notice=''}={}){
    $('hp').textContent=Math.ceil(p.hp)+'%';$('health').style.width=p.hp+'%';
    $('stamina').style.width=p.stamina+'%';$('count').textContent=String(p.collected.size).padStart(2,'0')+' / '+String(cores.length).padStart(2,'0');
    $('ammo').textContent=String(p.ammo??12).padStart(2,'0')+' / '+(p.reserve??72);
    $('reload').textContent=p.reloading>0?'RELOADING · '+p.reloading.toFixed(1)+'s':p.ammo===0?'EMPTY · R TO RELOAD':'SIDEARM · R RELOAD';
    $('kills').textContent=String(p.kills??0).padStart(2,'0');
    $('camera-mode').textContent=thirdPerson?'THIRD PERSON · V':'FIRST PERSON · V';
    const live=drones.filter(d=>d.hp===undefined||d.hp>0),alerted=live.some(d=>d.alert);
    $('threat').textContent=alerted?'DETECTED · ENGAGE OR EVADE':sprinting?'SPRINTING · HIGH SIGNATURE':'LOW SIGNATURE';
    $('threat').classList.toggle('danger',alerted);
    $('timer').textContent=String(Math.floor(p.time/60)).padStart(2,'0')+':'+String(Math.floor(p.time%60)).padStart(2,'0');
    const secured=p.collected.size>=cores.length;
    $('hint').textContent=secured?'All cores secured. Reach the green extraction beacon.':'Recover reactor cores. Use cover and watch your ammunition.';
    const near=stations.find(s=>!p.stationUsed?.has(s.id)&&Math.hypot(s.x-p.x,s.z-p.z)<1.05);
    $('context').textContent=near?'E · USE '+stationName[near.type]+' · SINGLE USE':'';
    const message=p.messageTime>0?p.message:notice;
    $('notice').textContent=message||'';$('notice').style.opacity=message?'1':'0';
    $('flash').style.opacity=damaged?'.6':'0';
    map.clearRect(0,0,canvas.width,canvas.height);
    for(let z=0;z<MAP.length;z++)for(let x=0;x<MAP[z].length;x++){
      map.fillStyle=MAP[z][x]==='#'?'#394044':'#11191c';map.fillRect(ox+x*scale,oz+z*scale,Math.max(1,scale-.5),Math.max(1,scale-.5));
    }
    stations.forEach(s=>{if(!p.stationUsed?.has(s.id)){
      map.fillStyle=s.type==='med'?'#8edabc':s.type==='ammo'?'#9fc8ed':'#c6a7ed';map.fillRect(ox+s.x*scale-2,oz+s.z*scale-2,4,4);
    }});
    cores.forEach((c,i)=>{if(!p.collected.has(i))dot(c.x,c.z,'#e8b55b');});
    dot(exit.x,exit.z,secured?'#91d0a7':'#476652',3);
    live.forEach(d=>dot(d.x,d.z,d.alert?'#ff654f':'#b48372',1.8));
    dot(p.x,p.z,'#f3f2de',2.5);map.strokeStyle='#f3f2de';map.beginPath();map.moveTo(ox+p.x*scale,oz+p.z*scale);map.lineTo(ox+(p.x+Math.sin(yaw)*1.2)*scale,oz+(p.z+Math.cos(yaw)*1.2)*scale);map.stroke();
  }};
}
