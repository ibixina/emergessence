import { makeFlock, stepFlock, scatterFlock, seededRandom } from './systems.js?v=3';

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

function canvasSession(canvas, button, draw, resize = () => {}) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  let width = 0, height = 0, frame = 0, visible = false, last = 0, paused = motionPreference.matches;
  function syncButton() {
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = `${button.classList.contains('hero-motion') ? 'Drawing ' : ''}${paused ? 'play ▷' : 'pause Ⅱ'}`;
    button.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
  }
  function request() {
    if (!frame && !document.hidden && visible && width) frame = requestAnimationFrame(render);
  }
  function render(time) {
    frame = 0;
    if (!visible || document.hidden) { last = 0; return; }
    if (!paused && last && time - last < 32) { request(); return; }
    const dt = last ? Math.min(48, time - last) : 32;
    last = time;
    context.clearRect(0, 0, width, height);
    draw(context, width, height, paused ? 0 : dt / 32);
    if (!paused) request();
    else last = 0;
  }
  function measure() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const oldWidth = width, oldHeight = height;
    width = bounds.width; height = bounds.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    resize(width, height, oldWidth, oldHeight);
    request();
  }
  new ResizeObserver(measure).observe(canvas);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    else { measure(); request(); }
  }, { threshold:.01 }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    else request();
  });
  function toggle() { paused = !paused; syncButton(); request(); }
  button.addEventListener('click', toggle);
  motionPreference.addEventListener('change', () => { paused = motionPreference.matches; syncButton(); request(); });
  syncButton();
  measure();
  return { request, toggle, dimensions:() => [width, height] };
}

export function flockDrawing(canvas, button) {
  let flock = null, influence = .75, pointer = null;
  const random = seededRandom(19);
  const session = canvasSession(canvas, button, (context, width, height, dt) => {
    if (!flock) return;
    if (dt) flock = stepFlock(flock, width, height, influence, pointer, dt);
    for (let i = 0; i < flock.length; i += 4) {
      const x = flock[i], y = flock[i + 1], vx = flock[i + 2], vy = flock[i + 3];
      context.beginPath();context.moveTo(x - vx * 4.5, y - vy * 4.5);context.lineTo(x, y);
      context.lineWidth = i % 12 === 0 ? 2.2 : 1.3;
      context.strokeStyle = i % 12 === 0 ? '#767676' : '#3d3d3d';
      context.stroke();
      context.beginPath();context.arc(x, y, 1.1, 0, Math.PI * 2);context.fillStyle = '#3d3d3d';context.fill();
    }
    if (pointer) {
      context.beginPath();context.arc(pointer.x, pointer.y, 24, 0, Math.PI * 2);
      context.strokeStyle = '#3d3d3d33';context.lineWidth = 1;context.stroke();
    }
  }, (width, height, oldWidth, oldHeight) => {
    if (!flock) flock = makeFlock(180, width, height, random);
    else if (oldWidth && oldHeight) for (let i = 0; i < flock.length; i += 4) { flock[i] *= width / oldWidth; flock[i + 1] *= height / oldHeight; }
  });
  canvas.addEventListener('pointermove', event => {
    const bounds = canvas.getBoundingClientRect();
    pointer = { x:event.clientX - bounds.left, y:event.clientY - bounds.top };
    session?.request();
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; session?.request(); });
  function scatter() { if (flock) flock = scatterFlock(flock, random); session?.request(); }
  canvas.addEventListener('click', scatter);
  canvas.addEventListener('keydown', event => {
    if (event.key === ' ') { event.preventDefault(); scatter(); }
  });
  return { scatter, setInfluence(value) { influence = value; session?.request(); } };
}
