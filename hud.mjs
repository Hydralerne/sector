import {MAP,cores,exit} from './world.mjs';
/** HUD reads simulation state; it never changes gameplay. */
export function createHUD(){
  const $=id=>document.getElementById(id),map=$('map').getContext('2d');
  function dot(x,z,color,radius=3){map.fillStyle=color;map.beginPath();map.arc(x*12,z*12,radius,0,Math.PI*2);map.fill();}
  return {render({player:p,drones,sprinting},yaw,{damaged,notice}){
    $('hp').textContent=Math.ceil(p.hp)+'%';$('health').style.width=p.hp+'%';
    $('stamina').style.width=p.stamina+'%';$('count').textContent=String(p.collected.size).padStart(2,'0')+' / 03';
    const alerted=drones.some(d=>d.alert);
    $('threat').textContent=alerted?'DETECTED · EVADE SECURITY':sprinting?'SPRINTING · HIGH SIGNATURE':'LOW SIGNATURE';
    $('threat').classList.toggle('danger',alerted);
    $('timer').textContent=String(Math.floor(p.time/60)).padStart(2,'0')+':'+String(Math.floor(p.time%60)).padStart(2,'0');
    $('hint').textContent=p.collected.size===3?'All cores secured. Proceed to the green extraction beacon.':'Recover reactor cores. Break line of sight to evade drones.';
    $('notice').textContent=notice;$('notice').style.opacity=notice?'1':'0';
    $('flash').style.opacity=damaged?'.6':'0';
    map.clearRect(0,0,180,168);
    for(let z=0;z<MAP.length;z++)for(let x=0;x<MAP[z].length;x++){
      map.fillStyle=MAP[z][x]==='#'?'#394044':'#11191c';map.fillRect(x*12,z*12,11,11);
    }
    cores.forEach((c,i)=>{if(!p.collected.has(i))dot(c.x,c.z,'#e8b55b');});
    dot(exit.x,exit.z,p.collected.size===3?'#91d0a7':'#476652',4);
    drones.forEach(d=>dot(d.x,d.z,d.alert?'#ff654f':'#b48372'));
    dot(p.x,p.z,'#f3f2de');map.strokeStyle='#f3f2de';map.beginPath();map.moveTo(p.x*12,p.z*12);map.lineTo((p.x+Math.sin(yaw)*.8)*12,(p.z+Math.cos(yaw)*.8)*12);map.stroke();
  }};
}
