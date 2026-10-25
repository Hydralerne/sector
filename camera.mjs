import { wall } from './world.mjs';

// Stateless and shared by rendering and hitscan: never add render-only bob or
// smoothing to this origin. Positive yaw turns toward +X; positive pitch looks up.
export const CAMERA_RADIUS = .10;
const clampHeight = y => Math.max(.15, Math.min(2.2, y));
function clear(x,z) {
  // Circumscribed square protects the near plane even at diagonal corners.
  return !wall(x,z) && !wall(x-CAMERA_RADIUS,z-CAMERA_RADIUS)
    && !wall(x+CAMERA_RADIUS,z-CAMERA_RADIUS)
    && !wall(x-CAMERA_RADIUS,z+CAMERA_RADIUS)
    && !wall(x+CAMERA_RADIUS,z+CAMERA_RADIUS);
}

export function cameraFor(player,yaw=0,pitch=0,thirdPerson=false,aim=false) {
  if (!thirdPerson) return {x:player.x,y:.72,z:player.z};
  const distance=aim?.8:1.4, side=.25;
  const anchor={x:player.x,y:.9,z:player.z};
  const target={
    x:anchor.x-Math.sin(yaw)*Math.cos(pitch)*distance+Math.cos(yaw)*side,
    y:clampHeight(anchor.y-Math.sin(pitch)*distance),
    z:anchor.z-Math.cos(yaw)*Math.cos(pitch)*distance-Math.sin(yaw)*side
  };
  // Sweep the whole boom, not merely its endpoint: cannot tunnel across a wall
  // into the next room. Return last safe sample; no temporal state or ray drift.
  const steps=Math.ceil(Math.hypot(target.x-anchor.x,target.z-anchor.z)/.025);
  let result=anchor;
  for(let i=1;i<=steps;i++) {
    const t=i/steps, x=anchor.x+(target.x-anchor.x)*t, z=anchor.z+(target.z-anchor.z)*t;
    if(!clear(x,z)) break;
    result={x,y:clampHeight(anchor.y+(target.y-anchor.y)*t),z};
  }
  return result;
}
