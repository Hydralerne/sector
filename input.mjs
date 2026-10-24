/** Browser input owns held keys and pointer-lock lifecycle; game owns pause state. */
export function createInput(canvas,{isActive,onPause,onRestart}){
  const keys=new Set(), pointers=new Map();let yaw=.45,pitch=0;
  const held=key=>keys.has(key)||[...pointers.values()].some(source=>source.key===key);
  const clear=()=>{keys.clear();pointers.clear();};
  function requestLock(){if(!matchMedia('(pointer:coarse)').matches)try{canvas.requestPointerLock?.()?.catch(()=>{});}catch{}}
  addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
    if(e.repeat&&(key==='escape'||key==='r'))return;
    if(key==='escape'){onPause();return;}
    if(key==='r'){onRestart();return;}
    if(isActive())keys.add(key);
  });
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  addEventListener('blur',()=>{clear();onPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();onPause();}});
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&isActive())onPause();});
  addEventListener('mousemove',e=>{if(isActive()&&document.pointerLockElement===canvas){yaw+=e.movementX*.0022;pitch=Math.max(-1.1,Math.min(1.1,pitch-e.movementY*.0022));}});
  canvas.onclick=()=>{if(isActive())requestLock();};
  for(const button of document.querySelectorAll('[data-key]')){
    button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(isActive())pointers.set(e.pointerId,{button,key:button.dataset.key.toLowerCase()});};
    button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>{
      if(e?.pointerId!==undefined)pointers.delete(e.pointerId);
      else for(const [id,source] of pointers)if(source.button===button)pointers.delete(id);
    };
  }
  return {clear,requestLock,reset(){clear();yaw=.45;pitch=0;},sample(dt){
    yaw+=((held('arrowright')?1:0)-(held('arrowleft')?1:0))*dt*1.9;
    return {yaw,pitch,forward:Number(held('w')||held('arrowup'))-Number(held('s')||held('arrowdown')),strafe:Number(held('d'))-Number(held('a')),sprint:held('shift')};
  }};
}
