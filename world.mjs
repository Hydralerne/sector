export const MAP = [
'###############',
'#S....#.......#',
'#.##..#.###.#.#',
'#..C....#...#.#',
'#.####..#.#...#',
'#....#....#.#.#',
'###..#.##.#.#.#',
'#....#..C...#.#',
'#.##...####...#',
'#..#.#......#.#',
'#C...#.####.#.#',
'#.##......#...#',
'#....##.#...E.#',
'###############'];
export const cores = MAP.flatMap((r,z)=>[...r].flatMap((c,x)=>c==='C'?[{x:x+.5,z:z+.5}]:[]));
export const exit = {x:12.5,z:12.5};
export function wall(x,z){return !MAP[Math.floor(z)] || !MAP[Math.floor(z)][Math.floor(x)] || MAP[Math.floor(z)][Math.floor(x)]==='#';}
export function canMove(x,z){const r=.19; return ![[x-r,z-r],[x+r,z-r],[x-r,z+r],[x+r,z+r]].some(([a,b])=>wall(a,b));}
export function move(p,dx,dz){if(canMove(p.x+dx,p.z))p.x+=dx;if(canMove(p.x,p.z+dz))p.z+=dz;}
export function fresh(){return {x:1.5,z:1.5,hp:100,collected:new Set(),time:0,status:'playing'};}
export function interact(p,dt,drones){if(p.status!=='playing')return; p.time+=dt; cores.forEach((c,i)=>{if(Math.hypot(p.x-c.x,p.z-c.z)<.65)p.collected.add(i);}); const danger=drones.some(d=>Math.hypot(p.x-d.x,p.z-d.z)<.7); p.hp=Math.max(0,p.hp-(danger?32*dt:0));if(p.hp<=0)p.status='lost'; else if(p.collected.size===cores.length&&Math.hypot(p.x-exit.x,p.z-exit.z)<.8)p.status='won';}
