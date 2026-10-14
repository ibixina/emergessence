const columns = 48;
const rows = 8;
const palette = [[108, 170, 160], [131, 167, 201], [166, 133, 170], [217, 149, 133], [225, 180, 83]];

function color(u) {
  const position = u * (palette.length - 1);
  const index = Math.min(palette.length - 2, Math.floor(position));
  const mix = position - index;
  return `rgb(${palette[index].map((value, channel) => Math.round(value + (palette[index + 1][channel] - value) * mix)).join(',')})`;
}

function surface(u, v) {
  const t = Math.PI * (1.5 + 3 * u);
  return { x:t * Math.cos(t), y:15 * (v - .5), z:t * Math.sin(t) };
}

const samples = Array.from({ length:(columns + 1) * (rows + 1) }, (_, index) => {
  const u = Math.floor(index / (rows + 1)) / columns;
  const v = (index % (rows + 1)) / rows;
  return { u, v, ...surface(u, v), color:color(u) };
});
const pathHeight = u => .5 + .18 * Math.sin(u * Math.PI * 2);
const trajectory = Array.from({ length:97 }, (_, index) => {
  const u = index / 96;
  return { u, v:pathHeight(u), ...surface(u, pathHeight(u)) };
});
const number = value => value.toFixed(2);
const pointString = point => `${number(point.x)},${number(point.y)}`;
const pathString = points => points.map((point, index) => `${index ? 'L' : 'M'}${pointString(point)}`).join(' ');

function project(point, angle) {
  const x = point.x * Math.cos(angle) + point.z * Math.sin(angle);
  const depth = point.z * Math.cos(angle) - point.x * Math.sin(angle);
  return { x:230 + x * 11.5, y:180 - point.y * 7 + depth * 6, depth:(depth * 7 + point.y * 6) / Math.hypot(7, 6) };
}

function coordinates(point) {
  return { x:48 + point.u * 260, y:282 - point.v * 190 };
}

function neighbor(point, selected) {
  return ((point.u - selected.u) / .085) ** 2 + ((point.v - selected.v) / .22) ** 2 <= 1;
}

function dot(point, position, selected) {
  const close = neighbor(point, selected);
  return `<circle class="latent-sample" data-sample="${point.u}:${point.v}" data-neighbor="${close}" cx="${number(position.x)}" cy="${number(position.y)}" r="${close ? 3.7 : 2.3}" style="fill:${point.color};fill-opacity:${close ? 1 : .66};stroke:${close ? 'var(--accent)' : 'none'};stroke-width:.9"/>`;
}

function marker(point) {
  return `<circle class="latent-selection" cx="${number(point.x)}" cy="${number(point.y)}" r="6" style="fill:var(--paper);stroke:var(--accent);stroke-width:2"/><circle cx="${number(point.x)}" cy="${number(point.y)}" r="2" style="fill:var(--accent)"/>`;
}

function observedView(angle, selected) {
  const projected = samples.map(point => project(point, angle));
  const elements = [];
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const index = column * (rows + 1) + row;
      const corners = [projected[index], projected[index + rows + 1], projected[index + rows + 2], projected[index + 1]];
      elements.push({
        depth:corners.reduce((sum, point) => sum + point.depth, 0) / 4,
        markup:`<polygon points="${corners.map(pointString).join(' ')}" style="fill:var(--paper);fill-opacity:.94;stroke:${color(column / columns)};stroke-opacity:.25;stroke-width:.65"/>`
      });
    }
  }
  samples.forEach((point, index) => elements.push({ depth:projected[index].depth - .05, markup:dot(point, projected[index], selected) }));
  const route = trajectory.map(point => project(point, angle));
  for (let index = 1; index < route.length; index++) {
    elements.push({
      depth:(route[index - 1].depth + route[index].depth) / 2 - .1,
      markup:`<path class="latent-trajectory" d="${pathString(route.slice(index - 1, index + 1))}" style="stroke:var(--accent);stroke-width:1.8"/>`
    });
  }
  const location = project(surface(selected.u, selected.v), angle);
  elements.sort((a, b) => b.depth - a.depth);
  return `<text x="24" y="34">observations x ∈ ℝ³</text>${elements.map(element => element.markup).join('')}${marker(location)}<text class="latent-annotation" x="24" y="343">a folded surface in three dimensions</text>`;
}

function coordinateView(selected) {
  const grid = Array.from({ length:5 }, (_, index) => {
    const u = (index + 1) / 6;
    return `<path d="M${48 + u * 260} 92 V282 M48 ${92 + u * 190} H308" class="latent-grid"/>`;
  }).join('');
  const center = coordinates(selected);
  return `<text x="24" y="34">latent coordinates z = (u, v)</text>${grid}<path class="latent-axes" d="M48 78 V282 H323 M42 86 L48 78 L54 87 M315 276 L323 282 L315 288"/>${samples.map(point => dot(point, coordinates(point), selected)).join('')}<path class="latent-trajectory" d="${pathString(trajectory.map(coordinates))}" style="stroke:var(--accent);stroke-width:1.8"/><path class="latent-guides" d="M48 ${number(center.y)} H${number(center.x)} V282"/>${marker(center)}<text x="324" y="305" class="latent-annotation">u</text><text x="22" y="82" class="latent-annotation">v</text><text x="38" y="305" class="latent-annotation">0</text><text x="300" y="305" class="latent-annotation">1</text><text x="24" y="343" class="latent-annotation">two coordinates on the same surface</text>`;
}

export function latentStudy() {
  return `<figure class="working-study latent-study"><div class="latent-views"><svg class="study-sketch latent-plot latent-observed" viewBox="0 0 460 360" role="img" aria-label="A Swiss-roll surface with colored samples and a highlighted neighborhood in three observed dimensions."></svg><svg class="study-sketch latent-plot latent-coordinates" viewBox="0 0 350 360" role="img" aria-label="The same samples and highlighted neighborhood in their two intrinsic coordinates."></svg></div><div class="latent-controls"><label for="latent-position">Trace a path<input id="latent-position" type="range" min="0" max="100" value="42" step="1"><output for="latent-position" class="latent-position-value"></output></label><label for="latent-angle">Rotate the surface<input id="latent-angle" type="range" min="-180" max="180" value="-110" step="1"><output for="latent-angle" class="latent-angle-value">−110°</output></label></div><figcaption>The same points, colors, and neighborhood in both views. Trace the path or rotate the Swiss roll to compare local structure with the 3D projection.</figcaption></figure>`;
}

export function initializeLatentStudy(container) {
  const position = container.querySelector('#latent-position');
  const angle = container.querySelector('#latent-angle');
  const observed = container.querySelector('.latent-observed');
  const latent = container.querySelector('.latent-coordinates');
  const positionValue = container.querySelector('.latent-position-value');
  const angleValue = container.querySelector('.latent-angle-value');
  let frame = 0;
  let previousPosition;
  function render() {
    frame = 0;
    const u = Number(position.value) / 100;
    const selected = { u, v:pathHeight(u) };
    observed.innerHTML = observedView(Number(angle.value) * Math.PI / 180, selected);
    if (u !== previousPosition) {
      latent.innerHTML = coordinateView(selected);
      const value = `(${number(u)}, ${number(selected.v)})`;
      positionValue.textContent = `z = ${value}`;
      position.setAttribute('aria-valuetext', `Latent coordinates ${value}`);
      previousPosition = u;
    }
    angleValue.textContent = `${angle.value}°`;
    angle.setAttribute('aria-valuetext', `${angle.value} degrees`);
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
  position.addEventListener('input', schedule);
  angle.addEventListener('input', schedule);
  render();
}
