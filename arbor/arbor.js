import * as notebook from '../site/notebook-studies.js?v=5';
import * as cognition from '../site/cognition-studies.js?v=9';
import { generate, layoutFor, pointAt } from './growth.js?v=1';

const studies = { ...notebook, ...cognition };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const stage = document.getElementById('stage');
const canvas = stage.querySelector('.ink');
const ctx = canvas.getContext('2d');
const world = document.getElementById('world');
const notes = document.getElementById('notes');
const leader = stage.querySelector('.leader');
const labels = new Map([...world.querySelectorAll('.node')].map(element => [element.dataset.node, element]));
const order = ['about', 'memory', 'imagery', 'environment', 'uncertainty', 'latent', 'experiments', 'activations', 'visualizer', 'climbing', 'compression', 'ascii', 'digilife', 'hello'];
const dendrites = ['memory', 'imagery', 'environment', 'uncertainty', 'latent'];
const projects = ['activations', 'visualizer', 'climbing', 'compression', 'ascii', 'digilife'];

const INK = [48, 46, 41], PAPER = [251, 250, 247], ACCENT = '#715486';
const CRAYON = { ochre:'225,180,83', teal:'108,170,160', coral:'217,149,133', blue:'131,167,201' };

let seed = Math.floor(Math.random() * 9000) + 1000;
let width = 0, height = 0, dpr = 1, cell = null, buckets = [], dots = [];
let clock = 0, growStart = 0, raf = 0, focus = null, twigs = 0;
const camera = { x:0, y:0, s:1, from:null, to:null, start:0, duration:900 };
const alpha = {}, alphaTarget = {};
const pulses = [];
let idleTimer = 0, leaderTimer = 0;

root.classList.add('grown-ready');
document.querySelector('.seed').textContent = `no. ${seed}`;
notes.querySelectorAll('.note').forEach(note => {
  note.tabIndex = -1;
  [...note.children].forEach((child, index) => child.style.setProperty('--i', index));
});

// ---------- geometry ----------

function rebuild({ animate }) {
  const rect = stage.getBoundingClientRect();
  width = rect.width; height = rect.height;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  cell = generate(seed, layoutFor(width, height));
  twigs = 0;
  index();
  for (const [name, anchor] of Object.entries(cell.anchors)) {
    const label = labels.get(name);
    if (!label) continue;
    label.style.left = `${anchor.x}px`;
    label.style.top = `${anchor.y}px`;
    label.style.transform = { right:'translate(0,-50%)', left:'translate(-100%,-50%)', above:'translate(-50%,-100%)', below:'translate(-50%,0)', 'below-right':'translate(0,0)' }[anchor.align];
    label.classList.toggle('grown', !animate);
    label.classList.toggle('static', !animate || reduced.matches);
  }
  // Keep every word on screen: nudge any label that would run past an edge.
  world.style.transform = 'none';
  for (const label of labels.values()) {
    label.style.marginLeft = '0px';
    const box = label.getBoundingClientRect(), edge = 10;
    const shift = box.left < edge ? edge - box.left : box.right > width - edge ? width - edge - box.right : 0;
    label.style.marginLeft = `${shift}px`;
  }
  growStart = animate && !reduced.matches ? performance.now() : -1e9;
  for (const group of cell.groups) alpha[group] ??= 1;
  setFocus(focus, { instant:true });
  wake();
}

// Segments are batched by group, line weight, and pencil/ink so a frame needs only a few dozen strokes.
function index() {
  const map = new Map();
  for (const segment of cell.segments) {
    const weight = Math.max(.3, Math.round(segment.w * 4) / 4);
    const key = `${segment.g}|${segment.faint}|${weight}`;
    if (!map.has(key)) map.set(key, { g:segment.g, faint:segment.faint, w:weight, list:[] });
    map.get(key).list.push(segment);
  }
  buckets = [...map.values()];
  for (const bucket of buckets) bucket.list.sort((a, b) => a.t - b.t);
  const dotMap = new Map();
  for (const dot of cell.dots) {
    const key = `${dot.g}|${dot.c}`;
    if (!dotMap.has(key)) dotMap.set(key, { g:dot.g, c:dot.c, list:[] });
    dotMap.get(key).list.push(dot);
  }
  dots = [...dotMap.values()];
  for (const bucket of dots) bucket.list.sort((a, b) => a.t - b.t);
}

// ---------- drawing ----------

function inkColor(amount, pencil) {
  const a = Math.max(0, Math.min(1, amount)) * (pencil ? .3 : 1);
  return `rgb(${INK.map((value, index) => Math.round(PAPER[index] + (value - PAPER[index]) * a)).join(',')})`;
}

function draw(now) {
  const elapsed = now - growStart;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * camera.s, 0, 0, dpr * camera.s, dpr * camera.x, dpr * camera.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'source-over';
  // Pencil construction lines first, so ink always sits on top of them.
  for (const pass of [1, 0]) for (const bucket of buckets) {
    if (bucket.faint !== pass) continue;
    const a = alpha[bucket.g] ?? 1;
    if (a < .01) continue;
    ctx.strokeStyle = inkColor(a, bucket.faint);
    ctx.lineWidth = bucket.w;
    ctx.beginPath();
    for (const s of bucket.list) {
      if (s.t > elapsed) break;
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    }
    ctx.stroke();
  }
  // Crayon multiplies with the ink, like wax laid under a pen line.
  ctx.globalCompositeOperation = 'multiply';
  for (const bucket of dots) {
    const a = alpha[bucket.g] ?? 1;
    ctx.fillStyle = `rgba(${CRAYON[bucket.c]},${(.34 * Math.max(.25, a)).toFixed(3)})`;
    ctx.beginPath();
    for (const d of bucket.list) {
      if (d.t > elapsed) break;
      ctx.rect(d.x, d.y, d.r, d.r);
    }
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const pulse of pulses) drawPulse(pulse);
}

function drawPulse(pulse) {
  const head = Math.min(pulse.distance, pulse.length);
  const tail = Math.max(0, head - 46);
  ctx.lineWidth = 2.2;
  for (let d = tail; d < head; d += 4) {
    const a = pointAt(pulse.path, d), b = pointAt(pulse.path, Math.min(head, d + 4));
    ctx.strokeStyle = `rgba(113,84,134,${((d - tail) / 46 * .85).toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  const p = pointAt(pulse.path, head);
  ctx.fillStyle = ACCENT;
  ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(${CRAYON.coral},.45)`;
  ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- the loop runs only while something is moving ----------

function wake() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function frame(now) {
  raf = 0;
  const dt = Math.min(64, now - (clock || now));
  clock = now;
  let busy = false;

  if (camera.to) {
    const t = Math.min(1, (now - camera.start) / camera.duration);
    const e = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    for (const key of ['x', 'y', 's']) camera[key] = camera.from[key] + (camera.to[key] - camera.from[key]) * e;
    if (t >= 1) { camera.to = null; settle(); } else busy = true;
    world.style.transform = `matrix(${camera.s},0,0,${camera.s},${camera.x},${camera.y})`;
  }

  for (const group of cell.groups) {
    const target = alphaTarget[group] ?? 1;
    const current = alpha[group] ?? 1;
    if (Math.abs(target - current) > .004) { alpha[group] = current + (target - current) * Math.min(1, dt / 160); busy = true; }
    else alpha[group] = target;
  }

  const elapsed = now - growStart;
  if (elapsed < cell.duration + 600) busy = true;
  for (const [name, anchor] of Object.entries(cell.anchors)) {
    const label = labels.get(name);
    if (label && !label.classList.contains('grown') && elapsed >= anchor.t) label.classList.add('grown');
  }

  for (let i = pulses.length - 1; i >= 0; i--) {
    const pulse = pulses[i];
    pulse.distance += pulse.speed * dt / 1000;
    if (pulse.distance >= pulse.length + 46) { pulses.splice(i, 1); pulse.done?.(); }
    else busy = true;
  }
  if (pulses.length) busy = true;

  draw(now);
  if (busy && !document.hidden) wake();
  else clock = 0;
}

// ---------- signals ----------

function fire(path, { reverse = false, speed = 340, done } = {}) {
  if (reduced.matches || !path || path.length < 2) return done?.();
  const points = reverse ? [...path].reverse() : path;
  let distance = 0;
  const measured = points.map((p, i) => {
    if (i) distance += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    return { x:p.x, y:p.y, d:distance };
  });
  pulses.push({ path:measured, length:distance, distance:0, speed, done });
  wake();
}

function pathTo(name) {
  if (dendrites.includes(name)) return { path:cell.paths[name], reverse:true };
  if (name === 'about') return null;
  if (projects.includes(name)) return { path:cell.paths.axon.filter(p => p.d <= cell.anchors[name].d) };
  if (name === 'experiments') return { path:cell.paths.axon.filter(p => p.d <= cell.anchors.experiments.d + 30) };
  return { path:cell.paths.axon };
}

function idle() {
  clearTimeout(idleTimer);
  if (reduced.matches) return;
  idleTimer = setTimeout(() => {
    if (!document.hidden && !focus && performance.now() - growStart > cell.duration) {
      const source = dendrites[Math.floor(Math.random() * dendrites.length)];
      fire(cell.paths[source], { reverse:true, done:() => fire(cell.paths.axon, { speed:420, done:() => fire(cell.paths.gap, { speed:120 }) }) });
    }
    idle();
  }, 4200 + Math.random() * 3800);
}

// ---------- focus & reading ----------

function groupsFor(name) {
  const dim = .13;
  const set = Object.fromEntries(cell.groups.map(group => [group, name ? dim : 1]));
  if (!name) { set.you = .72; return set; }
  if (name === 'about') { for (const group of cell.groups) set[group] = .38; set.soma = 1; return set; }
  set.soma = 1;
  if (dendrites.includes(name)) set[name] = 1;
  else if (name === 'hello') Object.assign(set, { axon:.4, terminal:1, you:1, gap:1, soma:.4 });
  else Object.assign(set, { axon:1, terminal:.5 });
  return set;
}

function cameraFor(name) {
  if (!name) return { x:0, y:0, s:1 };
  const anchor = cell.anchors[name === 'you' ? 'hello' : name];
  const point = name === 'about' ? cell.soma : anchor;
  if (cell.portrait) {
    const s = 1.05;
    return { x:width * .5 - point.x * s, y:height * .2 - point.y * s, s };
  }
  const s = 1.18;
  // The note opens on the same side of the soma as its word, so the lit branch leads away from the text.
  const left = name === 'hello' || (name !== 'about' && !projects.includes(name) && name !== 'experiments' && point.x < cell.soma.x);
  return { x:width * (left ? .66 : .3) - point.x * s, y:height * .5 - point.y * s, s, left };
}

function setFocus(name, { instant = false } = {}) {
  if (!cell) return;
  focus = name && order.includes(name) ? name : null;
  const view = cameraFor(focus);
  Object.assign(alphaTarget, groupsFor(focus));
  if (instant || reduced.matches) {
    Object.assign(camera, view, { to:null });
    Object.assign(alpha, alphaTarget);
    world.style.transform = `matrix(${camera.s},0,0,${camera.s},${camera.x},${camera.y})`;
    settle();
  } else {
    camera.from = { x:camera.x, y:camera.y, s:camera.s };
    camera.to = view;
    camera.start = performance.now();
    leader.classList.remove('on');
  }
  notes.dataset.side = view.left ? 'left' : 'right';
  document.body.classList.toggle('reading', !!focus);
  stage.classList.toggle('focused', !!focus);
  for (const [key, label] of labels) {
    const kin = (focus === 'hello' && key === 'you') || (projects.includes(focus) && key === 'experiments') || (focus === 'experiments' && projects.includes(key));
    label.classList.toggle('active', key === focus);
    label.classList.toggle('kin', kin);
    label.toggleAttribute('aria-current', key === focus);
  }
  notes.querySelectorAll('.note').forEach(note => {
    const open = note.id === focus;
    if (open && !note.classList.contains('open')) {
      const figure = note.querySelector('.study');
      if (figure && !figure.querySelector('svg')) figure.insertAdjacentHTML('afterbegin', studies[note.dataset.study]());
      note.classList.remove('open');
      void note.offsetWidth;
      notes.scrollTop = 0;
    }
    note.classList.toggle('open', open);
  });
  if (focus && !instant) {
    const route = pathTo(focus);
    if (route) fire(route.path, { reverse:route.reverse, speed:520 });
  }
  wake();
}

function settle() {
  clearTimeout(leaderTimer);
  if (!focus) { leader.classList.remove('on'); return; }
  leaderTimer = setTimeout(drawLeader, reduced.matches ? 0 : 450);
}

// A pen line from the word on the cell to the note it opened.
function drawLeader() {
  const label = labels.get(focus), heading = document.querySelector(`#${focus} h2`);
  if (!label || !heading) return;
  const a = label.getBoundingClientRect(), b = heading.getBoundingClientRect();
  let sx, sy, ex, ey;
  if (cell.portrait) { leader.classList.remove('on'); return; }
  if (notes.dataset.side === 'right') {
    sx = a.right + 6; sy = a.top + a.height / 2; ex = b.left - 14; ey = b.top + b.height * .45;
  } else {
    sx = a.left - 6; sy = a.top + a.height / 2; ex = b.right + 14; ey = b.top + b.height * .45;
  }
  const length = Math.hypot(ex - sx, ey - sy);
  if (length < 50 || (!cell.portrait && (notes.dataset.side === 'right' ? ex < sx : ex > sx))) { leader.classList.remove('on'); return; }
  const mx = (sx + ex) / 2, my = (sy + ey) / 2 + Math.min(60, length * .18);
  const angle = Math.atan2(ey - my, ex - mx);
  const [line, head] = leader.querySelectorAll('path');
  line.setAttribute('d', `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`);
  head.setAttribute('d', `M${ex - 9 * Math.cos(angle - .5)} ${ey - 9 * Math.sin(angle - .5)} L${ex} ${ey} L${ex - 9 * Math.cos(angle + .5)} ${ey - 9 * Math.sin(angle + .5)}`);
  const total = line.getTotalLength();
  line.style.transition = 'none';
  line.style.strokeDasharray = total;
  line.style.strokeDashoffset = reduced.matches ? 0 : total;
  void line.getBoundingClientRect();
  line.style.transition = 'stroke-dashoffset .7s cubic-bezier(.4,.1,.3,1), opacity .4s';
  line.style.strokeDashoffset = 0;
  leader.classList.add('on');
}

function route() {
  const name = decodeURIComponent(location.hash.slice(1));
  setFocus(order.includes(name) ? name : null);
  if (focus) document.getElementById(focus)?.focus({ preventScroll:true });
}

function goHome() {
  if (location.hash) history.pushState(null, '', location.pathname + location.search);
  setFocus(null);
}

// ---------- interaction ----------

for (const [name, label] of labels) {
  label.addEventListener('pointerenter', () => {
    if (focus === name || reduced.matches) return;
    const route = pathTo(name === 'you' ? 'hello' : name);
    if (route) fire(route.path, { reverse:route.reverse, speed:560 });
  });
}

document.querySelectorAll('[data-home]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); goHome(); }));
document.querySelectorAll('[data-step]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); step(+link.dataset.step); }));
document.querySelector('.regrow').addEventListener('click', () => {
  seed = Math.floor(Math.random() * 9000) + 1000;
  document.querySelector('.seed').textContent = `no. ${seed}`;
  goHome();
  rebuild({ animate:true });
});

function step(direction) {
  const current = Math.max(0, order.indexOf(focus));
  const next = focus ? order[(current + direction + order.length) % order.length] : order[0];
  location.hash = next;
}

// Touching bare paper closes a note; while browsing, it grows a small new twig toward the touch.
stage.addEventListener('click', event => {
  if (event.target.closest('a')) return;
  if (focus) return goHome();
  const x = (event.clientX - camera.x) / camera.s, y = (event.clientY - camera.y) / camera.s;
  if (twigs >= 40 || !cell.sprout(x, y, performance.now() - growStart)) return;
  twigs++;
  index();
  wake();
});

addEventListener('keydown', event => {
  if (event.target.closest('input, textarea')) return;
  if (event.key === 'Escape' && focus) goHome();
  else if (event.key === 'ArrowRight' && focus) step(1);
  else if (event.key === 'ArrowLeft' && focus) step(-1);
});

addEventListener('hashchange', route);
addEventListener('popstate', route);
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
reduced.addEventListener('change', () => { idle(); wake(); });

let resizeTimer = 0;
new ResizeObserver(() => {
  const rect = stage.getBoundingClientRect();
  if (!cell || (rect.width === width && rect.height === height)) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => rebuild({ animate:false }), 140);
}).observe(stage);

await document.fonts.load('33px "Reenie Beanie"').catch(() => {});
rebuild({ animate:true });
const initial = decodeURIComponent(location.hash.slice(1));
if (order.includes(initial)) setTimeout(route, reduced.matches ? 0 : 900);
idle();
