import assert from 'node:assert/strict';
import test from 'node:test';
import { scrollGestureBounds, settledScrollPosition, ThoughtScene } from '../site/thought-scene.js';

const stops = [
  { start:0, entrance:0, overflow:0 },
  { start:1000, entrance:500, overflow:0 },
  { start:2500, entrance:500, overflow:1200 },
  { start:5500, entrance:500, overflow:0 }
];
const settle = (offset, direction = 0) => settledScrollPosition(stops, offset, direction, 64);

test('a deliberate forward scroll reaches the next page even early in the transition', () => {
  assert.equal(settle(100, 1), 1500);
  assert.equal(settle(1600, 1), 3000);
});

test('a small accidental nudge returns to the current page', () => {
  assert.equal(settle(30, 1), 0);
  assert.equal(settle(1470, -1), 1500);
});

test('a deliberate backward scroll returns to the previous page', () => {
  assert.equal(settle(1400, -1), 0);
  assert.equal(settle(2900, -1), 1500);
});

test('tall pages retain every reading position in either direction', () => {
  for (const offset of [3000, 3100, 3600, 4190, 4200]) {
    for (const direction of [-1, 0, 1]) assert.equal(settle(offset, direction), offset);
  }
});

test('leaving a tall page advances only after its bottom has been read', () => {
  assert.equal(settle(4230, 1), 4200);
  assert.equal(settle(4300, 1), 6000);
  assert.equal(settle(5900, -1), 4200);
});

test('unbounded restored positions settle beside their destination', () => {
  assert.equal(settle(4500, 1), 6000);
  assert.equal(settle(2900, -1), 1500);
});

test('restored positions choose the nearest page and document edges stay bounded', () => {
  assert.equal(settle(700), 0);
  assert.equal(settle(800), 1500);
  assert.equal(settle(-20, -1), 0);
  assert.equal(settle(6500, 1), 6000);
});

test('reduced motion and held gestures never start a snap', () => {
  for (const state of [{ enabled:false }, { enabled:true, pointerDown:true }, { enabled:true, touching:true }]) {
    const scene = Object.assign(Object.create(ThoughtScene.prototype), { snapTimer:0, snapTarget:100 }, state);
    scene.scheduleSnap();
    scene.settle();
    assert.equal(scene.snapTimer, 0);
    assert.equal(scene.snapTarget, null);
  }
});

test('new input cancels an animated snap at the current scroll position', t => {
  const originalWindow = globalThis.window;
  const originalScroll = globalThis.scrollY;
  t.after(() => { globalThis.window = originalWindow; globalThis.scrollY = originalScroll; });
  const calls = [];
  globalThis.scrollY = 350;
  globalThis.window = { scrollTo:options => calls.push(options) };
  const scene = Object.assign(Object.create(ThoughtScene.prototype), { snapTimer:0, snapTarget:1500, navigationTarget:null });
  scene.cancelSnap();
  assert.equal(scene.snapTarget, null);
  assert.deepEqual(calls, [{ top:350, behavior:'instant' }]);
});

function wheelScene(t, offset = 0) {
  const originals = { window:globalThis.window, document:globalThis.document, scrollY:globalThis.scrollY };
  t.after(() => Object.assign(globalThis, originals));
  t.mock.timers.enable({ apis:['setTimeout'] });
  globalThis.document = { hidden:false };
  globalThis.scrollY = offset;
  const scene = Object.assign(Object.create(ThoughtScene.prototype), {
    stops, height:800, enabled:true, snapTimer:0, snapTarget:null, navigationTarget:null,
    scrollBounds:null, lastScroll:offset, scrollDirection:0, refresh() {}
  });
  globalThis.window = { scrollTo({ top }) {
    const changed = globalThis.scrollY !== top;
    globalThis.scrollY = top;
    if (changed) scene.onScroll();
  } };
  const wheel = (deltaY, options = {}) => {
    let prevented = false;
    scene.onWheel({ deltaY, deltaMode:0, preventDefault() { prevented = true; }, ...options });
    return prevented;
  };
  return { scene, wheel };
}

test('large wheel bursts and momentum advance only one page per gesture', t => {
  const { wheel } = wheelScene(t);
  for (let i = 0; i < 12; i++) {
    assert.equal(wheel(5000), true);
    assert.equal(scrollY, 1500);
    t.mock.timers.tick(100);
  }
  // A late momentum event still belongs to the same gesture.
  t.mock.timers.tick(100);
  wheel(120);
  assert.equal(scrollY, 1500);
  t.mock.timers.tick(240);
  wheel(5000);
  assert.equal(scrollY, 3000);
});

test('backward wheel momentum stops at the preceding page', t => {
  const { wheel } = wheelScene(t, 6000);
  for (let i = 0; i < 10; i++) wheel(-5000);
  assert.equal(scrollY, 4200);
  t.mock.timers.tick(240);
  wheel(-5000);
  assert.equal(scrollY, 3000);
  t.mock.timers.tick(240);
  wheel(-5000);
  assert.equal(scrollY, 1500);
});

test('a tall page must finish scrolling before the next gesture can leave it', t => {
  const { wheel } = wheelScene(t, 3000);
  wheel(200);
  assert.equal(scrollY, 3200);
  t.mock.timers.tick(240);
  assert.equal(scrollY, 3200);
  for (let i = 0; i < 10; i++) wheel(5000);
  assert.equal(scrollY, 4200);
  t.mock.timers.tick(240);
  wheel(5000);
  assert.equal(scrollY, 6000);
});

test('small wheel nudges settle back while deliberate scrolling turns the page', t => {
  const { wheel } = wheelScene(t);
  wheel(30);
  t.mock.timers.tick(240);
  assert.equal(scrollY, 0);
  wheel(100);
  t.mock.timers.tick(240);
  assert.equal(scrollY, 1500);
});

test('line and page wheel units produce consistent movement', t => {
  const { wheel } = wheelScene(t, 3000);
  wheel(3, { deltaMode:1 });
  assert.equal(scrollY, 3096);
  t.mock.timers.tick(240);
  wheel(1, { deltaMode:2 });
  assert.equal(scrollY, 3896);
});

test('native touch flings obey the gesture bounds in both directions', t => {
  const { scene } = wheelScene(t);
  for (const [offset, destination, expected] of [[0, 5500, 1500], [6000, 0, 4200], [3100, 6000, 4200]]) {
    scene.lastScroll = offset;
    scene.scrollBounds = scrollGestureBounds(stops, offset);
    scene.touching = true;
    globalThis.scrollY = destination;
    scene.onScroll();
    assert.equal(scrollY, expected);
    scene.touching = false;
    scene.scheduleSnap();
    t.mock.timers.tick(240);
    assert.equal(scrollY, expected);
  }
});

test('reduced motion, pinch zoom, horizontal input, and handled events keep native behavior', t => {
  const { scene, wheel } = wheelScene(t);
  assert.equal(wheel(100, { ctrlKey:true }), false);
  assert.equal(wheel(0, { deltaX:100 }), false);
  assert.equal(wheel(100, { defaultPrevented:true }), false);
  scene.enabled = false;
  assert.equal(wheel(100), false);
  assert.equal(scrollY, 0);
  assert.equal(scene.scrollBounds, null);
});

test('navigation or other input releases the wheel gesture bounds', t => {
  const { scene, wheel } = wheelScene(t);
  wheel(5000);
  assert.ok(scene.scrollBounds);
  scene.cancelSnap();
  assert.equal(scene.scrollBounds, null);
  globalThis.scrollY = 6000;
  scene.onScroll();
  assert.equal(scrollY, 6000);
});
