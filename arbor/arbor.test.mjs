import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, layoutFor, measure, pointAt } from './growth.js';

const sizes = [[1440, 900], [1280, 720], [1920, 1080], [390, 844], [768, 1024], [2560, 1080]];
const names = ['about', 'memory', 'imagery', 'environment', 'uncertainty', 'latent', 'experiments',
  'activations', 'visualizer', 'climbing', 'compression', 'ascii', 'digilife', 'hello', 'you'];

test('the same seed grows the same cell', () => {
  const layout = layoutFor(1440, 900);
  const a = generate(4137, layout), b = generate(4137, layout);
  assert.deepEqual(a.segments, b.segments);
  assert.deepEqual(a.anchors, b.anchors);
  assert.notDeepEqual(generate(4138, layout).segments, a.segments);
});

test('every word has a finite anchor inside the page', () => {
  for (const [width, height] of sizes) for (const seed of [1, 777, 4137, 9999]) {
    const cell = generate(seed, layoutFor(width, height));
    for (const name of names) {
      const anchor = cell.anchors[name];
      assert.ok(anchor, `${name} missing at ${width}x${height}`);
      assert.ok(Number.isFinite(anchor.x) && Number.isFinite(anchor.y) && Number.isFinite(anchor.t));
      assert.ok(anchor.x > 0 && anchor.x < width && anchor.y > 0 && anchor.y < height, `${name} off the page at ${width}x${height}, seed ${seed}`);
    }
  }
});

test('each dendrite reaches its question and the axon reaches its terminal', () => {
  for (const [width, height] of sizes) {
    const layout = layoutFor(width, height);
    const cell = generate(2024, layout);
    for (const [name, target] of Object.entries(layout.dendrites)) {
      const end = cell.paths[name].at(-1);
      assert.ok(Math.hypot(end.x - target.x, end.y - target.y) < 12, `${name} stops short at ${width}x${height}`);
    }
    const end = cell.paths.axon.at(-1);
    assert.ok(Math.hypot(end.x - layout.terminal.x, end.y - layout.terminal.y) < 10);
  }
});

test('experiments are strung along the axon in order', () => {
  const cell = generate(51, layoutFor(1440, 900));
  const order = ['experiments', 'activations', 'visualizer', 'climbing', 'compression', 'ascii', 'digilife'];
  const distances = order.map(name => cell.anchors[name].d);
  assert.deepEqual([...distances].sort((a, b) => a - b), distances);
});

test('growth stays bounded and finite', () => {
  for (const [width, height] of sizes) {
    const cell = generate(99, layoutFor(width, height));
    assert.ok(cell.segments.length > 500 && cell.segments.length < 20000, `${cell.segments.length} segments`);
    assert.ok(cell.duration > 1000 && cell.duration < 6000, `${cell.duration} ms`);
    assert.ok(cell.segments.every(s => [s.x1, s.y1, s.x2, s.y2, s.w, s.t].every(Number.isFinite) && s.w > 0));
  }
});

test('a touch on the paper sprouts a twig from the nearest branch', () => {
  const cell = generate(8, layoutFor(1440, 900));
  const before = cell.segments.length;
  const nearest = (x, y) => Math.min(...cell.segments.map(s => Math.hypot(s.x2 - x, s.y2 - y)));
  let bare = null;
  for (let x = 40; x < 1400 && !bare; x += 37) for (let y = 40; y < 860 && !bare; y += 41) {
    const d = nearest(x, y);
    if (d > 40 && d < 180) bare = { x, y };
  }
  assert.ok(bare);
  assert.equal(cell.sprout(bare.x, bare.y, 1e6), true);
  assert.ok(cell.segments.length > before);
  assert.equal(cell.sprout(-5000, -5000, 1e6), false);
});

test('points are interpolated along measured paths', () => {
  const path = measure([{ x:0, y:0 }, { x:10, y:0 }, { x:10, y:10 }]);
  assert.deepEqual(pointAt(path, 15), { x:10, y:5 });
  assert.deepEqual(pointAt(path, 99), path.at(-1));
});
