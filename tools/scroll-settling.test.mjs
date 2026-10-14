import assert from 'node:assert/strict';
import test from 'node:test';
import { settledScrollPosition, ThoughtScene } from '../site/thought-scene.js';

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

test('large flings settle beside their destination rather than returning to their starting page', () => {
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
