import * as world from './world.mjs';
import { cameraFor } from './camera.mjs';
const { MAP, cores, exit } = world;

// Dependency-free WebGL 1 renderer. World units, yaw direction and eye height
// match game.mjs. All scenery is visual: world.mjs remains collision authority.
const VERTEX = `
precision mediump float;
attribute vec3 aPosition, aNormal, aColor;
attribute vec2 aSurface;
uniform vec3 uCamera;
uniform vec2 uLook;
uniform float uAspect;
varying vec3 vWorld, vNormal, vColor;
varying vec2 vSurface;
void main() {
  vWorld = aPosition; vNormal = aNormal;
  vColor = aColor; vSurface = aSurface;
  vec3 w = aPosition - uCamera;
  float c = cos(uLook.x), s = sin(uLook.x);
  float x = w.x*c - w.z*s, z = w.x*s + w.z*c;
  float y = w.y*cos(uLook.y) - z*sin(uLook.y);
  z = w.y*sin(uLook.y) + z*cos(uLook.y);
  // Positive view Z, near .045, far 65. Horizontal FOV follows canvas aspect.
  gl_Position = vec4(x*1.38/uAspect, y*1.38, 1.001386*z-.090062, z);
}`;
const FRAGMENT = `
precision mediump float;
varying vec3 vWorld, vNormal, vColor;
varying vec2 vSurface;
uniform vec3 uCamera, uForward;
uniform float uTime, uUnlocked;
float hash(vec3 p) { return fract(sin(dot(p,vec3(12.9898,78.233,39.425)))*437.5453); }
float seam(float v, float width) { return 1.0-smoothstep(width,width*1.6,min(fract(v),1.0-fract(v))); }
void main() {
  vec3 n = normalize(vNormal), view = normalize(uCamera-vWorld);
  float material = vSurface.x, emission = vSurface.y;
  vec3 base = vColor;
  // World-space machining grain, panel joints, anti-slip floor and grating.
  float grain = hash(floor(vWorld*180.0));
  base *= .94 + grain*.12;
  if (material > .5 && material < 1.5) {
    float joints = max(seam(vWorld.x,.012),seam(vWorld.z,.012));
    float tread = step(.80,fract((vWorld.x+vWorld.z)*21.0)) * .075;
    base *= 1.0-joints*.52-tread;
    // Narrow recessed maintenance channels in each floor tile.
    float channel = step(.84,fract(vWorld.x)) * step(.13,fract(vWorld.z)) * step(fract(vWorld.z),.87);
    float slots = step(.36,fract(vWorld.z*28.0));
    base *= 1.0-channel*(.28+.44*slots);
  } else if (material < .5) {
    float along = abs(n.x)>.5 ? vWorld.z : vWorld.x;
    float joints = max(seam(along,.016),seam(vWorld.y*1.15,.012));
    base *= 1.0-.34*joints;
    base *= .91+.09*smoothstep(.0,.45,vWorld.y);
  }
  vec3 light = vec3(.19,.23,.27);
  light += vec3(.30,.36,.40)*max(0.0,dot(n,normalize(vec3(-.3,.85,.25))));
  // Repeated ceiling pools: cool work lights and occasional amber service lamps.
  vec3 fixture = vec3(floor(vWorld.x/3.0)*3.0+1.5,2.43,floor(vWorld.z/3.0)*3.0+1.5);
  vec3 delta = fixture-vWorld;
  float d2 = dot(delta,delta);
  vec3 lamp = mod(floor(fixture.x/3.0)+floor(fixture.z/3.0),3.0)<.5 ? vec3(1.0,.63,.30) : vec3(.57,.78,1.0);
  light += lamp*max(0.0,dot(n,normalize(delta)))*1.45/(1.0+d2*.65);
  vec3 toSurface = vWorld-uCamera;
  float distanceToEye = length(toSurface);
  float cone = smoothstep(.76,.965,dot(normalize(toSurface),uForward));
  float diffuse = max(0.0,dot(n,-normalize(toSurface)));
  light += vec3(.85,.88,.80)*cone*diffuse*1.75/(1.0+distanceToEye*distanceToEye*.20);
  vec3 halfVector = normalize(view+normalize(delta));
  float specular = pow(max(0.0,dot(n,halfVector)), material> .5 && material<1.5 ? 22.0 : 48.0);
  vec3 col = base*light + lamp*specular*.16/(1.0+d2*.3);
  // Emission is intentionally restrained, with no expensive framebuffer bloom.
  col = mix(col, base*(1.15+.05*sin(uTime*1.8)),clamp(emission,0.0,1.0));
  float fog = 1.0-exp(-distanceToEye*.047);
  col = mix(col,vec3(.028,.042,.052),fog);
  col = col/(vec3(1.0)+col*.4);
  gl_FragColor = vec4(pow(max(col,vec3(0.0)),vec3(.82)),1.0);
}`;

const STEEL = [.24,.29,.32], EDGE = [.105,.135,.15], DARK = [.055,.068,.075];
const FLOOR = [.18,.21,.225], GOLD = [1,.58,.12], COOL = [.55,.82,1], WARM = [1,.63,.28];
const FACES = [
  [[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],
  [[-1,0,0],[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],
  [[0,1,0],[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],
  [[0,-1,0],[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],
  [[0,0,1],[[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]]],
  [[0,0,-1],[[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]]
];

// Normals are computed from unit faces before scaling (equivalent to inverse
// transpose for axis-aligned boxes), then rotated with the positions. In
// particular thin lamps, nonuniform chassis and cylinders keep unit normals.
class Mesh {
  constructor() { this.data = []; }
  vertex(p,n,color,material,emission) { this.data.push(...p,...n,...color,material,emission); }
  box(x,y,z,sx,sy,sz,color=STEEL,material=0,emission=0,angle=0) {
    const c=Math.cos(angle), s=Math.sin(angle);
    for (const [normal,points] of FACES) {
      const n=[normal[0]*c+normal[2]*s,normal[1],-normal[0]*s+normal[2]*c];
      for (const i of [0,1,2,0,2,3]) {
        const [a,b,d]=points[i], px=a*sx*.5, pz=d*sz*.5;
        this.vertex([x+px*c+pz*s,y+b*sy*.5,z-px*s+pz*c],n,color,material,emission);
      }
    }
  }
  // Arbitrary-axis closed cylinders, used for ducts, fasteners and rotors.
  cylinder(a,b,r,color=STEEL,emission=0,segments=10) {
    let axis=b.map((v,i)=>v-a[i]); const len=Math.hypot(...axis);
    if (!len) return;
    axis=axis.map(v=>v/len);
    const ref=Math.abs(axis[1])<.9?[0,1,0]:[1,0,0];
    const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    let u=cross(axis,ref); const ul=Math.hypot(...u); u=u.map(v=>v/ul);
    const v=cross(axis,u);
    const radial=t=>u.map((q,i)=>q*Math.cos(t)+v[i]*Math.sin(t));
    const point=(p,n)=>p.map((q,i)=>q+n[i]*r);
    for(let i=0;i<segments;i++) {
      const n0=radial(i/segments*Math.PI*2),n1=radial((i+1)/segments*Math.PI*2);
      const p0=point(a,n0),p1=point(a,n1),q0=point(b,n0),q1=point(b,n1);
      for (const [p,n] of [[p0,n0],[q0,n0],[q1,n1],[p0,n0],[q1,n1],[p1,n1]]) this.vertex(p,n,color,2,emission);
      for(const p of [a,p1,p0]) this.vertex(p,axis.map(q=>-q),color,2,emission);
      for(const p of [b,q0,q1]) this.vertex(p,axis,color,2,emission);
    }
  }
}

function buildFacility() {
  const mesh = new Mesh(), rows=MAP.length, cols=Math.max(...MAP.map(r=>r.length));
  const open=(x,z)=>MAP[z]?.[x] && MAP[z][x]!=='#';
  mesh.box(cols/2,-.085,rows/2,cols,.16,rows,FLOOR,1);
  mesh.box(cols/2,2.69,rows/2,cols,.15,rows,[.12,.15,.17],2);
  for (let z=0;z<rows;z++) for(let x=0;x<MAP[z].length;x++) {
    if(!open(x,z)) {
      mesh.box(x+.5,1.3,z+.5,1,2.6,1,STEEL);
      // Only dress exposed wall sides. No hidden internal trim or draw calls.
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) if(open(x+dx,z+dz)) {
        const wx=x+.5+dx*.505, wz=z+.5+dz*.505, alongX=dz!==0;
        mesh.box(wx,.12,wz,alongX?1:.035,.20,alongX?.035:1,EDGE);
        mesh.box(wx,2.34,wz,alongX?1:.045,.11,alongX?.045:1,EDGE);
        mesh.box(wx+ (alongX?-.46:0),1.25,wz+(alongX?0:-.46),.045,2.1,.045,EDGE);
        // Recessed service panels with handles and warning identification bars.
        if((x+z)%3===0) {
          mesh.box(wx,1.24,wz,alongX?.59:.045,.67,alongX?.045:.59,[.15,.19,.205]);
          mesh.box(wx+dx*.025,1.47,wz+dz*.025,alongX?.33:.025,.028,alongX?.025:.33,[.72,.49,.16]);
          for(let j=0;j<4;j++) mesh.box(wx+dx*.026,1.09+j*.055,wz+dz*.026,alongX?.37:.027,.014,alongX?.027:.37,DARK);
        }
        if((x+z)%4===1) {
          mesh.box(wx+dx*.023,.30,wz+dz*.023,alongX?.72:.04,.045,alongX?.04:.72,[.40,.48,.49]);
        }
      }
    } else {
      // Ceiling ribbing and practical lights repeat on a coherent module grid.
      if(z%3===1) mesh.box(x+.5,2.48,z+.5,1,.14,.09,EDGE,2);
      if(x%3===1 && z%3===1) {
        const warm=(Math.floor(x/3)+Math.floor(z/3))%3===0;
        mesh.box(x+.5,2.43,z+.5,.73,.10,.29,DARK,2);
        mesh.box(x+.5,2.372,z+.5,.59,.022,.18,warm?WARM:COOL,2,1);
        for(const offset of [-.21,.21]) mesh.box(x+.5+offset,2.35,z+.5,.025,.045,.23,EDGE,2);
      }
      if(x%4===2) {
        mesh.cylinder([x+.23,2.25,z],[x+.23,2.25,z+1],.045,[.29,.32,.32]);
        mesh.cylinder([x+.37,2.25,z],[x+.37,2.25,z+1],.026,[.37,.27,.16]);
        mesh.box(x+.30,2.25,z+.15,.26,.025,.06,EDGE,2);
      }
    }
  }
  cores.forEach(c=>{
    mesh.box(c.x,.065,c.z,.48,.12,.48,EDGE,2);
    mesh.box(c.x,.135,c.z,.32,.025,.32,[.45,.32,.12],2);
    for(const dx of [-.20,.20]) for(const dz of [-.20,.20]) mesh.box(c.x+dx,.135,c.z+dz,.04,.035,.04,GOLD,2,.65);
  });
  // Exit threshold and two narrow uprights, not an opaque collision-sized gate.
  mesh.box(exit.x,.014,exit.z,.85,.025,.85,[.12,.26,.21],2);
  for(const dx of [-.39,.39]) {
    mesh.box(exit.x+dx,1.0,exit.z+.35,.075,2,.075,EDGE,2);
    mesh.box(exit.x+dx,1.03,exit.z+.299,.026,1.74,.018,[.12,.57,.35],2,.7);
  }
  mesh.box(exit.x,2.0,exit.z+.35,.85,.11,.10,EDGE,2);
  return mesh;
}

// Low-poly hard-surface kit: all operative parts, stations and combat effects
// share the existing dynamic mesh/upload. No extra materials or draw calls.
function buildStations(mesh,player) {
  for(const station of world.stations||[]) {
    const {x,z,type,id}=station, used=player.stationUsed?.has(id);
    const color=used?[.22,.27,.27]:type==='med'?[.18,.95,.55]:type==='ammo'?[1,.62,.13]:[.24,.72,1];
    mesh.box(x,.055,z,.54,.10,.40,EDGE,2);
    mesh.box(x,.39,z,.43,.64,.28,DARK,2);
    mesh.box(x,.42,z-.151,.35,.48,.025,STEEL,2);
    mesh.box(x,.55,z-.169,.27,.19,.018,color,2,used?.1:.85);
    for(const dx of [-.19,.19]) mesh.box(x+dx,.4,z-.17,.025,.56,.025,EDGE,2);
    if(type==='med') {
      // Raised green cross, recognizable independently of color.
      mesh.box(x,.54,z-.185,.14,.045,.02,[.85,1,.91],2,.5);
      mesh.box(x,.54,z-.187,.045,.14,.02,[.85,1,.91],2,.5);
    } else if(type==='ammo') {
      for(const dx of [-.075,0,.075]) {
        mesh.cylinder([x+dx,.46,z-.19],[x+dx,.60,z-.19],.018,GOLD,.4,6);
      }
      mesh.box(x,.21,z-.17,.25,.065,.035,EDGE,2);
    } else {
      for(let i=0;i<3;i++) mesh.box(x-.035,.59-i*.044,z-.187,.16-i*.025,.014,.02,COOL,2,.7);
      mesh.box(x,.30,z-.20,.29,.045,.12,EDGE,2);
      for(let i=0;i<4;i++) mesh.box(x-.09+i*.06,.326,z-.21,.03,.008,.035,COOL,2,.3);
    }
    mesh.box(x,.18,z+.146,.27,.12,.018,EDGE,2);
  }
}

function buildOperative(mesh,player,yaw,pitch,visible,t) {
  const c=Math.cos(yaw), s=Math.sin(yaw);
  const at=(x,y,z)=>[player.x+x*c+z*s,y,player.z-x*s+z*c];
  const box=(x,y,z,sx,sy,sz,color=EDGE,emission=0)=>mesh.box(...at(x,y,z),sx,sy,sz,color,2,emission,yaw);
  const limb=(a,b,r,color=EDGE)=>mesh.cylinder(at(...a),at(...b),r,color,0,8);
  // Firing origin remains at the agreed .72m eye/weapon plane. The muzzle
  // follows pitch, while the armored body remains upright.
  const grip=at(.12,.72,.14);
  const forward=[s*Math.cos(pitch),Math.sin(pitch),c*Math.cos(pitch)];
  const muzzle=grip.map((v,i)=>v+forward[i]*.33);
  if(visible) {
    const fabric=[.10,.14,.15], armor=[.25,.30,.30], accent=[.57,.43,.22];
    const breathe=Math.sin(t*2)*.004, reload=player.reloading>0;
    // Boots, articulated legs, knee pads and utility belt.
    for(const side of [-1,1]) {
      const x=side*.085;
      box(x,.055,.035,.12,.10,.19,DARK);
      limb([x,.10,0],[x,.28,.015],.047,fabric);
      limb([x,.29,.015],[x,.46,0],.057,fabric);
      box(x,.27,.055,.085,.09,.04,armor);
      box(x,.43,-.02,.10,.08,.095,EDGE);
    }
    box(0,.48,0,.27,.075,.17,DARK);
    box(0,.50,.095,.065,.05,.035,accent);
    for(const x of [-.13,.13]) box(x,.48,0,.065,.105,.12,accent);
    box(0,.62+breathe,0,.28,.24,.18,fabric);
    box(0,.65+breathe,.10,.24,.19,.045,armor);
    box(0,.64,-.11,.23,.23,.10,EDGE); // compact pack
    box(0,.67,-.167,.14,.10,.018,accent);
    box(0,.72,.129,.11,.018,.012,COOL,.7); // chest identification strip
    limb([0,.73,0],[0,.79,0],.045,fabric);
    box(0,.84,0,.17,.15,.17,armor); // helmet shell and brow
    box(0,.855,.089,.145,.048,.025,[.14,.37,.43],.4);
    box(0,.895,.035,.18,.035,.15,DARK);
    for(const side of [-1,1]) {
      box(side*.101,.835,0,.035,.085,.10,DARK);
      box(side*.16,.70,0,.095,.09,.12,armor);
    }
    // Right trigger arm, left support arm; reload drops the support hand.
    limb([.16,.69,.015],[.20,.59,.10],.041,fabric);
    limb([.20,.59,.10],[.12,.70,.18],.034,armor);
    limb([-.16,.69,.015],[-.19,.58,.09],.041,fabric);
    limb([-.19,.58,.09],reload?[-.08,.49,.13]:[.08,.71,.29],.034,armor);
    box(.12,.70,.18,.065,.055,.07,DARK);
    // Receiver, stock, top rail, optic, magazine and pitched steel barrel.
    box(.12,.73,.24,.075,.075,.23,DARK);
    box(.12,.72,.07,.07,.07,.13,armor);
    box(.12,.785,.23,.05,.018,.22,STEEL);
    box(.12,.81,.20,.04,.035,.07,EDGE);
    box(.12,.65,.23,.05,.10,.065,armor);
    mesh.cylinder(grip,muzzle,.018,STEEL,0,8);
    mesh.cylinder(muzzle.map((v,i)=>v-forward[i]*.045),muzzle,.028,DARK,0,8);
  }
  if(player.shotFlash>0) {
    const tip=muzzle.map((v,i)=>v+forward[i]*.14);
    mesh.cylinder(muzzle,tip,.045,[1,.64,.15],1,6);
    mesh.cylinder(muzzle.map((v,i)=>v+forward[i]*.02),tip,.018,[1,.95,.60],1,6);
    if(player.shotEnd && Object.values(player.shotEnd).every(Number.isFinite)) {
      const end=[player.shotEnd.x,player.shotEnd.y,player.shotEnd.z];
      mesh.cylinder(tip,end,.006,[1,.77,.32],.9,5);
      mesh.box(...end,.045,.045,.045,[1,.65,.21],2,1,t*3);
    }
  }
}

export function buildActors({player,drones=[],now=0,yaw=player.yaw||0,pitch=player.pitch||0,thirdPerson=false}) {
  const mesh=new Mesh(), t=now*.001;
  buildStations(mesh,player);
  buildOperative(mesh,player,yaw,pitch,thirdPerson,t);
  cores.forEach((c,i)=>{
    if(player.collected.has(i)) return;
    const y=.64+Math.sin(t*2+i)*.055, spin=t*.65+i;
    mesh.box(c.x,y,c.z,.17,.30,.17,GOLD,2,1,spin);
    mesh.box(c.x,y,c.z,.28,.035,.28,[.34,.27,.14],2,0,spin);
    for(const dy of [-.19,.19]) mesh.box(c.x,y+dy,c.z,.25,.045,.25,EDGE,2,0,spin);
    mesh.cylinder([c.x,y-.14,c.z],[c.x,y+.14,c.z],.042,[1,.83,.37],1);
  });
  const unlocked=player.collected.size===cores.length;
  const exitColor=unlocked?[.16,1,.53]:[.9,.46,.10];
  mesh.box(exit.x,1.98,exit.z+.286,.46,.045,.024,exitColor,2,1);
  // Three bars provide a spatial collection-progress indicator without UI text.
  for(let i=0;i<cores.length;i++) mesh.box(exit.x-.19+i*.19,.04,exit.z,.11,.025,.58,player.collected.has(i)?[.15,.76,.42]:[.32,.23,.10],2,.65);
  for(const [i,d] of drones.entries()) {
    if(d.hp<=0) continue;
    const y=.69+Math.sin(t*3+i)*.035, angle=Math.atan2(player.x-d.x,player.z-d.z);
    const c=Math.cos(angle),s=Math.sin(angle);
    const at=(x,z)=>[d.x+x*c+z*s,d.z-x*s+z*c];
    const box=(x,dy,z,sx,sy,sz,color,emission=0,rot=0)=>{
      const [wx,wz]=at(x,z); mesh.box(wx,y+dy,wz,sx,sy,sz,color,2,emission,angle+rot);
    };
    box(0,0,0,.37,.21,.31,[.20,.23,.25]);
    box(0,.115,0,.29,.035,.24,[.37,.39,.38]);
    box(0,-.10,.02,.26,.055,.20,DARK);
    box(0,.005,.165,.28,.075,.035,DARK);
    box(0,.012,.188,.18,.029,.012,d.alert?[1,.11,.055]:[1,.37,.12],1);
    for(const side of [-1,1]) {
      box(side*.22,.025,0,.15,.045,.06,EDGE);
      const [rx,rz]=at(side*.30,0);
      mesh.cylinder([rx,y+.02,rz],[rx,y+.075,rz],.115,DARK,0,12);
      mesh.cylinder([rx,y+.076,rz],[rx,y+.084,rz],.073,[.28,.32,.34],0,12);
      box(side*.30,.092,0,.205,.012,.026,[.45,.47,.44],0,t*18);
      box(side*.13,.11,-.06,.04,.015,.10,[.72,.49,.18]);
    }
    box(0,-.13,.06,.075,.04,.08,[.7,.12,.055],.8);
  }
  return mesh;
}

/** Create once, render each animation frame, dispose before replacing it.
 * now is requestAnimationFrame milliseconds. Dimensions follow the canvas CSS
 * box rather than assuming a full-window canvas. No DOM or gameplay mutations.
 */
export function createRenderer(canvas) {
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false});
  if(!gl) throw new Error('WebGL is unavailable. Enable hardware acceleration or try a recent browser.');
  const shaders=[],buffers=[];
  let program=null,disposed=false;
  function cleanup() {
    for(const buffer of buffers) gl.deleteBuffer(buffer);
    for(const shader of shaders) gl.deleteShader(shader);
    if(program) gl.deleteProgram(program);
  }
  try {
    function compile(type,source) {
      const shader=gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(`Facility shader: ${gl.getShaderInfoLog(shader)}`);
      return shader;
    }
    program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,VERTEX));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FRAGMENT));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(`Facility program: ${gl.getProgramInfoLog(program)}`);
    const uniforms=Object.fromEntries(['uCamera','uLook','uAspect','uForward','uTime','uUnlocked'].map(name=>[name,gl.getUniformLocation(program,name)]));
    const attributes=[['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aSurface',2,36]].map(([name,size,offset])=>({location:gl.getAttribLocation(program,name),size,offset}));
    const staticMesh=buildFacility(), staticData=new Float32Array(staticMesh.data);
    const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer();
    buffers.push(staticBuffer,dynamicBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,staticData,gl.STATIC_DRAW);
    const staticCount=staticData.length/11;
    function draw(buffer,count) {
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      for(const {location,size,offset} of attributes) if(location>=0) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location,size,gl.FLOAT,false,44,offset);
      }
      gl.drawArrays(gl.TRIANGLES,0,count);
    }
    return {
      render({player,yaw=0,pitch=0,drones=[],now=0,active=false,thirdPerson=false,aim=false}) {
        if(disposed || gl.isContextLost?.()) return;
        const rect=canvas.getBoundingClientRect?.();
        const dpr=Math.min(globalThis.devicePixelRatio||1,2);
        const width=Math.max(1,Math.round((rect?.width||canvas.clientWidth||canvas.width||1)*dpr));
        const height=Math.max(1,Math.round((rect?.height||canvas.clientHeight||canvas.height||1)*dpr));
        if(canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;}
        gl.viewport(0,0,width,height);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
        gl.clearColor(.028,.042,.052,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        const camera=cameraFor(player,yaw,pitch,thirdPerson,aim);
        gl.uniform3f(uniforms.uCamera,camera.x,camera.y,camera.z);
        gl.uniform2f(uniforms.uLook,yaw,pitch);
        gl.uniform1f(uniforms.uAspect,width/height);
        gl.uniform3f(uniforms.uForward,Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
        gl.uniform1f(uniforms.uTime,now*.001);
        gl.uniform1f(uniforms.uUnlocked,player.collected.size===cores.length?1:0);
        draw(staticBuffer,staticCount);
        const actors=new Float32Array(buildActors({player,drones,now,yaw,pitch,thirdPerson}).data);
        gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,actors,gl.DYNAMIC_DRAW);
        draw(dynamicBuffer,actors.length/11);
      },
      dispose() { if(!disposed) { disposed=true;cleanup();} }
    };
  } catch(error) { cleanup();throw error; }
}
