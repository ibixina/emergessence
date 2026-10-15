// Grows one neuron from a seed. Pure geometry: no DOM, so it can be tested in Node.
// Dendrites reach toward the questions, the axon carries the experiments, and its
// terminal stops just short of another cell.

export const MS_PER_PX = 2.3;
const STEP = 4.5;

export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const turn = (to, from) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function layoutFor(width, height) {
  const portrait = width < 760 || (height > width && width < 1000);
  const at = (x, y) => ({ x:x * width, y:y * height });
  if (portrait) return {
    width, height, portrait, scale:Math.min(width, height) / 620,
    soma:at(.38, .47),
    dendrites:{
      memory:{ ...at(.13, .35), align:'above' },
      imagery:{ ...at(.46, .29), align:'above' },
      uncertainty:{ ...at(.83, .335), align:'above' },
      latent:{ ...at(.1, .51), align:'below' },
      environment:{ ...at(.17, .65), align:'below' }
    },
    terminal:at(.55, .84), boutonSides:['right', 'right'], experimentsAlign:'right', somaAlign:'right',
    other:{ x:width + 40, y:height + 30 }
  };
  return {
    width, height, portrait, scale:Math.min(width, height * 1.3) / 1000,
    soma:at(.42, .48),
    dendrites:{
      memory:{ ...at(.15, .29), align:'left' },
      imagery:{ ...at(.3, .155), align:'above' },
      uncertainty:{ ...at(.54, .17), align:'above' },
      latent:{ ...at(.17, .6), align:'left' },
      environment:{ ...at(.39, .82), align:'below' }
    },
    terminal:at(.85, .5), boutonSides:['below', 'above'], experimentsAlign:'above', somaAlign:'below-right',
    other:{ x:width + 40, y:height * .5 + 50 }
  };
}

export function measure(points) {
  let d = 0;
  return points.map((p, i) => {
    if (i) d += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    return { x:p.x, y:p.y, d };
  });
}

export function pointAt(path, distance) {
  if (distance <= 0) return path[0];
  for (let i = 1; i < path.length; i++) {
    if (path[i].d >= distance) {
      const a = path[i - 1], b = path[i], f = (distance - a.d) / (b.d - a.d || 1);
      return { x:a.x + (b.x - a.x) * f, y:a.y + (b.y - a.y) * f };
    }
  }
  return path[path.length - 1];
}

export function generate(seed, layout) {
  const rng = random(seed);
  const { soma, scale } = layout;
  const segments = [], dots = [], anchors = {}, paths = {};
  const groups = new Set(['soma', 'axon', 'terminal', 'you', 'extra']);
  let duration = 0;

  function push(x1, y1, x2, y2, w, t, g, faint = 0) {
    segments.push({ x1, y1, x2, y2, w, t, g, faint });
    if (t > duration) duration = t;
  }

  function crayon(points, color, g, spread, density, t) {
    for (const p of points) for (let i = 0; i < density; i++) {
      const angle = rng() * Math.PI * 2, r = Math.sqrt(rng()) * spread;
      dots.push({ x:p.x + Math.cos(angle) * r, y:p.y + Math.sin(angle) * r, r:.6 + rng() * 1.1, c:color, g, t:(p.t ?? t) + 350 });
    }
  }

  // A hand-drawn closed loop, retraced a little past its start the way a pen circles a point.
  function blob(cx, cy, radius, g, t, turns = 1.35, weight = 1.15) {
    const phase = rng() * 6.28, wobble = .1 + rng() * .08;
    let last = null;
    const n = Math.max(18, Math.round(radius * 3.2 * turns));
    for (let i = 0; i <= n; i++) {
      const a = phase + i / n * Math.PI * 2 * turns;
      const r = radius * (1 + wobble * Math.sin(3 * a + phase) + (i / n) * .12 + (rng() - .5) * .05);
      const p = { x:cx + Math.cos(a) * r, y:cy + Math.sin(a) * r };
      if (last) push(last.x, last.y, p.x, p.y, weight, t + i / n * 260, g);
      last = p;
    }
  }

  function branch(o) {
    let { x, y, angle, t } = o;
    const { width, end, g, depth, target, away, profile } = o;
    const length = target ? Math.hypot(target.x - x, target.y - y) : o.length;
    const points = [{ x, y, t }];
    let curl = 0, traveled = 0;
    const wander = o.wander ?? (depth ? .1 : .085);
    for (let guard = 0; guard < 900; guard++) {
      if (target) {
        const dx = target.x - x, dy = target.y - y, d = Math.hypot(dx, dy);
        if (d < (o.stop ?? 8)) break;
        const near = Math.max(0, 1 - d / length);
        angle += turn(Math.atan2(dy, dx), angle) * (.035 + .3 * near * near + (d < 40 ? .3 : 0));
      } else if (traveled >= length) break;
      curl = curl * .86 + (rng() - .5) * wander;
      angle += curl;
      if (away != null) angle += turn(away, angle) * .018;
      const progress = Math.min(1, traveled / (length * (target ? 1.12 : 1)));
      const w = (profile ? profile(progress) : width + (end - width) * progress) * (.9 + rng() * .2);
      const nx = x + Math.cos(angle) * STEP, ny = y + Math.sin(angle) * STEP;
      t += STEP * MS_PER_PX * (o.pace ?? 1);
      push(x, y, nx, ny, w, t, g);
      x = nx; y = ny; traveled += STEP;
      points.push({ x, y, t });
      const chance = o.branching ?? (depth === 0 ? .075 : depth === 1 ? .06 : .045);
      const clear = !target || traveled < length * .82;
      if (clear && depth < (o.maxDepth ?? 4) && traveled > 16 && rng() < chance) {
        const side = rng() < .5 ? -1 : 1;
        const remaining = target ? (28 + rng() * 80) * scale * (1 - progress * .6) : (length - traveled) * (.45 + rng() * .5);
        const childLength = remaining * .78 ** depth;
        if (childLength > 9) branch({ x, y, t, g, depth:depth + 1, width:Math.max(.45, w * .6), end:.32, length:childLength,
          angle:angle + side * (.35 + rng() * .65), away:away ?? angle, maxDepth:o.maxDepth, pace:1.25 });
      }
    }
    if (!target && depth < (o.maxDepth ?? 4) + 1 && length > 16 && rng() < .55) {
      for (const side of [-1, 1]) branch({ x, y, t, g, depth:depth + 1, width:Math.max(.4, end), end:.28,
        length:length * (.3 + rng() * .35), angle:angle + side * (.22 + rng() * .4), away, maxDepth:o.maxDepth, pace:1.25 });
    }
    return { x, y, angle, t, points };
  }

  // Faint pencil lines alongside part of an inked path: the drawing's first attempt.
  function construction(points, g) {
    const from = Math.floor(points.length * (.15 + rng() * .25)), to = Math.floor(points.length * (.6 + rng() * .35));
    const phase = rng() * 6, amp = 1.6 + rng() * 2.2;
    let last = null;
    for (let i = from; i < to; i++) {
      const p = points[i], q = points[Math.min(points.length - 1, i + 1)];
      const nx = -(q.y - p.y), ny = q.x - p.x, len = Math.hypot(nx, ny) || 1;
      const o = Math.sin(i * .08 + phase) * amp + amp * .6;
      const c = { x:p.x + nx / len * o, y:p.y + ny / len * o };
      if (last) push(last.x, last.y, c.x, c.y, .8, p.t + 200, g, 1);
      last = c;
    }
  }

  // The cell body.
  const somaRadius = 13 * Math.max(.8, Math.min(1.25, scale));
  blob(soma.x, soma.y, somaRadius, 'soma', 0, 1.6, 1.3);
  blob(soma.x + 1, soma.y - 1, somaRadius * .82, 'soma', 120, .9, .7);
  const somaFill = [];
  for (let i = 0; i < 14; i++) somaFill.push({ x:soma.x + (rng() - .5) * somaRadius * .9, y:soma.y + (rng() - .5) * somaRadius * .9, t:120 });
  crayon(somaFill, 'ochre', 'soma', somaRadius * .9, 40, 0);

  // Dendrites, each reaching for one question.
  const start = 380;
  const names = Object.keys(layout.dendrites);
  const teal = names[Math.floor(rng() * names.length)];
  for (const name of names) {
    groups.add(name);
    const target = layout.dendrites[name];
    const heading = Math.atan2(target.y - soma.y, target.x - soma.x);
    const root = heading + (rng() - .5) * .7;
    const grown = branch({ x:soma.x + Math.cos(root) * somaRadius, y:soma.y + Math.sin(root) * somaRadius, t:start,
      angle:root + (rng() - .5) * .9, g:name, depth:0, width:3.4 * Math.max(.75, scale), end:.95, target, away:heading });
    // a final tuft where the branch meets its word
    for (let i = 0; i < 3; i++) branch({ x:grown.x, y:grown.y, t:grown.t, g:name, depth:2, width:.7, end:.28,
      length:(12 + rng() * 22) * scale, angle:grown.angle + (rng() - .5) * 2.4, away:grown.angle, maxDepth:3, pace:1.4 });
    construction(grown.points, name);
    paths[name] = measure(grown.points);
    const gap = 14;
    const offsets = { left:[-gap, 0], right:[gap, 0], above:[0, -gap + 2], below:[0, gap - 2] };
    const [ox, oy] = offsets[target.align];
    anchors[name] = { x:grown.x + ox, y:grown.y + oy, align:target.align, t:grown.t - 120 };
    if (name === teal) {
      const span = grown.points.slice(Math.floor(grown.points.length * .35), Math.floor(grown.points.length * .55));
      crayon(span.filter((_, i) => i % 2 === 0), 'teal', name, 3.2, 6, start);
    }
  }

  // A few unnamed dendrites so the cell is a cell, not a diagram.
  const axonHeading = Math.atan2(layout.terminal.y - soma.y, layout.terminal.x - soma.x);
  for (let i = 0, made = 0; i < 20 && made < 3; i++) {
    const a = rng() * Math.PI * 2;
    if (Math.abs(turn(a, axonHeading)) < 1.1) continue;
    if (names.some(name => Math.abs(turn(a, Math.atan2(layout.dendrites[name].y - soma.y, layout.dendrites[name].x - soma.x))) < .45)) continue;
    branch({ x:soma.x + Math.cos(a) * somaRadius, y:soma.y + Math.sin(a) * somaRadius, t:start + 120, angle:a, away:a,
      g:'extra', depth:1, width:2 * Math.max(.75, scale), end:.4, length:(55 + rng() * 70) * scale, maxDepth:3 });
    made++;
  }

  // The axon: a bare initial segment, then the experiments strung along it.
  const axonStart = { x:soma.x + Math.cos(axonHeading) * somaRadius, y:soma.y + Math.sin(axonHeading) * somaRadius };
  const axon = branch({ ...axonStart, t:start, angle:axonHeading + (rng() - .5) * .5, g:'axon', depth:0, target:layout.terminal,
    branching:0, wander:.05, pace:.8, stop:6,
    profile:p => p < .06 ? 3.6 - (3.6 - 1.5) * p / .06 : 1.5 - .35 * p });
  construction(axon.points, 'axon');
  paths.axon = measure(axon.points);
  const axonLength = paths.axon[paths.axon.length - 1].d;
  const axonT = d => axon.points[Math.min(axon.points.length - 1, Math.round(d / STEP))].t;

  const exD = axonLength * .19, exP = pointAt(paths.axon, exD);
  const exOffset = { above:[0, -10], below:[0, 10], left:[-12, 0], right:[12, 0] }[layout.experimentsAlign];
  anchors.experiments = { x:exP.x + exOffset[0], y:exP.y + exOffset[1], align:layout.experimentsAlign, t:axonT(exD), d:exD };
  ['activations', 'visualizer', 'climbing', 'compression', 'ascii', 'digilife'].forEach((name, i) => {
    const d = axonLength * (.36 + i * .11), p = pointAt(paths.axon, d), t = axonT(d);
    const r = 3.4 + rng() * 1.2;
    blob(p.x, p.y, r, 'axon', t, 1.25, .9);
    crayon([{ ...p, t }], 'coral', 'axon', r * 1.3, 26, t);
    const align = layout.boutonSides[i % 2];
    const off = { above:[0, -9], below:[0, 9], left:[-11, 0], right:[11, 0] }[align];
    anchors[name] = { x:p.x + off[0], y:p.y + off[1], align, t, d };
  });

  // Terminal arbor: a small fan of knobs facing the gap.
  const end = paths.axon[paths.axon.length - 1];
  const tail = paths.axon[Math.max(0, paths.axon.length - 8)];
  const facing = Math.atan2(end.y - tail.y, end.x - tail.x);
  const knobs = [];
  [-.7, -.2, .3, .75].forEach(spread => {
    const twig = branch({ x:end.x, y:end.y, t:axon.t, angle:facing + spread + (rng() - .5) * .2, g:'terminal', depth:3,
      width:1.1, end:.6, length:(20 + rng() * 16) * Math.max(.8, scale), maxDepth:3, wander:.08, branching:0 });
    blob(twig.x, twig.y, 2.6, 'terminal', twig.t, 1.2, .9);
    crayon([{ x:twig.x, y:twig.y, t:twig.t }], 'blue', 'terminal', 4, 22, twig.t);
    knobs.push(twig);
  });
  const helloAlign = layout.portrait ? 'left' : 'above';
  anchors.hello = { x:end.x + (layout.portrait ? -34 : -4), y:end.y + (layout.portrait ? 0 : -40), align:helloAlign, t:axon.t + 180 };

  // Across the gap: the tip of someone else's dendrite.
  const knob = knobs[1];
  const other = { x:knob.x + Math.cos(facing) * 24 * Math.max(.8, scale), y:knob.y + Math.sin(facing) * 24 * Math.max(.8, scale) };
  const you = branch({ x:layout.other.x, y:layout.other.y, t:axon.t + 200, angle:Math.atan2(other.y - layout.other.y, other.x - layout.other.x),
    g:'you', depth:1, width:2.4, end:1.1, target:other, maxDepth:2, branching:.03, pace:.7, stop:3 });
  blob(you.x, you.y, 3.2, 'you', you.t, 1.2, 1);
  paths.gap = measure([{ x:knob.x, y:knob.y }, { x:you.x, y:you.y }]);
  anchors.you = layout.portrait
    ? { x:you.x + 12, y:you.y + 4, align:'right', t:you.t }
    : { x:you.x + 4, y:you.y + 16, align:'below', t:you.t };

  const somaAnchor = layout.somaAlign === 'right'
    ? { x:soma.x + somaRadius + 8, y:soma.y - 4, align:'right', t:300 }
    : { x:soma.x + somaRadius + 6, y:soma.y + somaRadius + 4, align:layout.somaAlign, t:300 };
  anchors.about = somaAnchor;

  function sprout(x, y, now) {
    let best = null, bestD = 260;
    for (const s of segments) {
      if (s.faint || s.g === 'you' || s.t > now) continue;
      const d = Math.hypot(s.x2 - x, s.y2 - y);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (!best || bestD < 14) return false;
    branch({ x:best.x2, y:best.y2, t:now, angle:Math.atan2(y - best.y2, x - best.x2) + (rng() - .5) * .8, g:best.g, depth:2,
      width:Math.min(1.1, best.w), end:.3, target:{ x, y }, maxDepth:4, branching:.05, pace:1.1 });
    return true;
  }

  return { segments, dots, anchors, paths, soma, groups:[...groups], duration, portrait:layout.portrait, sprout };
}
