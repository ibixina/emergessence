const maxAnts = 420;
const maxPixels = 2_000_000;
const hold = 1.9;
const reveal = 1.2;
const departure = 3.6;
const directions = 24;
const spriteSize = 16;
const spriteScale = 2;
const tau = Math.PI * 2;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function antSprites(color) {
  const atlas = document.createElement('canvas');
  const cell = spriteSize * spriteScale;
  atlas.width = directions * cell;
  atlas.height = 2 * cell;
  const context = atlas.getContext('2d');
  context.scale(spriteScale, spriteScale);
  context.fillStyle = context.strokeStyle = color;
  context.lineWidth = .4;
  context.lineCap = 'round';
  for (let gait = 0; gait < 2; gait++) {
    for (let direction = 0; direction < directions; direction++) {
      context.save();
      context.translate((direction + .5) * spriteSize, (gait + .5) * spriteSize);
      context.rotate(direction / directions * tau);
      context.beginPath();
      for (let leg = 0; leg < 3; leg++) {
        for (const side of [-1, 1]) {
          const stride = ((leg + gait) % 2 ? .35 : -.35) * side;
          const x = .5 - leg * .55;
          context.moveTo(x, side * .2);
          context.lineTo(x - .3 + stride, side * .9);
          context.lineTo(x - .8 + stride, side * 1.8);
        }
      }
      context.moveTo(1.5, -.25);
      context.lineTo(2.1, -.65);
      context.lineTo(2.5, -1.05);
      context.moveTo(1.5, .25);
      context.lineTo(2.1, .65);
      context.lineTo(2.5, 1.05);
      context.stroke();
      context.beginPath();
      context.ellipse(-1.3, 0, 1.05, .72, 0, 0, tau);
      context.ellipse(0, 0, .58, .45, 0, 0, tau);
      context.ellipse(1.15, 0, .63, .53, 0, 0, tau);
      context.fill();
      context.restore();
    }
  }
  return atlas;
}

function letterSamples(word, style) {
  const padding = Math.ceil(parseFloat(style.fontSize) * .3);
  const width = word.offsetWidth, height = word.offsetHeight;
  const mask = document.createElement('canvas');
  mask.width = width + padding * 2;
  mask.height = height + padding * 2;
  const context = mask.getContext('2d', { willReadFrequently:true });
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics = context.measureText('emerge');
  const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
  context.fillText('emerge', padding, padding + (height - ascent - descent) / 2 + ascent);
  const pixels = context.getImageData(0, 0, mask.width, mask.height).data;
  const candidates = [];
  for (let y = 1; y < mask.height - 1; y += 2) {
    for (let x = 1; x < mask.width - 1; x += 2) {
      if (pixels[(y * mask.width + x) * 4 + 3] > 110) candidates.push({ x, y });
    }
  }
  const count = Math.min(maxAnts, candidates.length);
  const samples = [];
  for (let index = 0; index < count; index++) {
    const point = candidates[Math.floor((index + .5) * candidates.length / count)];
    let xx = 0, xy = 0, yy = 0;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = point.x + dx, y = point.y + dy;
        if (x < 0 || x >= mask.width || y < 0 || y >= mask.height) continue;
        const weight = pixels[(y * mask.width + x) * 4 + 3] / 255;
        xx += dx * dx * weight;
        xy += dx * dy * weight;
        yy += dy * dy * weight;
      }
    }
    samples.push({ x:point.x - padding, y:point.y - padding, angle:.5 * Math.atan2(2 * xy, xx - yy) });
  }
  return { samples, width, height };
}

export class EmergenceColony {
  constructor(word, scene) {
    this.word = word;
    this.ink = word.querySelector('.emergence-ink');
    this.scene = scene;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.ants = [];
    this.elapsed = 0;
    this.frame = 0;
    this.lastTime = 0;
    this.needsLayout = true;
    this.running = false;
    this.phase = 'text';
    this.bounds = null;
    this.sync = this.sync.bind(this);
    this.tick = this.tick.bind(this);
    this.resize = () => { this.needsLayout = true; this.sync(); };
    this.scene.stage.addEventListener('notebook-rest', this.sync);
    document.addEventListener('visibilitychange', this.sync);
    this.reducedMotion.addEventListener('change', this.sync);
    window.addEventListener('resize', this.resize, { passive:true });
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(word);
    this.word.dataset.emergenceState = this.phase;
    this.frame = requestAnimationFrame(this.sync);
  }

  active() {
    return !document.hidden && !this.reducedMotion.matches && this.scene.enabled
      && this.scene.currentIndex === 0 && !this.scene.motion.moving
      && this.scene.motion.position < .5 && !this.scene.resizeFrame && !this.scene.frame;
  }

  sync() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0;
    this.running = this.active();
    if (this.canvas) {
      this.canvas.hidden = !this.running;
      this.canvas.dataset.running = String(this.running);
    }
    if (!this.running) {
      if (this.reducedMotion.matches) this.ink.style.opacity = '1';
      return;
    }
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'emergence-colony';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.canvas.dataset.running = 'true';
      this.scene.stage.append(this.canvas);
      this.context = this.canvas.getContext('2d');
      if (!this.context) { this.running = false; this.canvas.hidden = true; return; }
      const style = getComputedStyle(this.word);
      this.atlas = antSprites(style.color);
      const { samples, width, height } = letterSamples(this.word, style);
      this.localWidth = width;
      this.localHeight = height;
      const size = clamp(parseFloat(style.fontSize) / 100, .7, 1.1);
      this.ants = samples.map(sample => ({
        ...sample, u:sample.x / width, v:sample.y / height,
        releaseAt:hold + reveal + Math.random() * departure,
        speed:28 + Math.random() * 28, phase:Math.random() * tau,
        turn:0, size:spriteSize * size * (.85 + Math.random() * .3), released:false
      }));
      this.canvas.dataset.antCount = String(this.ants.length);
      this.corners = Array.from({ length:3 }, (_, index) => {
        const corner = document.createElement('span');
        corner.className = `emergence-corner emergence-corner-${index}`;
        corner.setAttribute('aria-hidden', 'true');
        this.word.append(corner);
        return corner;
      });
    }
    if (!this.ants.length) { this.running = false; this.canvas.hidden = true; return; }
    if (this.needsLayout) this.measure();
    this.ink.style.opacity = String(1 - .86 * clamp((this.elapsed - hold) / reveal));
    this.frame = requestAnimationFrame(this.tick);
  }

  measure() {
    const oldWidth = this.width, oldHeight = this.height;
    this.width = this.scene.width;
    this.height = this.scene.height;
    const ratio = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(maxPixels / (this.width * this.height)));
    this.canvas.width = Math.floor(this.width * ratio);
    this.canvas.height = Math.floor(this.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const [origin, horizontal, vertical] = this.corners.map(corner => corner.getBoundingClientRect());
    const inset = this.scene.stage.getBoundingClientRect();
    const axisX = { x:horizontal.x - origin.x, y:horizontal.y - origin.y };
    const axisY = { x:vertical.x - origin.x, y:vertical.y - origin.y };
    for (const ant of this.ants) {
      ant.startX = origin.x - inset.x + axisX.x * ant.u + axisY.x * ant.v;
      ant.startY = origin.y - inset.y + axisX.y * ant.u + axisY.y * ant.v;
      if (ant.released && oldWidth && oldHeight) {
        ant.x = clamp(ant.x / oldWidth * this.width, 4, this.width - 4);
        ant.y = clamp(ant.y / oldHeight * this.height, 4, this.height - 4);
      } else {
        ant.x = ant.startX;
        ant.y = ant.startY;
        const x = Math.cos(ant.angle), y = Math.sin(ant.angle);
        ant.heading = Math.atan2(axisX.y * x / this.localWidth + axisY.y * y / this.localHeight,
          axisX.x * x / this.localWidth + axisY.x * y / this.localHeight) + (Math.random() > .5 ? Math.PI : 0);
      }
    }
    this.bounds = null;
    this.needsLayout = false;
  }

  tick(time) {
    this.frame = 0;
    if (!this.active()) { this.sync(); return; }
    this.frame = requestAnimationFrame(this.tick);
    if (!this.lastTime) { this.lastTime = time; return; }
    const interval = time - this.lastTime;
    if (interval < 1000 / 30 - .5) return;
    const dt = Math.min(interval / 1000, .08);
    this.lastTime = time;
    this.elapsed += dt;
    this.draw(dt);
  }

  draw(dt) {
    if (this.elapsed <= hold) return;
    const fade = clamp((this.elapsed - hold) / reveal);
    if (fade < 1) this.ink.style.opacity = (1 - .86 * fade).toFixed(3);
    else if (this.ink.style.opacity !== '0.14') this.ink.style.opacity = '.14';
    const phase = this.elapsed >= hold + reveal + departure ? 'wandering' : 'revealing';
    if (this.phase !== phase) this.word.dataset.emergenceState = this.phase = phase;
    const context = this.context;
    if (this.bounds) context.clearRect(this.bounds.left, this.bounds.top, this.bounds.right - this.bounds.left, this.bounds.bottom - this.bounds.top);
    context.globalAlpha = fade * .94;
    let left = this.width, top = this.height, right = 0, bottom = 0;
    const cell = spriteSize * spriteScale;
    for (const ant of this.ants) {
      const age = this.elapsed - ant.releaseAt;
      if (age >= 0) {
        ant.released = true;
        ant.turn += (Math.sin(this.elapsed * 1.3 + ant.phase) * .8 - ant.turn) * dt * 1.5;
        ant.heading += ant.turn * dt;
        const distance = ant.speed * clamp(age / .45) * dt;
        ant.x += Math.cos(ant.heading) * distance;
        ant.y += Math.sin(ant.heading) * distance;
        if (ant.x < 4 || ant.x > this.width - 4) { ant.heading = Math.PI - ant.heading; ant.x = clamp(ant.x, 4, this.width - 4); }
        if (ant.y < 4 || ant.y > this.height - 4) { ant.heading = -ant.heading; ant.y = clamp(ant.y, 4, this.height - 4); }
      }
      const direction = Math.round(((ant.heading % tau + tau) % tau) / tau * directions) % directions;
      const gait = Math.floor(this.elapsed * 9 + ant.phase) % 2;
      const half = ant.size / 2;
      context.drawImage(this.atlas, direction * cell, gait * cell, cell, cell, ant.x - half, ant.y - half, ant.size, ant.size);
      left = Math.min(left, ant.x - half - 1);
      top = Math.min(top, ant.y - half - 1);
      right = Math.max(right, ant.x + half + 1);
      bottom = Math.max(bottom, ant.y + half + 1);
    }
    this.bounds = { left, top, right, bottom };
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.scene.stage.removeEventListener('notebook-rest', this.sync);
    document.removeEventListener('visibilitychange', this.sync);
    this.reducedMotion.removeEventListener('change', this.sync);
    window.removeEventListener('resize', this.resize);
    this.canvas?.remove();
    this.corners?.forEach(corner => corner.remove());
    this.ink.style.opacity = '';
    this.running = false;
  }
}
