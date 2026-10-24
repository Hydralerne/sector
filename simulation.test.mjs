import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession,tick,lineOfSight} from './simulation.mjs';
import {canMove,cores,exit} from './world.mjs';
const input={yaw:0,forward:1};
test('line of sight is blocked by steel walls',()=>{
  assert.equal(lineOfSight({x:1.5,z:1.5},{x:1.5,z:5.5}),true);
  assert.equal(lineOfSight({x:1.5,z:2.5},{x:4.5,z:2.5}),false);
});
test('stamina depletes on sprint and recharges on rest',()=>{
  const s=createSession();s.drones=[];
  for(let i=0;i<80;i++)tick(s,{...input,sprint:true},.04);
  assert.ok(s.player.stamina<20);const low=s.player.stamina;
  for(let i=0;i<80;i++)tick(s,{},.04);
  assert.ok(s.player.stamina>low);assert.ok(s.player.stamina<=100);
});
test('normalized diagonal movement does not exceed forward speed',()=>{
  const a=createSession(),b=createSession();a.drones=[];b.drones=[];
  tick(a,{forward:1,yaw:0},.1);tick(b,{forward:1,strafe:1,yaw:0},.1);
  assert.ok(Math.abs(Math.hypot(a.player.x-1.5,a.player.z-1.5)-Math.hypot(b.player.x-1.5,b.player.z-1.5))<1e-8);
});
test('patrols stay in walkable space and never damage through walls',()=>{
  const s=createSession();s.player.x=6.5;s.player.z=1.5;
  for(let i=0;i<3000;i++)tick(s,{},.04);
  assert.ok(s.drones.every(d=>canMove(d.x,d.z)));assert.equal(s.player.hp,100);
});
test('drones detect nearby player and lose tracking behind walls',()=>{
  const s=createSession();s.player.x=2.5;s.player.z=5.5;tick(s,{},.1);assert.equal(s.drones[0].alert,true);
  s.player.x=1.5;s.player.z=1.5;
  for(let i=0;i<60;i++)tick(s,{},.04);
  assert.equal(s.drones[0].alert,false);
});
test('ended session freezes; new sessions do not share state',()=>{
  const s=createSession();s.player.status='won';const before=structuredClone(s);tick(s,input,.1);
  assert.deepEqual(s,before);assert.notEqual(createSession().drones[0],s.drones[0]);
});
test('objective collection and extraction still work through simulation',()=>{
  const s=createSession();s.drones=[];
  for(const c of cores){Object.assign(s.player,c);tick(s,{},.02);}
  Object.assign(s.player,exit);tick(s,{},.02);assert.equal(s.player.status,'won');
});
test('invalid delta is ignored and huge delta is capped',()=>{
  const s=createSession();tick(s,input,NaN);assert.equal(s.player.time,0);
  tick(s,{},100);assert.ok(s.player.time<=.250001);
});
