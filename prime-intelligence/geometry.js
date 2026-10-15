import { seededRandom } from './systems.js?v=5';

export const PLACES = [
  { id:'identity', name:'The person', heading:'The person.', position:[-.65,4.4,.15], side:-1 },
  { id:'memory', name:'Memory', heading:'Memory.', position:[-.25,5.8,.10], side:-1 },
  { id:'imagery', name:'Imagery', heading:'Imagery.', position:[.27,5.6,.12], side:1 },
  { id:'interaction', name:'Interaction', heading:'Interaction.', position:[1.28,3.25,.16], side:1 },
  { id:'work', name:'The work', heading:'The work.', position:[.4,1.3,.08], side:1 },
  { id:'contact', name:'A connection', heading:'A connection.', position:[-1.20,2.55,.10], side:-1 }
];
export const PARADOX_VIEW = {yaw:Math.PI/4,pitch:Math.atan(1/Math.sqrt(2))};

export function project(point,{yaw=-.30,pitch=.12,scale=60,center=[400,300],target=[0,3.1,0]}={}) {
  const x=point[0]-target[0],y=point[1]-target[1],z=point[2]-target[2];
  const horizontal=x*Math.cos(yaw)-z*Math.sin(yaw);
  const depth=x*Math.sin(yaw)+z*Math.cos(yaw);
  return [center[0]+horizontal*scale,center[1]+(depth*Math.sin(pitch)-y*Math.cos(pitch))*scale,depth*Math.cos(pitch)+y*Math.sin(pitch)];
}

function capsuleDistance(point,a,b,radius) {
  const direction=b.map((value,i)=>value-a[i]),offset=point.map((value,i)=>value-a[i]);
  const t=Math.max(0,Math.min(1,offset.reduce((sum,value,i)=>sum+value*direction[i],0)/direction.reduce((sum,value)=>sum+value*value,0)));
  return Math.hypot(...point.map((value,i)=>value-a[i]-direction[i]*t))-radius;
}

export function insideBody([x,y,z]) {
  const head=Math.abs(x)<.35&&y>5.40&&y<6.31&&Math.abs(z)<.31;
  const neck=Math.abs(x)<.23&&y>5.04&&y<5.52&&Math.abs(z)<.25;
  const shoulder=Math.abs(x)<.90&&y>4.68&&y<5.11&&Math.abs(z)<.33;
  const chest=Math.abs(x)<.70&&y>3.85&&y<4.69&&Math.abs(z)<.36;
  const waist=Math.abs(x)<.54&&y>3.40&&y<3.86&&Math.abs(z)<.3;
  const pelvis=Math.abs(x)<.64&&y>2.9&&y<3.41&&Math.abs(z)<.35;
  const feet=(Math.abs(x+.41)<.23||Math.abs(x-.42)<.23)&&y<.25&&y>-.05&&z>-.23&&z<.58;
  const parts=[
    [[-.36,2.94,0],[-.42,1.42,0],.30],[[-.42,1.42,0],[-.43,.28,.05],.235],
    [[.36,2.94,0],[.44,1.44,.02],.30],[[.44,1.44,.02],[.43,.28,.06],.235],
    [[-.93,4.85,0],[-1.15,3.62,.02],.245],[[-1.15,3.62,.02],[-1.22,2.50,.10],.205],
    [[.93,4.85,0],[1.28,3.67,.10],.25],[[1.28,3.67,.10],[1.28,2.58,.21],.205]
  ];
  return head||neck||shoulder||chest||waist||pelvis||feet||parts.some(([a,b,r])=>capsuleDistance([x,y,z],a,b,r)<0);
}

export function createBody(spacing=.205) {
  const random=seededRandom(22),blocks=[];
  for(let y=.075;y<6.5;y+=spacing)for(let x=-1.47;x<1.48;x+=spacing)for(let z=-.48;z<.65;z+=spacing) {
    if(!insideBody([x,y,z]))continue;
    const scale=.69+random()*.27;
    const wire=random()<.23;
    blocks.push({position:[x,y,z],size:[spacing*scale,spacing*(.78+random()*.18),spacing*scale],wire:wire?1:0,seed:random(),angle:0});
  }
  return blocks;
}

export function createStaircase() {
  const {yaw,pitch}=PARADOX_VIEW;
  const direction=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
  const start=[-2.2,.65,1.4];
  const end=start.map((value,i)=>value+direction[i]*3/Math.sin(pitch));
  const corners=[start,[2.0,1.65,1.4],[.1,2.65,-2.5],end];
  const blocks=[],steps=34;
  for(let flight=0;flight<3;flight++) {
    const a=corners[flight],b=corners[flight+1];
    const angle=Math.atan2(b[0]-a[0],b[2]-a[2]);
    const depth=Math.hypot(b[0]-a[0],b[2]-a[2])/steps*1.08;
    for(let step=0;step<steps;step++) {
      const t=step/(steps-1);
      const p=a.map((value,i)=>value+(b[i]-value)*t);
      for(let width=0;width<4;width++) {
        const offset=(width-1.5)*.16;
        blocks.push({position:[p[0]+Math.cos(angle)*offset,p[1],p[2]-Math.sin(angle)*offset],size:[.155,.115,depth],wire:0,angle,seed:(step+flight*steps)/(steps*3)});
      }
      for(const side of [-1,1]) {
        const offset=side*.37;
        blocks.push({position:[p[0]+Math.cos(angle)*offset,p[1]-.17,p[2]-Math.sin(angle)*offset],size:[.045,.35,depth],wire:0,angle,seed:.7});
      }
      blocks.push({position:[p[0]+Math.cos(angle)*.37,p[1]+.71,p[2]-Math.sin(angle)*.37],size:[.025,.025,depth],wire:0,angle,seed:.8});
      if(step%3===0) {
        const offset=.37;
        blocks.push({position:[p[0]+Math.cos(angle)*offset,p[1]+.37,p[2]-Math.sin(angle)*offset],size:[.024,.68,.024],wire:0,angle:0,seed:.85});
      }
    }
  }
  return {blocks,start,end,corners};
}

function splitToCount(blocks,count) {
  const result=blocks.map(block=>({...block,position:[...block.position],size:[...block.size]}));
  let index=0;
  while(result.length<count) {
    const block=result[index++%result.length];
    const axis=block.size.indexOf(Math.max(...block.size));
    const half=block.size[axis]/2;
    const second={...block,position:[...block.position],size:[...block.size],seed:(block.seed+.173)%1};
    block.size[axis]=half;second.size[axis]=half;
    block.position[axis]-=half/2;second.position[axis]+=half/2;
    result.push(second);
  }
  return result;
}

export function createSculptureModel() {
  const rawBody=createBody(),staircase=createStaircase();
  const count=Math.max(rawBody.length,staircase.blocks.length);
  const body=splitToCount(rawBody,count),stairs=splitToCount(staircase.blocks,count);
  staircase.blocks=stairs;
  const from=new Float32Array(count*4),to=new Float32Array(count*4),sizes=new Float32Array(count*4),targetSizes=new Float32Array(count*4);
  for(let i=0;i<count;i++) {
    const a=body[i],b=stairs[i];
    from.set([...a.position,a.seed],i*4);to.set([...b.position,b.angle],i*4);
    sizes.set([...a.size,a.wire],i*4);targetSizes.set([...b.size,b.wire],i*4);
  }
  return {count,from,to,sizes,targetSizes,bodyCount:body.length,staircase};
}

export function tracePoint(staircase,time) {
  const progress=((time%1)+1)%1*3,flight=Math.floor(progress),t=progress-flight;
  const a=staircase.corners[flight],b=staircase.corners[flight+1];
  return a.map((value,i)=>value+(b[i]-value)*t+(i===1?.125:0));
}

export function cubeMesh() {
  const positions=[],normals=[],indices=[];
  const faces=[
    [[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
    [[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],
    [[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],
    [[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],
    [[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],
    [[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]
  ];
  for(const [normal,vertices] of faces) {
    const base=positions.length/3;
    for(const point of vertices){positions.push(...point.map(value=>value*.5));normals.push(...normal);}
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint16Array(indices)};
}
