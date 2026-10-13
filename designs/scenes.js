const TAU = Math.PI * 2;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function scrollProgress() {
  return clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
}

const vertexSource = `
  attribute vec3 aPosition;
  attribute vec2 aUV;
  uniform vec3 uLens;
  uniform float uCamera;
  varying vec2 vUV;
  varying float vDepth;
  void main() {
    float depth = aPosition.z - uCamera;
    float near = 100.0;
    float far = 9000.0;
    float clipDepth = (far + near) / (far - near) * depth - 2.0 * far * near / (far - near);
    gl_Position = vec4(aPosition.x * uLens.x, -aPosition.y * uLens.y + uLens.z * depth, clipDepth, depth);
    vUV = aUV;
    vDepth = depth;
  }
`;

const fragmentSource = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform bool uTextured;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUV;
  varying float vDepth;
  void main() {
    vec4 ink = uTextured ? texture2D(uTexture, vUV) : vec4(uColor, 1.0);
    float fog = 1.0 - smoothstep(2200.0, 6800.0, vDepth);
    float nearFade = smoothstep(100.0, 340.0, vDepth);
    float alpha = ink.a * uOpacity * fog * nearFade;
    gl_FragColor = vec4(ink.rgb * alpha, alpha);
  }
`;

function shader(gl, type, source) {
  const compiled = gl.createShader(type);
  gl.shaderSource(compiled, source);
  gl.compileShader(compiled);
  if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(compiled));
  return compiled;
}

function uploadBuffer(gl, vertices) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  return { buffer, count: vertices.length / 5 };
}

function neuronSurface(neuron, aspect) {
  const vertices = [];
  const columns = 12, rows = 8;
  const size = 1760 * neuron.scale;
  const cosine = Math.cos(neuron.rotation), sine = Math.sin(neuron.rotation);
  const cosTilt = Math.cos(neuron.tilt), sinTilt = Math.sin(neuron.tilt);
  function point(u, v) {
    const localX = (u - .5) * size;
    const localY = (v - .5) * size * aspect;
    const bend = Math.sin(u * TAU + neuron.phase) * Math.sin(v * Math.PI) * neuron.bend;
    const x = localX * cosTilt;
    return [
      neuron.x + x * cosine - localY * sine,
      neuron.y + x * sine + localY * cosine,
      neuron.z + localX * sinTilt + bend,
      neuron.mirror ? 1 - u : u, v
    ];
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = point(column / columns, row / rows);
      const b = point((column + 1) / columns, row / rows);
      const c = point((column + 1) / columns, (row + 1) / rows);
      const d = point(column / columns, (row + 1) / rows);
      vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  return vertices;
}

function makeFibers(neurons) {
  const vertices = [];
  function addLine(points) {
    for (let i = 1; i < points.length; i++) vertices.push(...points[i - 1], 0, 0, ...points[i], 0, 0);
  }
  for (let strand = 0; strand < 16; strand++) {
    const points = [];
    const angle = strand * 2.39996;
    const radius = 240 + (strand % 5) * 150;
    for (let z = -1000; z <= 13700; z += 75) {
      points.push([
        Math.cos(angle) * radius + 70 * Math.sin(z / 1300 + angle),
        Math.sin(angle) * radius * .66 + 55 * Math.sin(z / 1500 + angle * 1.4), z
      ]);
    }
    addLine(points);
  }
  for (let index = 0; index < neurons.length - 1; index++) {
    const from = neurons[index], to = neurons[index + 1];
    for (let strand = 0; strand < 3; strand++) {
      const points = [];
      for (let step = 0; step <= 60; step++) {
        const t = step / 60, ease = smooth(t), arc = Math.sin(t * Math.PI);
        points.push([
          from.x + (to.x - from.x) * ease + arc * (90 + strand * 5),
          from.y + (to.y - from.y) * ease + arc * Math.sin(index + .8) * 120 + arc * strand * 4,
          from.z + (to.z - from.z) * t
        ]);
      }
      addLine(points);
    }
  }
  return vertices;
}

export class NeuralScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    this.fallback = this.gl ? null : canvas.getContext('2d');
    this.progress = scrollProgress();
    this.targetProgress = this.progress;
    this.width = this.height = 1;
    this.frame = this.lastTime = 0;
    this.ready = false;
    this.animate = this.animate.bind(this);
    this.resize = this.resize.bind(this);
    this.refresh = this.refresh.bind(this);
    this.neurons = [
      { x: 0, y: 0, z: 0, scale: 1, rotation: 0, tilt: 0, bend: 110, phase: 0 },
      { x: -430, y: -130, z: 1900, scale: 1.06, rotation: -.36, tilt: .82, bend: 230, phase: .8 },
      { x: 510, y: 100, z: 3550, scale: 1.08, rotation: .39, tilt: -.72, bend: 210, phase: 1.6 },
      { x: -560, y: 200, z: 5250, scale: 1.15, rotation: .12, tilt: .91, bend: 200, phase: 2.4 },
      { x: 570, y: -160, z: 6950, scale: 1.1, rotation: -.34, tilt: -.78, bend: 240, phase: 3.2 },
      { x: -440, y: -40, z: 8650, scale: 1.12, rotation: .28, tilt: .74, bend: 200, phase: 4 },
      { x: 530, y: 170, z: 10350, scale: 1.05, rotation: -.39, tilt: -.89, bend: 230, phase: 4.8 },
      { x: -380, y: -110, z: 12050, scale: 1.12, rotation: .18, tilt: .83, bend: 200, phase: 5.6 }
    ].map((neuron, index) => ({ ...neuron, mirror: index % 3 === 2, first: index === 0 }));
    if (this.gl) this.initializeRenderer();
    new ResizeObserver(this.resize).observe(canvas.parentElement);
    window.addEventListener('scroll', this.refresh, { passive: true });
    window.addEventListener('resize', this.resize, { passive: true });
    reducedMotion.addEventListener('change', this.refresh);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.frame); this.frame = this.lastTime = 0; }
      else this.refresh();
    });
    this.image = new Image();
    this.image.decoding = 'async';
    this.image.onload = () => {
      if (this.gl) this.loadArtwork();
      this.ready = true;
      canvas.dataset.asset = 'ready';
      this.resize();
    };
    this.image.onerror = () => { canvas.dataset.asset = 'error'; };
    this.image.src = new URL('../site/assets/neuron.png', import.meta.url).href;
    this.resize();
  }

  initializeRenderer() {
    const gl = this.gl;
    const program = gl.createProgram();
    const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    gl.useProgram(program);
    this.attributes = { position: gl.getAttribLocation(program, 'aPosition'), uv: gl.getAttribLocation(program, 'aUV') };
    this.uniforms = Object.fromEntries(['uLens', 'uCamera', 'uTexture', 'uTextured', 'uColor', 'uOpacity'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.enableVertexAttribArray(this.attributes.position);
    gl.enableVertexAttribArray(this.attributes.uv);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.fibers = uploadBuffer(gl, makeFibers(this.neurons));
    this.canvas.dataset.renderer = 'webgl';
  }

  loadArtwork() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(this.uniforms.uTexture, 0);
    const aspect = this.image.naturalHeight / this.image.naturalWidth;
    this.meshes = this.neurons.map(neuron => ({ ...uploadBuffer(gl, neuronSurface(neuron, aspect)), first: neuron.first })).reverse();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    else this.fallback.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.refresh();
  }

  refresh() {
    this.targetProgress = scrollProgress();
    if (!this.frame && !document.hidden) this.frame = requestAnimationFrame(this.animate);
  }

  animate(time) {
    const elapsed = Math.min(50, this.lastTime ? time - this.lastTime : 16);
    this.lastTime = time;
    const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 90);
    this.progress += (this.targetProgress - this.progress) * blend;
    this.draw();
    if (Math.abs(this.progress - this.targetProgress) > .00003) this.frame = requestAnimationFrame(this.animate);
    else this.frame = this.lastTime = 0;
  }

  bind(buffer) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(this.attributes.uv, 2, gl.FLOAT, false, 20, 12);
  }

  draw() {
    if (!this.ready) return;
    const progress = reducedMotion.matches ? 0 : this.progress;
    const camera = -1750 + progress * 10600;
    const focal = Math.max(this.width * .76, 400);
    const field = smooth(progress / .065);
    this.canvas.dataset.progress = progress.toFixed(4);
    this.canvas.dataset.cameraDepth = Math.round(camera);
    this.canvas.dataset.cameraX = '0';
    this.canvas.dataset.cameraYaw = '0';
    if (!this.gl) {
      const context = this.fallback;
      const width = 1760 * focal / 1750;
      const height = width * this.image.naturalHeight / this.image.naturalWidth;
      context.clearRect(0, 0, this.width, this.height);
      context.globalAlpha = .92;
      context.drawImage(this.image, (this.width - width) / 2, this.height * .37 - height / 2, width, height);
      return;
    }
    const gl = this.gl, uniforms = this.uniforms;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3f(uniforms.uLens, focal * 2 / this.width, focal * 2 / this.height, .26);
    gl.uniform1f(uniforms.uCamera, camera);
    if (field > 0) {
      this.bind(this.fibers.buffer);
      gl.uniform1i(uniforms.uTextured, 0);
      gl.uniform3f(uniforms.uColor, .16, .14, .18);
      gl.uniform1f(uniforms.uOpacity, field * .24);
      gl.drawArrays(gl.LINES, 0, this.fibers.count);
    }
    gl.uniform1i(uniforms.uTextured, 1);
    for (const mesh of this.meshes) {
      if (!mesh.first && !field) continue;
      this.bind(mesh.buffer);
      gl.uniform1f(uniforms.uOpacity, mesh.first ? .92 : field * .67);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
  }
}

export function attachArtworkMotion(image, hero) {
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0;
  function draw() {
    x += (targetX - x) * .13;
    y += (targetY - y) * .13;
    const scroll = Math.min(window.scrollY, hero.offsetHeight);
    image.style.transform = reducedMotion.matches ? 'none' : `translate3d(${x * 13}px,${y * 9 - scroll * .08}px,0) rotate(${x * .34}deg)`;
    image.style.opacity = String(1 - smooth((scroll / hero.offsetHeight - .68) / .45));
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .001) frame = requestAnimationFrame(draw);
    else frame = 0;
  }
  function requestFrame() { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); }
  hero.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType !== 'mouse') return;
    targetX = (event.clientX / window.innerWidth - .5) * 2;
    targetY = (event.clientY / window.innerHeight - .5) * 2;
    requestFrame();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { targetX = targetY = 0; requestFrame(); });
  window.addEventListener('scroll', requestFrame, { passive: true });
  reducedMotion.addEventListener('change', requestFrame);
  requestFrame();
}
