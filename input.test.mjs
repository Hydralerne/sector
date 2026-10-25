import test from 'node:test';
import assert from 'node:assert/strict';
import {createInput} from './input.mjs';
import {createSession, tick} from './simulation.mjs';

test('first-person boot and reset; V toggles once and pause preserves view',()=>{
  const listeners={},buttons=[];
  const previous=Object.fromEntries(['addEventListener','document','matchMedia'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  globalThis.addEventListener=(name,fn)=>{listeners[name]=fn;};
  globalThis.matchMedia=()=>({matches:false});
  globalThis.document={addEventListener(){},querySelectorAll:()=>buttons,pointerLockElement:null};
  try {
    let active=true,pauses=0;
    const input=createInput({addEventListener(){}},{isActive:()=>active,onPause(){pauses++;},onRestart(){input.reset();}});
    const down=(key,repeat=false)=>listeners.keydown({key,repeat,preventDefault(){}});
    const up=key=>listeners.keyup({key});
    assert.equal(input.sample(0).thirdPerson,false);
    down('v');assert.equal(input.sample(0).thirdPerson,true);
    down('v',true);assert.equal(input.sample(0).thirdPerson,true);
    up('v');down('Escape');assert.equal(pauses,1);
    assert.equal(input.sample(0).thirdPerson,true);
    active=false;down('v');assert.equal(input.sample(0).thirdPerson,true);
    active=true;up('v');down('v');assert.equal(input.sample(0).thirdPerson,false);
    up('v');down('v');assert.equal(input.sample(0).thirdPerson,true);
    down('n');assert.equal(input.sample(0).thirdPerson,false);
    input.reset();assert.equal(input.sample(0).thirdPerson,false);
  } finally {
    for(const [key,descriptor] of Object.entries(previous)) {
      if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
    }
  }
});

test('new session and omitted camera input are first person; explicit opt-in works',()=>{
  const session=createSession();
  assert.equal(session.thirdPerson,false);
  tick(session,{thirdPerson:true},.01);assert.equal(session.thirdPerson,true);
  tick(session,{},.01);assert.equal(session.thirdPerson,false);
  assert.equal(createSession().thirdPerson,false);
});
