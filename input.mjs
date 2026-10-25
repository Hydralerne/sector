/** Browser input owns held sources and pointer lock; game owns pause state. */
export function createInput(canvas,{isActive,onPause,onRestart}){
  const keys=new Set(),pointers=new Map(),mouse=new Set(),edges=new Set();
  let yaw=.45,pitch=0,thirdPerson=false;
  const held=key=>keys.has(key)||mouse.has(key)||[...pointers.values()].some(source=>source.key===key);
  const clear=()=>{keys.clear();pointers.clear();mouse.clear();edges.clear();};
  function press(key){if(key==='v')thirdPerson=!thirdPerson;else if(key==='r'||key==='e')edges.add(key);}
  function pause(){clear();onPause();}
  function requestLock(){if(!matchMedia('(pointer:coarse)').matches)try{canvas.requestPointerLock?.()?.catch(()=>{});}catch{}}
  addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
    if(key==='escape'){if(!e.repeat)pause();return;}
    if(key==='n'){if(!e.repeat){clear();onRestart();}return;}
    if(isActive()){if(!e.repeat&&!held(key))press(key);keys.add(key);}
  });
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  addEventListener('blur',pause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  document.addEventListener('pointerlockchange',()=>{mouse.clear();if(document.pointerLockElement!==canvas&&isActive())pause();});
  addEventListener('mousemove',e=>{if(isActive()&&document.pointerLockElement===canvas){yaw+=e.movementX*.0022;pitch=Math.max(-1.1,Math.min(1.1,pitch-e.movementY*.0022));}});
  canvas.addEventListener('mousedown',e=>{
    if(!isActive())return;
    if(document.pointerLockElement!==canvas){if(e.button===0)requestLock();return;}
    if(e.button===0)mouse.add('f');if(e.button===2){e.preventDefault();mouse.add('q');}
  });
  addEventListener('mouseup',e=>{if(e.button===0)mouse.delete('f');if(e.button===2)mouse.delete('q');});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  for(const button of document.querySelectorAll('[data-key]')){
    button.onpointerdown=e=>{
      e.preventDefault();button.setPointerCapture(e.pointerId);
      if(isActive()){const key=button.dataset.key.toLowerCase();if(!held(key))press(key);pointers.set(e.pointerId,{button,key});}
    };
    button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>{
      if(e?.pointerId!==undefined)pointers.delete(e.pointerId);
      else for(const [id,source] of pointers)if(source.button===button)pointers.delete(id);
    };
    button.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&isActive()){
      e.preventDefault();const key=button.dataset.key.toLowerCase();
      if(!e.repeat&&!held(key))press(key);pointers.set(button,{button,key});
    }};
    button.onkeyup=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pointers.delete(button);}};
    button.onblur=()=>pointers.delete(button);
  }
  return {clear,requestLock,reset(){clear();yaw=.45;pitch=0;thirdPerson=false;},sample(dt){
    if(!isActive())clear();
    yaw+=((held('arrowright')?1:0)-(held('arrowleft')?1:0))*dt*1.9;
    const control={yaw,pitch,forward:Number(held('w')||held('arrowup'))-Number(held('s')||held('arrowdown')),strafe:Number(held('d'))-Number(held('a')),sprint:held('shift'),fire:held('f'),aim:held('q'),reload:edges.has('r'),interact:edges.has('e'),thirdPerson};
    edges.clear();return control;
  }};
}
