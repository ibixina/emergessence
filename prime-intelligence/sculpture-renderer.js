import { cubeMesh, project } from './geometry.js?v=5';

const vertexSource=`
attribute vec3 aVertex;
attribute vec3 aNormal;
attribute vec4 aFrom;
attribute vec4 aTo;
attribute vec4 aSize;
attribute vec4 aTargetSize;
uniform mat3 uView;
uniform vec3 uTarget;
uniform vec2 uScale;
uniform vec2 uCenter;
uniform float uMorph;
uniform float uExplode;
uniform vec3 uPointer;
uniform float uPulse;
uniform vec3 uTrace;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vWire;
varying float vSeed;
void main(){
  float t=smoothstep(aFrom.w*.1,.9+aFrom.w*.1,uMorph);
  vec3 center=mix(aFrom.xyz,aTo.xyz,t);
  vec3 size=mix(aSize.xyz,aTargetSize.xyz,t);
  vec3 scatter=vec3(sin(aFrom.w*17.3),sin(aFrom.w*11.7),cos(aFrom.w*19.1));
  center+=scatter*uExplode*(1.0+aFrom.w*1.7);
  vec2 difference=center.xy-uPointer.xy;
  float influence=exp(-dot(difference,difference)*2.4)*uPointer.z*(1.0-t);
  center.xy+=normalize(difference+vec2(.0001))*influence*.15;
  float distance=length(center.xy-vec2(0.0,3.1));
  float pulse=exp(-pow(distance-uPulse*2.2,2.0)*8.0)*max(0.0,1.0-uPulse/2.0);
  center+=scatter*pulse*.10;
  float angle=aTo.w*t+uExplode*(aFrom.w-.5)*.5;
  float c=cos(angle),s=sin(angle);
  mat3 turn=mat3(c,0.0,-s,0.0,1.0,0.0,s,0.0,c);
  if(aFrom.w<0.0){center=uTrace;size=vec3(.055*uMorph);}
  vec3 world=center+turn*(aVertex*size);
  vec3 projected=uView*(world-uTarget);
  gl_Position=vec4(projected.x*uScale.x+uCenter.x,-projected.y*uScale.y+uCenter.y,-projected.z/30.0,1.0);
  vLocal=aVertex;
  vNormal=turn*aNormal;
  vWorld=world;
  vWire=mix(aSize.w,aTargetSize.w,t);
  vSeed=aFrom.w;
}`;
const fragmentSource=`
precision mediump float;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vWire;
varying float vSeed;
uniform float uFocusY;
uniform float uTime;
uniform float uMotion;
uniform float uStructure;
void main(){
  if(vSeed<0.0){gl_FragColor=vec4(1.0,.80,.57,1.0);return;}
  // Local face coordinates keep the edge treatment attached during rotation.
  vec3 local=abs(vLocal);
  float smallest=min(min(local.x,local.y),local.z);
  float middle=local.x+local.y+local.z-max(max(local.x,local.y),local.z)-smallest;
  float outline=smoothstep(.454,.488,middle);
  if(max(vWire,uStructure)>.5&&middle<.465)discard;
  float key=max(0.0,dot(normalize(vNormal),normalize(vec3(-.55,.9,1.1))));
  float fill=max(0.0,dot(normalize(vNormal),normalize(vec3(1.0,.25,-.5))));
  float value=(.13+key*.70+fill*.13)*(.86+vSeed*.14);
  vec3 color=mix(vec3(value),vec3(.91),outline*(vWire>.5?.80:.12));
  float focus=exp(-pow(vWorld.y-uFocusY,2.0)*5.0)*.19;
  float scan=exp(-pow(vWorld.y-mod(uTime*.60,7.0),2.0)*90.0)*uMotion*.05;
  color+=vec3(focus*.75,focus*.52,focus*.28)+vec3(scan);
  gl_FragColor=vec4(color,1.0);
}`;

function compile(gl,type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function gpuRenderer(canvas,model){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'low-power'});
  if(!gl)return null;
  const instancing=gl.getExtension('ANGLE_instanced_arrays');
  if(!instancing)return null;
  const program=gl.createProgram();
  const vertex=compile(gl,gl.VERTEX_SHADER,vertexSource),fragment=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vertex);gl.deleteShader(fragment);gl.useProgram(program);
  const mesh=cubeMesh();
  function attribute(name,data,size,divisor=0){
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);instancing.vertexAttribDivisorANGLE(location,divisor);
  }
  attribute('aVertex',mesh.positions,3);attribute('aNormal',mesh.normals,3);
  const addTrace=(data,extra)=>{const buffer=new Float32Array(data.length+4);buffer.set(data);buffer.set(extra,data.length);return buffer;};
  attribute('aFrom',addTrace(model.from,[0,0,0,-1]),4,1);attribute('aTo',addTrace(model.to,[0,0,0,0]),4,1);attribute('aSize',addTrace(model.sizes,[0,0,0,0]),4,1);attribute('aTargetSize',addTrace(model.targetSizes,[.055,.055,.055,0]),4,1);
  const indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
  const names=['uView','uTarget','uScale','uCenter','uMorph','uExplode','uPointer','uPulse','uFocusY','uTime','uMotion','uStructure','uTrace'];
  const uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
  return {
    canvas,kind:'webgl',
    resize(width,height){
      const dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    },
    render({view,width,height,morph,explode,pointer,pulse,time,paused,focusY,structure,trace}){
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const cy=Math.cos(view.yaw),sy=Math.sin(view.yaw),cp=Math.cos(view.pitch),sp=Math.sin(view.pitch);
      gl.uniformMatrix3fv(uniforms.uView,false,new Float32Array([cy,sy*sp,sy*cp,0,-cp,sp,-sy,cy*sp,cy*cp]));
      gl.uniform3fv(uniforms.uTarget,view.target);gl.uniform2f(uniforms.uScale,2*view.scale/width,2*view.scale/height);gl.uniform2f(uniforms.uCenter,2*view.center[0]/width-1,1-2*view.center[1]/height);
      gl.uniform1f(uniforms.uMorph,morph);gl.uniform1f(uniforms.uExplode,explode);gl.uniform3fv(uniforms.uPointer,pointer);gl.uniform1f(uniforms.uPulse,pulse);
      gl.uniform1f(uniforms.uFocusY,focusY);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uMotion,paused?0:1);gl.uniform1f(uniforms.uStructure,structure?1:0);gl.uniform3fv(uniforms.uTrace,trace);
      instancing.drawElementsInstancedANGLE(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0,model.count+1);
    }
  };
}

function canvasRenderer(canvas,model){
  const replacement=document.createElement('canvas');
  for(const attribute of canvas.attributes)replacement.setAttribute(attribute.name,attribute.value);
  canvas.replaceWith(replacement);canvas=replacement;
  const context=canvas.getContext('2d');
  const mesh=cubeMesh();
  return {
    canvas,kind:'canvas',
    resize(width,height){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);},
    render({view,width,height,morph,explode,structure}){
      context.clearRect(0,0,width,height);
      const faces=[];
      for(let i=0;i<model.count;i++){
        const offset=i*4,seed=model.from[offset+3];
        const size=[0,1,2].map(axis=>model.sizes[offset+axis]*(1-morph)+model.targetSizes[offset+axis]*morph);
        if(!size.some(value=>value>.01))continue;
        const position=[0,1,2].map(axis=>model.from[offset+axis]*(1-morph)+model.to[offset+axis]*morph+[Math.sin(seed*17.3),Math.sin(seed*11.7),Math.cos(seed*19.1)][axis]*explode*(1+seed*1.7));
        const angle=model.to[offset+3]*morph+explode*(seed-.5)*.5,c=Math.cos(angle),s=Math.sin(angle);
        for(let face=0;face<6;face++){
          const points=[];
          for(let vertex=0;vertex<4;vertex++){
            const p=(face*4+vertex)*3,x=mesh.positions[p]*size[0],y=mesh.positions[p+1]*size[1],z=mesh.positions[p+2]*size[2];
            points.push(project([position[0]+x*c+z*s,position[1]+y,position[2]-x*s+z*c],view));
          }
          faces.push({points,depth:points.reduce((sum,p)=>sum+p[2],0)/4,shade:[118,62,83,153,186,55][face],wire:structure||model.sizes[offset+3]>.5});
        }
      }
      faces.sort((a,b)=>a.depth-b.depth);
      for(const face of faces){context.beginPath();face.points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();if(!face.wire){context.fillStyle=`rgb(${face.shade},${face.shade},${face.shade})`;context.fill();}context.strokeStyle='#d2d2d266';context.lineWidth=.55;context.stroke();}
    }
  };
}

export function createSculptureRenderer(canvas,model){
  try{const renderer=gpuRenderer(canvas,model);if(renderer)return renderer;}catch{}
  return canvasRenderer(canvas,model);
}
