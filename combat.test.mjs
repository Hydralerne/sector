import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession,tick} from './simulation.mjs';
import {cameraFor} from './camera.mjs';
import {fireWeapon,beginReload,updateWeapon,useStation,clearShot} from './combat.mjs';
import {stations} from './world.mjs';

for(const thirdPerson of [true,false])test(`camera-aligned shooting, kills and cooldown (${thirdPerson?'third':'first'} person)`,()=>{
  const s=createSession(),p=s.player;Object.assign(p,{x:20.5,z:5.5});
  const input={yaw:0,pitch:thirdPerson?-.12:-.015,thirdPerson,aim:true};
  const c=cameraFor(p,0,input.pitch,thirdPerson,true);
  const t=(.69-c.y)/Math.sin(input.pitch);
  assert.ok(t>0&&t<16);
  s.drones=[{x:c.x,z:c.z+Math.cos(input.pitch)*t,hp:100}];
  assert.ok(clearShot(p,s.drones[0]));
  fireWeapon(s,input);assert.equal(p.ammo,11);assert.equal(s.drones[0].hp,66);
  fireWeapon(s,input);assert.equal(p.ammo,11);
  updateWeapon(p,.2);fireWeapon(s,input);updateWeapon(p,.2);fireWeapon(s,input);
  assert.equal(s.drones[0].hp,0);assert.equal(p.kills,1);
  updateWeapon(p,.2);fireWeapon(s,input);assert.equal(p.kills,1);
});
test('walls block hits and reload transfers only available rounds',()=>{
  const s=createSession(),p=s.player;s.drones=[{x:1.5,z:4.5,hp:100}];
  fireWeapon(s,{yaw:Math.PI,pitch:0,thirdPerson:false});assert.equal(s.drones[0].hp,100);
  p.ammo=2;p.reserve=5;beginReload(p);assert.ok(p.reloading>0);
  const rounds=p.ammo;fireWeapon(s,{});assert.equal(p.ammo,rounds);
  updateWeapon(p,2);assert.equal(p.ammo,7);assert.equal(p.reserve,0);assert.equal(p.reloading,0);
});
test('stations are single-use, med is capped and terminal disables attacks temporarily',()=>{
  const s=createSession(),p=s.player;
  Object.assign(p,stations.find(x=>x.type==='med'));useStation(s);assert.equal(p.stationUsed.size,0);
  p.hp=80;useStation(s);assert.equal(p.hp,100);assert.equal(p.stationUsed.size,1);
  p.hp=70;useStation(s);assert.equal(p.hp,70);
  Object.assign(p,stations.find(x=>x.type==='ammo'));const reserve=p.reserve;useStation(s);useStation(s);assert.equal(p.reserve,reserve+36);
  Object.assign(p,stations.find(x=>x.type==='terminal'));useStation(s);assert.equal(s.securityDisabled,12);
  s.drones[0].x=p.x;s.drones[0].z=p.z;const hp=p.hp;tick(s,{},.2);assert.equal(p.hp,hp);
});
test('dead drones do not damage and reset clears combat state',()=>{
  const s=createSession();s.drones.forEach(d=>{d.hp=0;d.x=s.player.x;d.z=s.player.z;});
  tick(s,{fire:true},.2);assert.equal(s.player.hp,100);
  s.player.kills=8;s.player.stationUsed.add('x');const fresh=createSession();
  assert.equal(fresh.player.kills,0);assert.equal(fresh.player.stationUsed.size,0);assert.equal(fresh.player.ammo,12);
});
test('point-blank overlapping drone remains hittable',()=>{
  const s=createSession();s.drones=[{x:s.player.x,z:s.player.z+.1,hp:100}];
  fireWeapon(s,{yaw:0,pitch:0,thirdPerson:false});assert.equal(s.drones[0].hp,66);
});
