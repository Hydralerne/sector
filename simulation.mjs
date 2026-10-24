/** Pure, deterministic simulation. No DOM, renderer or timers. Units: meters/seconds. */
import {fresh,move,interact,wall} from './world.mjs';
const ROUTES = [ [[1.5,5.5],[4.5,5.5]], [[7.5,7.5],[11.5,7.5]], [[11.5,11.5],[13.5,11.5],[13.5,12.5],[11.5,12.5]] ];
export function createSession(){
  return {player:{...fresh(),stamina:100},drones:ROUTES.map(route=>({x:route[0][0],z:route[0][1],route,target:1,alert:false,memory:0})),velocity:{x:0,z:0},sprinting:false};
}
export function lineOfSight(a,b){
  const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(distance/.08));
  for(let i=1;i<=steps;i++)if(wall(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;
  return true;
}
function updateDrones(session,dt){
  const p=session.player;
  for(const d of session.drones){
    const distance=Math.hypot(d.x-p.x,d.z-p.z);
    const visible=distance<(session.sprinting?4.6:3.1)&&lineOfSight(d,p);
    d.memory=visible?1.8:Math.max(0,d.memory-dt);
    if(visible)d.lastSeen={x:p.x,z:p.z};
    d.alert=d.memory>0;
    const destination=d.alert?d.lastSeen:{x:d.route[d.target][0],z:d.route[d.target][1]};
    const dx=destination.x-d.x,dz=destination.z-d.z,length=Math.hypot(dx,dz);
    if(length<.12&&!d.alert)d.target=(d.target+1)%d.route.length;
    if(length>.08){const step=Math.min(length,(d.alert?1.35:.65)*dt);move(d,dx/length*step,dz/length*step);}
  }
}
export function tick(session,input,dt){
  if(session.player.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  // Small substeps prevent tunneling and keep large test/game deltas bounded.
  let remaining=Math.min(dt,.25);
  while(remaining>1e-8){const step=Math.min(remaining,1/120);advance(session,input,step);remaining-=step;}
}
function advance(session,input,dt){
  const p=session.player;if(p.status!=='playing')return;
  const forward=input.forward||0,strafe=input.strafe||0,length=Math.hypot(forward,strafe);
  session.sprinting=!!input.sprint&&length>0&&p.stamina>1;
  const speed=session.sprinting?2.9:1.65;
  p.stamina=Math.max(0,Math.min(100,p.stamina+(session.sprinting?-27:17)*dt));
  const scale=speed/Math.max(1,length),yaw=input.yaw||0;
  const desiredX=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*scale;
  const desiredZ=(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*scale;
  const blend=1-Math.exp(-14*dt);
  session.velocity.x+=(desiredX-session.velocity.x)*blend;
  session.velocity.z+=(desiredZ-session.velocity.z)*blend;
  move(p,session.velocity.x*dt,session.velocity.z*dt);
  updateDrones(session,dt);
  // Drones cannot damage through walls, even when separated by less than a meter.
  interact(p,dt,session.drones.filter(d=>lineOfSight(d,p)));
}
