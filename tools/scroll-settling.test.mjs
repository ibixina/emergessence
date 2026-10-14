import assert from 'node:assert/strict';
import test from 'node:test';
import { ScrollGesture, ScrollMotion, scrollGestureBounds, settledScrollPosition } from '../site/scroll-motion.js';
import { ThoughtScene } from '../site/thought-scene.js';

const stops = [
  { start:0, entrance:0, overflow:0 },
  { start:1000, entrance:500, overflow:0 },
  { start:2500, entrance:500, overflow:1200 },
  { start:5500, entrance:500, overflow:0 }
];

function finish(motion, frame = () => motion.step(1 / 60)) {
  for (let i = 0; i < 180 && motion.moving; i++) frame();
  assert.equal(motion.moving, false, 'the motion must come to rest');
}

test('native scrolls settle in their direction, and restored positions choose the closest page', () => {
  assert.equal(settledScrollPosition(stops, .25, 1), 1500);
  assert.equal(settledScrollPosition(stops, 1499.75, -1), 0);
  assert.equal(settledScrollPosition(stops, 700), 0);
  assert.equal(settledScrollPosition(stops, 800), 1500);
  assert.equal(settledScrollPosition(stops, -20, -1), 0);
  assert.equal(settledScrollPosition(stops, 6500, 1), 6000);
});

test('tall pages retain every reading position', () => {
  for (const offset of [3000, 3000.25, 3600.5, 4199.75, 4200]) {
    for (const direction of [-1, 0, 1]) assert.equal(settledScrollPosition(stops, offset, direction), offset);
  }
});

for (const delta of [.01, .25, 1, 10, 100, 5000]) {
  test(`a ${delta}px input starts a bounded page turn on the first frame`, () => {
    for (const [offset, direction, destination] of [[0, 1, 1500], [1500, -1, 0]]) {
      const gesture = new ScrollGesture(stops, offset);
      const motion = new ScrollMotion(offset);
      motion.target = gesture.move(delta * direction, motion.position);
      assert.equal(motion.target, destination);
      motion.step(1 / 60);
      assert.ok(direction * (motion.position - offset) > 1);
      assert.ok(direction * (destination - motion.position) > 0);
      finish(motion);
      assert.equal(motion.position, destination);
    }
  });
}

test('momentum shares one destination and never jumps to another page', () => {
  const gesture = new ScrollGesture(stops, 0);
  const motion = new ScrollMotion(0);
  for (const delta of [5000, 2000, 1000, 500, 100, 30, 5, .25]) {
    const previousVelocity = motion.velocity;
    motion.target = gesture.move(delta, motion.position);
    assert.equal(motion.target, 1500);
    assert.equal(motion.velocity, previousVelocity, 'input must not restart the easing');
    for (let i = 0; i < 6; i++) {
      const previous = motion.position;
      motion.step(1 / 60);
      assert.ok(motion.position >= previous);
      assert.ok(motion.position <= 1500);
    }
  }
  finish(motion);
  assert.equal(motion.position, 1500);
});

test('fractional reading input accumulates independently of the rendered scroll position', () => {
  const gesture = new ScrollGesture(stops, 3100);
  const motion = new ScrollMotion(3100);
  for (let i = 0; i < 8; i++) {
    motion.target = gesture.move(.25, motion.position);
    motion.step(1 / 60);
  }
  assert.equal(motion.target, 3102);
  finish(motion);
  assert.equal(motion.position, 3102);
});

test('a tall page finishes reading before another gesture can leave it', () => {
  const motion = new ScrollMotion(3000);
  const gesture = new ScrollGesture(stops, motion.position);
  motion.target = gesture.move(200, motion.position);
  finish(motion);
  assert.equal(motion.position, 3200);
  for (let i = 0; i < 10; i++) motion.target = gesture.move(5000, motion.position);
  finish(motion);
  assert.equal(motion.position, 4200);
  motion.target = new ScrollGesture(stops, motion.position).move(.25, motion.position);
  finish(motion);
  assert.equal(motion.position, 6000);
});

test('backward flings stop at the previous page bottom, then read back through its content', () => {
  const motion = new ScrollMotion(6000);
  for (const destination of [4200, 3000, 1500]) {
    const gesture = new ScrollGesture(stops, motion.position);
    for (let i = 0; i < 10; i++) motion.target = gesture.move(-5000, motion.position);
    finish(motion);
    assert.equal(motion.position, destination);
  }
});

test('reversing input changes direction without throwing away the current velocity', () => {
  const gesture = new ScrollGesture(stops, 0);
  const motion = new ScrollMotion(0);
  motion.target = gesture.move(.25, motion.position);
  motion.step(.1);
  const velocity = motion.velocity;
  motion.target = gesture.move(-.25, motion.position);
  assert.equal(motion.target, 0);
  assert.equal(motion.velocity, velocity);
  motion.step(.05);
  assert.ok(motion.velocity < 0, 'the reverse input must take effect promptly');
  finish(motion);
  assert.equal(motion.position, 0);
});

test('easing is consistent across frame rates and does not overshoot', () => {
  const single = new ScrollMotion(0);
  const frames = new ScrollMotion(0);
  single.target = frames.target = 1500;
  single.step(.1);
  for (let i = 0; i < 6; i++) frames.step(1 / 60);
  assert.ok(Math.abs(single.position - frames.position) < 1e-9);
  assert.ok(Math.abs(single.velocity - frames.velocity) < 1e-9);
  for (const seconds of [1 / 120, 1 / 60, 1 / 30, .2]) {
    const motion = new ScrollMotion(0);
    motion.target = 1500;
    finish(motion, () => {
      motion.step(seconds);
      assert.ok(motion.position >= 0 && motion.position <= 1500);
    });
  }
});

function sceneFixture(t, offset = 0) {
  const originals = { window:globalThis.window, document:globalThis.document, scrollY:globalThis.scrollY };
  t.after(() => Object.assign(globalThis, originals));
  t.mock.timers.enable({ apis:['setTimeout'] });
  globalThis.document = { hidden:false };
  globalThis.scrollY = Math.round(offset);
  const scene = Object.assign(Object.create(ThoughtScene.prototype), {
    stops, height:800, enabled:true, snapTimer:0, navigationTarget:null,
    motion:new ScrollMotion(offset), writtenScroll:null, scrollBounds:null,
    wheelGesture:null, wheelTimer:0, lastScroll:offset, scrollDirection:0, refresh() {}
  });
  const writes = [];
  globalThis.window = { scrollTo(options) {
    writes.push(options);
    globalThis.scrollY = Math.round(options.top);
  } };
  const wheel = (deltaY, options = {}) => {
    let prevented = false;
    scene.onWheel({ deltaY, deltaMode:0, preventDefault() { prevented = true; }, ...options });
    return prevented;
  };
  const frame = () => {
    scene.motion.step(1 / 60);
    const previousWrites = writes.length;
    scene.writeScroll();
    if (writes.length > previousWrites) scene.onScroll();
  };
  return { scene, wheel, frame, writes };
}

test('the idle timer ends the input gesture without interrupting an unfinished animation', t => {
  const { scene, wheel, frame } = sceneFixture(t);
  wheel(.25);
  frame();
  const velocity = scene.motion.velocity;
  t.mock.timers.tick(240);
  assert.equal(scene.wheelGesture, null);
  assert.equal(scene.motion.target, 1500);
  assert.equal(scene.motion.velocity, velocity);
  finish(scene.motion, frame);
  wheel(.25);
  assert.equal(scene.motion.target, 3000);
});

test('a new small gesture advances while the previous page turn is still settling', t => {
  const { scene, wheel, frame } = sceneFixture(t);
  wheel(.25);
  for (let i = 0; i < 18; i++) frame();
  assert.ok(scene.motion.position < 1500);
  const velocity = scene.motion.velocity;
  t.mock.timers.tick(240);
  wheel(.25);
  assert.equal(scene.motion.target, 3000);
  assert.equal(scene.motion.velocity, velocity);
  finish(scene.motion, frame);
  assert.equal(scene.motion.position, 3000);
});

test('rounded document scroll events preserve fractional motion and its velocity', t => {
  const { scene, frame } = sceneFixture(t, 3100.4);
  scene.motion.target = 3102.6;
  frame();
  const position = scene.motion.position;
  const velocity = scene.motion.velocity;
  finish(scene.motion, frame);
  assert.equal(scene.motion.position, 3102.6);
  assert.equal(scrollY, 3103);
  scene.motion.reset(position);
  scene.motion.velocity = velocity;
  scene.motion.target = 3102.6;
  scene.writeScroll();
  scene.onScroll();
  assert.equal(scene.motion.position, position);
  assert.equal(scene.motion.velocity, velocity);
});

test('native input interrupts the animation and becomes the scroll position', t => {
  const { scene, wheel, frame } = sceneFixture(t);
  wheel(.25);
  frame();
  globalThis.scrollY = 500;
  scene.onScroll();
  assert.equal(scene.motion.position, 500);
  assert.equal(scene.motion.target, 500);
  assert.equal(scene.motion.velocity, 0);
  assert.equal(scene.wheelGesture, null);
  assert.equal(scene.wheelTimer, 0);
});

test('native scrolling can return to an earlier document position written by the controller', t => {
  const { scene, wheel, frame } = sceneFixture(t);
  wheel(.25);
  frame();
  const written = scrollY;
  globalThis.scrollY = 500;
  scene.onScroll();
  globalThis.scrollY = written;
  scene.onScroll();
  assert.equal(scene.motion.position, written);
  assert.equal(scene.motion.target, written);
});

test('touch flings obey the gesture bounds in both directions', t => {
  const { scene, frame } = sceneFixture(t);
  for (const [offset, destination, expected] of [[0, 5500, 1500], [6000, 0, 4200], [3100, 6000, 4200]]) {
    scene.lastScroll = offset;
    scene.writtenScroll = null;
    scene.scrollBounds = scrollGestureBounds(stops, offset);
    scene.touching = true;
    globalThis.scrollY = destination;
    scene.onScroll();
    assert.equal(scene.motion.position, expected);
    scene.touching = false;
    scene.scheduleSnap();
    t.mock.timers.tick(240);
    finish(scene.motion, frame);
    assert.equal(scene.motion.position, expected);
  }
});

test('line and page wheel units accumulate the right reading distance', t => {
  const { scene, wheel, frame } = sceneFixture(t, 3000);
  wheel(3, { deltaMode:1 });
  assert.equal(scene.motion.target, 3096);
  finish(scene.motion, frame);
  t.mock.timers.tick(240);
  wheel(1, { deltaMode:2 });
  assert.equal(scene.motion.target, 3896);
  finish(scene.motion, frame);
  assert.equal(scene.motion.position, 3896);
});

test('reduced motion, pinch zoom, horizontal input, and handled events retain native behavior', t => {
  const { scene, wheel, writes } = sceneFixture(t);
  assert.equal(wheel(100, { ctrlKey:true }), false);
  assert.equal(wheel(0, { deltaX:100 }), false);
  assert.equal(wheel(100, { defaultPrevented:true }), false);
  scene.enabled = false;
  assert.equal(wheel(100), false);
  assert.equal(scene.motion.target, 0);
  assert.deepEqual(writes, []);
});

test('pointer, navigation, and visibility interruptions clear the gesture and stop motion', t => {
  const { scene, wheel, frame } = sceneFixture(t);
  wheel(.25);
  frame();
  const position = scene.motion.position;
  scene.cancelSnap();
  t.mock.timers.tick(500);
  assert.equal(scene.wheelGesture, null);
  assert.equal(scene.motion.position, position);
  assert.equal(scene.motion.target, position);
  assert.equal(scene.motion.velocity, 0);
});

test('held gestures and reduced motion do not start a settle animation', t => {
  const { scene } = sceneFixture(t, 100);
  for (const state of [{ enabled:false }, { enabled:true, pointerDown:true }, { enabled:true, pointerDown:false, touching:true }]) {
    Object.assign(scene, state);
    scene.scheduleSnap();
    scene.settle();
    t.mock.timers.tick(500);
    assert.equal(scene.motion.target, 100);
  }
});
