import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraFor, CAMERA_RADIUS } from './camera.mjs';
import * as world from './world.mjs';
import { buildActors, createRenderer } from './renderer.mjs';

const open=world.MAP.flatMap((row,z)=>[...row].flatMap((tile,x)=>tile==='#'?[]:[{x:x+.5,z:z+.5}]));
const safe=(x,z)=>[-CAMERA_RADIUS,CAMERA_RADIUS].every(dx=>[-CAMERA_RADIUS,CAMERA_RADIUS].every(dz=>!world.wall(x+dx,z+dz)));

test('first person eye is exact and stateless',()=>{
  const p=open[0];
  assert.deepEqual(cameraFor(p,1,.8,false,true),{...p,y:.72});
  assert.deepEqual(cameraFor(p),{...p,y:.72});
});

test('shoulder sweep stays in the same unobstructed region at every yaw and pitch',()=>{
  let clipped=0,full=0;
  for(const p of open) for(const yaw of [0,.4,1.57,2.4,Math.PI,4.3,5.6]) for(const pitch of [-1.4,0,1.4]) {
    const camera=cameraFor(p,yaw,pitch,true);
    assert(Object.values(camera).every(Number.isFinite));
    assert(camera.y>=.15 && camera.y<=2.2);
    assert(safe(camera.x,camera.z));
    const length=Math.hypot(camera.x-p.x,camera.z-p.z);
    const desired=Math.hypot(1.4*Math.cos(pitch),.25);
    if(length<desired-.026)clipped++;else full++;
    // Independent fine-grained inspection catches wall tunneling, not only
    // collision of the final camera point.
    for(let i=0;i<=100;i++)assert(safe(p.x+(camera.x-p.x)*i/100,p.z+(camera.z-p.z)*i/100));
  }
  assert(clipped>0);assert(full>0);
});

test('unobstructed shoulder offset, aim length and height match contract',()=>{
  let checked=false;
  for(const p of open) {
    if(!Array.from({length:61},(_,i)=>safe(p.x+.25*i/60,p.z-1.4*i/60)).every(Boolean))continue;
    const camera=cameraFor(p,0,0,true),aim=cameraFor(p,0,0,true,true);
    assert(Math.abs(camera.x-p.x-.25)<1e-10);
    assert(Math.abs(camera.z-p.z+1.4)<1e-10);
    assert.equal(camera.y,.9);
    assert(Math.abs(aim.z-p.z+.8)<1e-10);
    checked=true;break;
  }
  assert(checked,'world must contain at least one camera-length open corridor');
});

const player=()=>({...open[0],collected:new Set(),stationUsed:new Set(),yaw:0,pitch:0,time:0});
function validate(data){
  assert.equal(data.length%33,0);
  assert(data.every(Number.isFinite));
  for(let i=0;i<data.length;i+=11)assert(Math.abs(Math.hypot(...data.slice(i+3,i+6))-1)<1e-6);
}

test('actors retain valid mesh normals and skip dead drones; avatar only in third person',()=>{
  const p=player(),base=buildActors({player:p,thirdPerson:false}).data;
  const dead=buildActors({player:p,drones:[{x:p.x,z:p.z,hp:0}],thirdPerson:false}).data;
  assert.deepEqual(dead,base);
  assert(buildActors({player:p,drones:[{x:p.x,z:p.z,hp:10}],thirdPerson:false}).data.length>base.length);
  assert.deepEqual(buildActors({player:p}).data,base);
  assert(buildActors({player:p,thirdPerson:true}).data.length>base.length);
  for(const yaw of [0,1,2,3]) for(const pitch of [-1,0,1]) {
    const p=player();p.reloading=1;p.shotFlash=.08;p.shotEnd={x:p.x,y:.72,z:p.z+3};
    validate(buildActors({player:p,yaw,pitch,now:1234}).data);
  }
});

test('station use changes visual state without invalidating the batch',()=>{
  if(!world.stations?.length)return;
  assert.deepEqual(new Set(world.stations.map(s=>s.type)),new Set(['med','ammo','terminal']));
  const p=player(),before=buildActors({player:p,thirdPerson:false}).data;
  p.stationUsed=new Set(world.stations.map(s=>s.id));
  const after=buildActors({player:p,thirdPerson:false}).data;
  assert.notDeepEqual(before,after);validate(after);
});

function mock() {
  let id=0,bound;const buffers=new Map(),deleted=new Set(),calls=[];
  const names=['ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','FLOAT','TRIANGLES','DEPTH_TEST','LEQUAL','BLEND','CULL_FACE','COLOR_BUFFER_BIT','DEPTH_BUFFER_BIT'];
  const gl=Object.fromEntries(names.map((v,i)=>[v,i+1]));
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','enableVertexAttribArray','enable','depthFunc','disable','clearColor','clear','useProgram','viewport'])gl[name]=()=>{};
  for(const name of ['createShader','createProgram','createBuffer'])gl[name]=()=>({id:++id});
  for(const name of ['deleteShader','deleteProgram','deleteBuffer'])gl[name]=v=>deleted.add(v);
  gl.getShaderParameter=gl.getProgramParameter=()=>true;
  gl.getUniformLocation=(_,name)=>name;
  gl.getAttribLocation=(_,name)=>['aPosition','aNormal','aColor','aSurface'].indexOf(name);
  gl.bindBuffer=(_,buffer)=>{bound=buffer;};
  gl.bufferData=(_,data,usage)=>{validate(Array.from(data));buffers.set(bound,data);calls.push(['upload',usage]);};
  gl.vertexAttribPointer=(_,size,type,normalized,stride,offset)=>{assert.equal(stride,44);assert(offset+size*4<=stride);};
  gl.drawArrays=(mode,start,count)=>{assert.equal(mode,gl.TRIANGLES);assert(count<=buffers.get(bound).length/11);calls.push(['draw',count]);};
  for(const name of ['uniform1f','uniform2f','uniform3f'])gl[name]=(key,...values)=>{assert(values.every(Number.isFinite));calls.push([key,...values]);};
  const canvas={width:0,height:0,getContext:()=>gl,getBoundingClientRect:()=>({width:800,height:600})};
  return {gl,canvas,deleted,calls};
}

test('renderer uses exact shared origin, two batched draws, one static upload and disposes',()=>{
  const m=mock(),r=createRenderer(m.canvas),p=player();
  for(const thirdPerson of [true,false])for(const aim of [true,false]) {
    const start=m.calls.length;
    r.render({player:p,yaw:.7,pitch:.3,thirdPerson,aim,now:1234});
    const frame=m.calls.slice(start),camera=cameraFor(p,.7,.3,thirdPerson,aim);
    assert.deepEqual(frame.find(c=>c[0]==='uCamera'),['uCamera',camera.x,camera.y,camera.z]);
    assert.equal(frame.filter(c=>c[0]==='draw').length,2);
  }
  assert.equal(m.calls.filter(c=>c[0]==='upload'&&c[1]===m.gl.STATIC_DRAW).length,1);
  m.gl.isContextLost=()=>true;const before=m.calls.length;r.render({player:p});assert.equal(m.calls.length,before);
  r.dispose();r.dispose();assert.equal(m.deleted.size,5);
  r.render({player:p});assert.equal(m.calls.length,before);
});
