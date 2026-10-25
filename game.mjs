import {createRenderer} from './renderer.mjs';
import {createSession,tick,lineOfSight} from './simulation.mjs';
import {createInput} from './input.mjs';
import {createHUD} from './hud.mjs';
import {cores} from './world.mjs';

const $=id=>document.getElementById(id),canvas=$('view');
let renderer;
try{renderer=createRenderer(canvas);}catch(error){
  $('message').textContent='3D initialization failed. Enable WebGL / hardware acceleration and reload.';
  $('start').disabled=true;console.error(error);
}
if(renderer){
  let session=createSession(),active=false,started=false,last=0,lastCores=0,lastHP=100,noticeUntil=0,notice='';
  const hud=createHUD();
  const input=createInput(canvas,{isActive:()=>active,onPause:pause,onRestart:restart});
  function overlay(message,label){
    active=false;input.clear();session.velocity={x:0,z:0};
    document.exitPointerLock?.();$('overlay').style.display='flex';
    $('message').textContent=message;$('start').textContent=label+' ↗';
  }
  function pause(){if(active)overlay('Mission paused. Your progress is held for this session.','RESUME MISSION');}
  function restart(){if(!started)return;session=createSession();input.reset();lastCores=0;lastHP=100;noticeUntil=0;overlay('New run ready. Recover the reactor cores. Break line of sight to evade security.','DEPLOY AGAIN');}
  $('pause').onclick=pause;
  $('start').onclick=()=>{
    if(session.player.status!=='playing')restart();
    started=true;active=true;input.clear();$('overlay').style.display='none';input.requestLock();
  };
  function frame(now){
    const dt=Math.min((now-last)/1000||0,.04);last=now;
    const control=input.sample(active?dt:0);
    if(active){
      tick(session,control,dt);
      const p=session.player;
      if(p.collected.size>lastCores){notice='CORE SECURED · '+p.collected.size+' / '+cores.length;noticeUntil=now+3000;lastCores=p.collected.size;}
      if(p.hp<lastHP-.01){notice='DAMAGE · BREAK LINE OF SIGHT';noticeUntil=now+900;}lastHP=p.hp;
      if(p.status==='won')overlay(`Extraction successful. All cores secured in ${p.time.toFixed(1)} seconds. Integrity ${Math.ceil(p.hp)}%.`,'PLAY AGAIN');
      if(p.status==='lost')overlay('Suit integrity lost. Use corners to break line of sight. Sprinting attracts drones from farther away.','RETRY MISSION');
    }
    renderer.render({player:session.player,...control,drones:session.drones,now,active});
    const damaged=active&&session.drones.some(d=>d.hp>0&&Math.hypot(d.x-session.player.x,d.z-session.player.z)<.7&&lineOfSight(d,session.player));
    hud.render(session,control.yaw,{damaged,notice:session.player.messageTime>0?session.player.message:(now<noticeUntil?notice:'')});
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
