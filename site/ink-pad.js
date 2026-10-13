export function initializeInkPad(hero, toggle, undo, status) {
  const canvas = document.createElement('canvas');
  canvas.className = 'notebook-ink';
  canvas.setAttribute('aria-label', 'A page you can draw on with the pencil tool');
  hero.append(canvas);
  const context = canvas.getContext('2d');
  const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const idleLabel = toggle.querySelector('span').textContent;
  const storageKey = 'emergessence-notebook-ink-v2';
  let strokes = [], current = null, currentPointer = null, active = false, width = 1, height = 1;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) strokes = saved.filter(stroke => Array.isArray(stroke) && stroke.every(point => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite)));
  } catch {}

  function updateUndo() { undo.disabled = !strokes.length; }
  function save() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(strokes)); } catch {}
    updateUndo();
  }
  function segment(from, to) {
    context.strokeStyle = color;
    context.globalAlpha = .78;
    context.lineWidth = .65 + (from[2] + to[2]) * .9;
    context.lineCap = context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(from[0] * width, from[1] * height);
    context.lineTo(to[0] * width, to[1] * height);
    context.stroke();
  }
  function redraw() {
    context.clearRect(0, 0, width, height);
    for (const stroke of strokes) {
      if (!stroke.length) continue;
      segment(stroke[0], [stroke[0][0] + .0001, stroke[0][1], stroke[0][2]]);
      for (let index = 1; index < stroke.length; index++) segment(stroke[index - 1], stroke[index]);
    }
  }
  function resize() {
    const rect = hero.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  }
  function setActive(value) {
    active = value;
    canvas.classList.toggle('is-active', active);
    toggle.setAttribute('aria-pressed', String(active));
    toggle.querySelector('span').textContent = active ? 'finish drawing' : idleLabel;
    status.textContent = active ? 'The pencil is ready. Draw a connection. Press Escape to finish.' : 'Pencil put down.';
    if (current) { current = null; currentPointer = null; save(); }
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / width, (event.clientY - rect.top) / height, event.pressure || .5];
  }
  toggle.addEventListener('click', () => setActive(!active));
  undo.addEventListener('click', () => { current = null; currentPointer = null; strokes.pop(); redraw(); save(); status.textContent = 'Last mark undone.'; });
  canvas.addEventListener('pointerdown', event => {
    if (!active || event.button !== 0 || current) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    currentPointer = event.pointerId;
    current = [point(event)];
    strokes.push(current);
    segment(current[0], [current[0][0] + .0001, current[0][1], current[0][2]]);
    updateUndo();
  });
  canvas.addEventListener('pointermove', event => {
    if (!current || event.pointerId !== currentPointer) return;
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) {
      const next = point(sample), previous = current.at(-1);
      if (Math.hypot((next[0] - previous[0]) * width, (next[1] - previous[1]) * height) < .7) continue;
      current.push(next); segment(previous, next);
    }
  });
  function finish(event) { if (current && event.pointerId === currentPointer) { current = null; currentPointer = null; save(); } }
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  hero.querySelector('.scroll-prompt').addEventListener('click', () => setActive(false));
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { setActive(false); toggle.focus(); }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && strokes.length) {
      event.preventDefault(); undo.click();
    }
  });
  new ResizeObserver(resize).observe(hero);
  updateUndo(); resize();
}
