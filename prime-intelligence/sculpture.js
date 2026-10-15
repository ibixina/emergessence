import { PLACES, PARADOX_VIEW, createSculptureModel, project, tracePoint } from './geometry.js?v=5';
import { createSculptureRenderer } from './sculpture-renderer.js?v=5';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const preference=matchMedia('(prefers-reduced-motion: reduce)');

export function createSculpture(originalCanvas,labels){
  const model=createSculptureModel();
  let renderer=createSculptureRenderer(originalCanvas,model);
  const canvas=renderer.canvas;
  document.body.dataset.renderer=renderer.kind;
  document.getElementById('element-count').textContent=`${model.bodyCount} PIECES`;
  const state={yaw:-.30,pitch:.12,zoom:1,mode:0,explode:0,structure:false};
  let width=0,height=0,frame=0,last=0,clock=0,paused=preference.matches||renderer.kind==='canvas';
  let yaw=state.yaw,pitch=state.pitch,zoom=1,morph=0,explode=0,center=.53,focus='',hover='',focusY=-100;
  let pointer=[0,3,0],pointerTarget=[0,3,0],previous=[0,0],dragging=false,moved=0,pulseAt=-10,contextLost=false;
  const motion=document.querySelector('.motion-toggle');
  const leaders=new Map([...document.querySelectorAll('.leader-lines path')].map(path=>[path.dataset.leader,path]));
  const places=new Map(PLACES.map(place=>[place.id,place]));

  function request(){if(!frame&&!document.hidden&&!contextLost)frame=requestAnimationFrame(render);}
  function syncMotion(){motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume sculpture motion':'Pause sculpture motion');motion.textContent=paused?'Play ▷':'Pause Ⅱ';}
  function measure(){const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;renderer.resize(width,height);document.querySelector('.leader-lines').setAttribute('viewBox',`0 0 ${width} ${height}`);request();}
  function syncControls(){
    document.querySelectorAll('[data-form]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.form)===state.mode)));
    document.querySelector('.disassemble').setAttribute('aria-pressed',String(state.explode>0));
    document.querySelector('.disassemble').textContent=state.explode?'Reassemble ↙':'Disassemble ↗';
    document.querySelector('.structure-toggle').setAttribute('aria-pressed',String(state.structure));
    document.getElementById('form-name').textContent=state.mode?'II / PARADOX':'I / EMBODIED';
    document.getElementById('form-hint').textContent=state.mode?'Orbit to expose the illusion.':'Drag to study the form.';
  }
  function stageView(){
    const bodyScale=Math.min((height-(width<520?165:width<900?135:90))/6.9,width/(width<520?5.0:6.2));
    const stairScale=Math.min((height-130)/6.5,width/9.4);
    const assembledScale=bodyScale*(1-morph)+stairScale*morph;
    const openScale=Math.min((height-160)/12,width/10.8);
    return {yaw,pitch,scale:(assembledScale*(1-explode)+openScale*explode)*zoom,center:[width*center,height*(width<520?.46:width<900?.42:.47)],target:[0,3.15-morph,.95*morph]};
  }
  function render(time){
    frame=0;if(!width||!height||document.hidden||contextLost){last=0;return;}
    if(last&&time-last<30){request();return;}
    const dt=last?Math.min(64,time-last):32;last=time;
    const ease=preference.matches?1:1-Math.exp(-dt/160);
    yaw+=(state.yaw-yaw)*ease;pitch+=(state.pitch-pitch)*ease;zoom+=(state.zoom-zoom)*ease;
    morph+=(state.mode-morph)*ease*.65;explode+=(state.explode-explode)*ease;
    if(preference.matches)morph=state.mode;
    const reading=Boolean(focus),centerTarget=reading&&width>800?.29:.53;
    center+=(centerTarget-center)*ease;
    const focusTarget=places.get(focus||hover)?.position[1]??-100;
    focusY=paused?focusTarget:focusY+(focusTarget-focusY)*ease;
    pointer=paused?[...pointerTarget]:pointer.map((value,i)=>value+(pointerTarget[i]-value)*ease);
    if(!paused)clock+=dt/1000;
    const view=stageView();
    renderer.render({view,width,height,morph,explode,pointer,pulse:clock-pulseAt,time:clock,paused,focusY,structure:state.structure,trace:tracePoint(model.staircase,clock*.065)});
    const mobile=width<520,labelWidth=mobile?76:112,offset=mobile?47:83;
    const positioned=[];
    PLACES.forEach((place,index)=>{
      const flight=Math.floor(index/2),t=index%2?.72:.25;
      const a=model.staircase.corners[flight],b=model.staircase.corners[flight+1];
      const other=a.map((value,i)=>value+(b[i]-value)*t);
      const anchor=place.position.map((value,i)=>value*(1-morph)+other[i]*morph);
      const [x,y]=project(anchor,view);
      let lx=clamp(x+place.side*offset, labelWidth/2+16,width-labelWidth/2-16);
      let ly=clamp(y,34,height-(mobile?159:83));
      for(const previousLabel of positioned)if(Math.abs(lx-previousLabel.x)<labelWidth+8&&Math.abs(ly-previousLabel.y)<30)ly=previousLabel.y+32;
      ly=clamp(ly,34,height-(mobile?159:83));positioned.push({x:lx,y:ly});
      const button=labels.get(place.id);button.style.left=`${lx}px`;button.style.top=`${ly}px`;button.dataset.active=String(place.id===hover||place.id===focus);
      const labelEdge=lx-place.side*labelWidth*.42;
      leaders.get(place.id).setAttribute('d',`M${x} ${y}L${labelEdge-place.side*9} ${ly}H${labelEdge}`);
      leaders.get(place.id).dataset.active=String(place.id===hover||place.id===focus);
    });
    const moving=Math.abs(state.yaw-yaw)+Math.abs(state.pitch-pitch)+Math.abs(state.zoom-zoom)+Math.abs(state.mode-morph)+Math.abs(state.explode-explode)+Math.abs(centerTarget-center)+Math.abs(pointerTarget[2]-pointer[2])>.003;
    if((!paused&&!(reading&&width<520))||moving)request();else last=0;
  }
  canvas.addEventListener('pointerdown',event=>{if(event.button)return;dragging=true;previous=[event.clientX,event.clientY];moved=0;canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{
    const bounds=canvas.getBoundingClientRect();
    if(dragging){
      const dx=event.clientX-previous[0],dy=event.clientY-previous[1];state.yaw+=dx*.005;state.pitch=clamp(state.pitch+dy*.0025,-.25,1.1);moved+=Math.abs(dx)+Math.abs(dy);previous=[event.clientX,event.clientY];
    }else if(event.pointerType!=='touch'){
      const view=stageView(),horizontal=(event.clientX-bounds.left-view.center[0])/view.scale,vertical=(event.clientY-bounds.top-view.center[1])/view.scale;
      const x=horizontal/Math.max(.3,Math.abs(Math.cos(yaw)))*Math.sign(Math.cos(yaw));
      pointerTarget=[x,(x*Math.sin(yaw)*Math.sin(pitch)-vertical)/Math.cos(pitch)+view.target[1],.6];
    }
    request();
  });
  canvas.addEventListener('pointerleave',()=>{pointerTarget[2]=0;request();});
  canvas.addEventListener('pointerup',()=>{dragging=false;if(moved<5&&!paused){pulseAt=clock;request();}});
  canvas.addEventListener('pointercancel',()=>{dragging=false;});
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-',' '].includes(event.key))return;event.preventDefault();
    if(event.key==='ArrowLeft')state.yaw-=.15;if(event.key==='ArrowRight')state.yaw+=.15;
    if(event.key==='ArrowUp')state.pitch=clamp(state.pitch-.10,-.25,1.1);if(event.key==='ArrowDown')state.pitch=clamp(state.pitch+.10,-.25,1.1);
    if(event.key==='+'||event.key==='=')state.zoom=clamp(state.zoom+.1,.75,1.35);if(event.key==='-')state.zoom=clamp(state.zoom-.1,.75,1.35);
    if(event.key===' '){paused=!paused;syncMotion();}request();
  });
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;});
  canvas.addEventListener('webglcontextrestored',()=>{renderer=createSculptureRenderer(canvas,model);contextLost=false;measure();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else request();});
  preference.addEventListener('change',()=>{paused=preference.matches;syncMotion();request();});
  new ResizeObserver(measure).observe(canvas);syncMotion();syncControls();measure();
  return {
    focus(id){focus=id;request();},setHover(id){hover=id;request();},setMemory(){if(focus==='memory'){pulseAt=clock;request();}},
    reset(){state.yaw=state.mode?PARADOX_VIEW.yaw:-.30;state.pitch=state.mode?PARADOX_VIEW.pitch:.12;state.zoom=1;state.explode=0;syncControls();request();},
    zoom(amount){state.zoom=clamp(state.zoom+amount,.75,1.35);request();},toggle(){paused=!paused;syncMotion();request();},
    setForm(value){state.mode=value;state.yaw=value?PARADOX_VIEW.yaw:-.30;state.pitch=value?PARADOX_VIEW.pitch:.12;state.zoom=1;state.explode=0;syncControls();request();},
    disassemble(){state.explode=state.explode?0:1;syncControls();request();},structure(){state.structure=!state.structure;syncControls();request();}
  };
}
