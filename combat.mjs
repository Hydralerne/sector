/** Hitscan combat uses the same camera and look vector as the renderer. */
import {wall,stations} from './world.mjs';
import {cameraFor} from './camera.mjs';
export const MAGAZINE=12;
export const RELOAD_SECONDS=1.35;
export function clearShot(a,b){
  const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(distance/.04));
  for(let i=0;i<=steps;i++)if(wall(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;
  return true;
}
export function beginReload(p){
  if(p.reloading===0&&p.ammo<MAGAZINE&&p.reserve>0)p.reloading=RELOAD_SECONDS;
}
function message(p,text){p.message=text;p.messageTime=2.5;}
export function useStation(session){
  const p=session.player;
  const station=stations.find(s=>Math.hypot(s.x-p.x,s.z-p.z)<1.05&&clearShot(p,s));
  if(!station){message(p,'NO STATION IN REACH');return;}
  if(p.stationUsed.has(station.id)){message(p,'STATION ALREADY USED');return;}
  if(station.type==='med'&&p.hp>=100){message(p,'INTEGRITY ALREADY FULL');return;}
  p.stationUsed.add(station.id);
  if(station.type==='med'){p.hp=Math.min(100,p.hp+55);message(p,'MED STATION · +55 INTEGRITY');}
  else if(station.type==='ammo'){p.reserve+=36;message(p,'SUPPLY CACHE · +36 ROUNDS');}
  else {session.securityDisabled=12;p.reserve+=24;message(p,'SECURITY OFFLINE · 12 SECONDS · +24 ROUNDS');}
}
function raySphere(origin,direction,center,radius){
  const ox=origin.x-center.x,oy=origin.y-center.y,oz=origin.z-center.z;
  const b=ox*direction.x+oy*direction.y+oz*direction.z;
  const c=ox*ox+oy*oy+oz*oz-radius*radius,disc=b*b-c;
  if(disc<0)return Infinity;
  const near=-b-Math.sqrt(disc),far=-b+Math.sqrt(disc);
  return far>=0?Math.max(0,near):Infinity;
}
export function fireWeapon(session,input){
  const p=session.player;
  if(p.fireCooldown>0||p.reloading>0)return;
  if(p.ammo<=0){beginReload(p);return;}
  p.ammo--;p.fireCooldown=.18;p.shotFlash=.075;
  const yaw=input.yaw||0,pitch=input.pitch||0;
  const origin=cameraFor(p,yaw,pitch,input.thirdPerson===true,!!input.aim);
  const direction={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:Math.cos(yaw)*Math.cos(pitch)};
  let range=16,target=null;
  // Stop at the first wall or floor/ceiling, before selecting a visible drone.
  for(let t=.025;t<=16;t+=.025){
    const y=origin.y+direction.y*t;
    if(y<.03||y>2.4||wall(origin.x+direction.x*t,origin.z+direction.z*t)){range=t;break;}
  }
  for(const d of session.drones){
    if(d.hp<=0)continue;
    const t=raySphere(origin,direction,{x:d.x,y:.69,z:d.z},.27);
    if(t<range){range=t;target=d;}
  }
  p.shotEnd={x:origin.x+direction.x*range,y:origin.y+direction.y*range,z:origin.z+direction.z*range};
  // Camera may see around a corner; the weapon must still clear the wall.
  if(!clearShot(p,p.shotEnd)){target=null;}
  if(target){
    target.hp=Math.max(0,target.hp-34);target.memory=2;target.lastSeen={x:p.x,z:p.z};
    if(target.hp===0){p.kills++;target.alert=false;message(p,'SECURITY DRONE NEUTRALIZED');}
    else message(p,'HIT CONFIRMED');
  }
}
export function updateWeapon(p,dt){
  p.fireCooldown=Math.max(0,p.fireCooldown-dt);p.shotFlash=Math.max(0,p.shotFlash-dt);
  p.messageTime=Math.max(0,p.messageTime-dt);
  if(p.reloading>0){
    p.reloading=Math.max(0,p.reloading-dt);
    if(p.reloading===0){const rounds=Math.min(MAGAZINE-p.ammo,p.reserve);p.ammo+=rounds;p.reserve-=rounds;}
  }
}
