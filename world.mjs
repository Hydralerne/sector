/** Collision and mission layout. One tile is one metre; # is solid steel. */
const ENTRY = [
'###############',
'#S....#.......#',
'#.##..#.###.#.#',
'#..C....#...#.#',
'#.####..#.#...#',
'#....#....#.#.#',
'###..#.##.#.#.#',
'#....#......#.#',
'#.##...####...#',
'#..#.#......#.#',
'#....#.####.#.#',
'#.##......#...#',
'#....##.#.....#',
'###############'];
function buildMap(){
  const grid=Array.from({length:27},(_,z)=>Array.from({length:29},(_,x)=>x===0||x===28||z===0||z===26?'#':'.'));
  ENTRY.forEach((row,z)=>[...row].forEach((tile,x)=>{grid[z][x]=tile;}));
  // Connect the maintenance maze to the broad reactor hall and lower cargo wing.
  for(const z of [5,11])grid[z][14]='.';
  for(const x of [4,11])grid[13][x]='.';
  // Open rooms with columns and deliberate doorways, not another tight maze.
  for(let z=1;z<14;z++)if(![5,6,11].includes(z))grid[z][23]='#';
  for(let x=15;x<28;x++)if(![18,19,25].includes(x))grid[13][x]='#';
  for(let z=14;z<26;z++)if(![17,18,23].includes(z))grid[z][14]='#';
  for(let x=1;x<28;x++)if(![4,5,11,18,19,25].includes(x))grid[20][x]='#';
  for(const [x,z] of [[18,3],[18,8],[26,8],[4,16],[9,17],[19,16],[24,17],[7,23],[18,23]])grid[z][x]='#';
  grid[7][21]='C';grid[23][22]='C';grid[24][26]='E';
  return grid.map(row=>row.join(''));
}
export const MAP=buildMap();
export const cores=MAP.flatMap((r,z)=>[...r].flatMap((c,x)=>c==='C'?[{x:x+.5,z:z+.5}]:[]));
export const exit={x:26.5,z:24.5};
export const stations=[
  {id:'entry-ammo',type:'ammo',x:4.5,z:1.5},
  {id:'med-bay',type:'med',x:9.5,z:11.5},
  {id:'reactor-control',type:'terminal',x:25.5,z:3.5},
  {id:'cargo-ammo',type:'ammo',x:5.5,z:18.5},
  {id:'cargo-med',type:'med',x:17.5,z:24.5}
];
export function wall(x,z){return !Number.isFinite(x)||!Number.isFinite(z)||!MAP[Math.floor(z)]||!MAP[Math.floor(z)][Math.floor(x)]||MAP[Math.floor(z)][Math.floor(x)]==='#';}
export function canMove(x,z){const r=.19;return ![[x-r,z-r],[x+r,z-r],[x-r,z+r],[x+r,z+r]].some(([a,b])=>wall(a,b));}
export function move(p,dx,dz){if(canMove(p.x+dx,p.z))p.x+=dx;if(canMove(p.x,p.z+dz))p.z+=dz;}
export function fresh(){return {x:1.5,z:1.5,hp:100,collected:new Set(),time:0,status:'playing'};}
export function interact(p,dt,drones){
  if(p.status!=='playing')return;
  p.time+=dt;
  cores.forEach((c,i)=>{if(Math.hypot(p.x-c.x,p.z-c.z)<.65)p.collected.add(i);});
  const danger=drones.some(d=>d.hp!==0&&Math.hypot(p.x-d.x,p.z-d.z)<.7);
  p.hp=Math.max(0,p.hp-(danger?32*dt:0));
  if(p.hp<=0)p.status='lost';
  else if(p.collected.size===cores.length&&Math.hypot(p.x-exit.x,p.z-exit.z)<.8)p.status='won';
}
