/** Deterministic simulation, metres/seconds. No DOM, renderer or timers. */
import {fresh,move,interact} from './world.mjs';
import {clearShot,beginReload,useStation,fireWeapon,updateWeapon} from './combat.mjs';
const ROUTES=[
  [[1.5,5.5],[4.5,5.5]],
  [[7.5,7.5],[11.5,7.5]],
  [[11.5,11.5],[13.5,11.5],[13.5,12.5],[11.5,12.5]],
  [[16.5,5.5],[21.5,5.5]],
  [[25.5,5.5],[26.5,11.5]],
  [[3.5,15.5],[11.5,15.5]],
  [[16.5,18.5],[25.5,18.5]],
  [[20.5,24.5],[26.5,24.5]]
];
export function createSession(){
  return {player:{...fresh(),stamina:100,yaw:.45,pitch:0,ammo:12,reserve:72,reloading:0,fireCooldown:0,shotFlash:0,shotEnd:null,kills:0,stationUsed:new Set(),message:'',messageTime:0},
    drones:ROUTES.map(route=>({x:route[0][0],z:route[0][1],route,target:1,hp:100,alert:false,memory:0,attackCooldown:1.4})),
    velocity:{x:0,z:0},sprinting:false,securityDisabled:0,thirdPerson:false};
}
export const lineOfSight=clearShot;
function updateDrones(session,dt){
  const p=session.player;
  for(const d of session.drones){
    if(d.hp<=0){d.alert=false;continue;}
    if(session.securityDisabled>0){d.alert=false;d.memory=0;continue;}
    const distance=Math.hypot(d.x-p.x,d.z-p.z);
    const visible=distance<(session.sprinting?4.6:3.1)&&lineOfSight(d,p);
    d.memory=visible?1.8:Math.max(0,d.memory-dt);
    if(visible)d.lastSeen={x:p.x,z:p.z};
    d.alert=d.memory>0;
    const destination=d.alert&&d.lastSeen?d.lastSeen:{x:d.route[d.target][0],z:d.route[d.target][1]};
    const dx=destination.x-d.x,dz=destination.z-d.z,length=Math.hypot(dx,dz);
    if(length<.12&&!d.alert)d.target=(d.target+1)%d.route.length;
    if(length>.08){const step=Math.min(length,(d.alert?1.35:.65)*dt);move(d,dx/length*step,dz/length*step);}
    // Security fire is telegraphed by the red alert optic before damage.
    d.attackCooldown=Math.max(0,d.attackCooldown-dt);
    if(visible&&distance<3&&d.attackCooldown===0){p.hp=Math.max(0,p.hp-7);d.attackCooldown=1.4;}
  }
}
export function tick(session,input={},dt){
  if(session.player.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  // Edge actions execute once per frame, not once per substep.
  if(input.reload)beginReload(session.player);
  if(input.interact)useStation(session);
  session.thirdPerson=input.thirdPerson===true;
  let remaining=Math.min(dt,.25);
  while(remaining>1e-8){const step=Math.min(remaining,1/120);advance(session,input,step);remaining-=step;}
}
function advance(session,input,dt){
  const p=session.player;if(p.status!=='playing')return;
  p.yaw=input.yaw||0;p.pitch=input.pitch||0;
  updateWeapon(p,dt);
  session.securityDisabled=Math.max(0,session.securityDisabled-dt);
  const forward=input.forward||0,strafe=input.strafe||0,length=Math.hypot(forward,strafe);
  session.sprinting=!!input.sprint&&!input.aim&&!input.fire&&length>0&&p.stamina>1;
  const speed=session.sprinting?2.9:input.aim?1:1.65;
  p.stamina=Math.max(0,Math.min(100,p.stamina+(session.sprinting?-27:17)*dt));
  const scale=speed/Math.max(1,length),yaw=p.yaw;
  const desiredX=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*scale;
  const desiredZ=(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*scale;
  const blend=1-Math.exp(-14*dt);
  session.velocity.x+=(desiredX-session.velocity.x)*blend;
  session.velocity.z+=(desiredZ-session.velocity.z)*blend;
  move(p,session.velocity.x*dt,session.velocity.z*dt);
  if(input.fire)fireWeapon(session,input);
  updateDrones(session,dt);
  interact(p,dt,session.securityDisabled>0?[]:session.drones.filter(d=>d.hp>0&&lineOfSight(d,p)));
}
