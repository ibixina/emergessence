import assert from 'node:assert/strict';
import test from 'node:test';
import { PATTERNS, trainMemories, networkEnergy, updateMemory, shuffledIndices, disruptPattern } from './memory.js';
import { makeFlock, stepFlock, scatterFlock } from './systems.js';
import { PLACES, PARADOX_VIEW, createSculptureModel, cubeMesh, project, tracePoint, insideBody } from './geometry.js';

function seededRandom(seed) {
  return () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
}

const weights = trainMemories(PATTERNS);

test('learned connections are symmetric with no self-feedback', () => {
  for (let i = 0; i < 64; i++) {
    assert.equal(weights[i * 64 + i], 0);
    for (let j = 0; j < 64; j++) assert.equal(weights[i * 64 + j], weights[j * 64 + i]);
  }
});

test('each original memory is a stable state', () => {
  for (const pattern of PATTERNS) assert.deepEqual(updateMemory(weights, pattern, shuffledIndices(64, seededRandom(7))), pattern);
});

test('disruption flips the requested number of distinct pixels', () => {
  for (const percentage of [0, 12, 22, 60]) {
    const cue = disruptPattern(PATTERNS[0], percentage, seededRandom(13));
    assert.equal(cue.filter((value, index) => value !== PATTERNS[0][index]).length, Math.round(64 * percentage / 100));
  }
});

test('individual asynchronous updates never increase network energy', () => {
  for (const pattern of PATTERNS) {
    for (let seed = 1; seed <= 8; seed++) {
      const random = seededRandom(seed);
      let state = disruptPattern(pattern, 35, random);
      for (let sweep = 0; sweep < 4; sweep++) {
        for (const index of shuffledIndices(64, random)) {
          const next = updateMemory(weights, state, [index]);
          assert.ok(networkEnergy(weights, next) <= networkEnergy(weights, state) + 1e-9);
          state = next;
        }
      }
    }
  }
});

test('partial cues recover all three memories in deterministic trials', () => {
  for (const pattern of PATTERNS) {
    for (const seed of [3, 7, 13]) {
      const random = seededRandom(seed);
      let state = disruptPattern(pattern, 12, random);
      for (let sweep = 0; sweep < 12; sweep++) state = updateMemory(weights, state, shuffledIndices(64, random));
      assert.deepEqual(state, pattern);
    }
  }
});

test('flock updates stay finite, bounded, and preserve the population', () => {
  let flock = makeFlock(180, 700, 350, seededRandom(15));
  for (let step = 0; step < 200; step++) flock = stepFlock(flock, 700, 350, .75, {x:350,y:175});
  assert.equal(flock.length, 180 * 4);
  assert.ok(flock.every(Number.isFinite));
  for (let i = 0; i < flock.length; i += 4) {
    assert.ok(flock[i] >= 0 && flock[i] < 700 && flock[i+1] >= 0 && flock[i+1] < 350);
    assert.ok(Math.hypot(flock[i+2],flock[i+3]) <= 2.40001);
  }
});

test('local alignment changes motion while zero influence leaves a distant pair alone', () => {
  const flock = new Float64Array([100,100,1.5,0,145,100,0,1.5]);
  const isolated = stepFlock(flock, 600, 300, 0);
  const together = stepFlock(flock, 600, 300, 1);
  assert.equal(isolated[3], 0);
  assert.ok(together[3] > 0);
  assert.ok(together[6] < 0);
});

test('scattering changes headings without moving individuals', () => {
  const flock = makeFlock(180, 700, 350, seededRandom(15));
  const scattered = scatterFlock(flock, seededRandom(91));
  for (let i = 0; i < flock.length; i += 4) {
    assert.equal(scattered[i],flock[i]); assert.equal(scattered[i+1],flock[i+1]);
    assert.ok(Math.abs(Math.hypot(scattered[i+2],scattered[i+3]) - 2.4) < .00001);
  }
  assert.notDeepEqual(flock,scattered);
});


test('both sculpture forms use the same finite, visible pieces', () => {
  const model=createSculptureModel();
  assert.equal(model.count,model.bodyCount);
  assert.equal(model.count,model.staircase.blocks.length);
  for(const stream of [model.from,model.to,model.sizes,model.targetSizes]) {
    assert.equal(stream.length,model.count*4);
    assert.ok(stream.every(Number.isFinite));
  }
  for(let index=0;index<model.count*4;index+=4)for(let axis=0;axis<3;axis++) {
    assert.ok(model.sizes[index+axis]>0&&model.targetSizes[index+axis]>0);
  }
  assert.equal(new Set(PLACES.map(place=>place.id)).size,6);
});

test('the body has recognizable head, torso, legs, and space between its arms', () => {
  for(const point of [[0,5.8,0],[0,4.2,0],[.4,1.4,0],[-.4,1.4,0],[1.28,3,.18]]) assert.ok(insideBody(point));
  for(const point of [[0,1.4,0],[.9,3.4,0],[0,7,0],[2,4,0]]) assert.ok(!insideBody(point));
});

test('the cube mesh has valid indices and unit normals', () => {
  const mesh=cubeMesh();
  assert.equal(mesh.positions.length,24*3);
  assert.equal(mesh.indices.length,36);
  assert.ok(mesh.indices.every(index=>index<24));
  for(let i=0;i<mesh.normals.length;i+=3)assert.equal(Math.hypot(...mesh.normals.slice(i,i+3)),1);
});

test('the staircase ends meet in projection only at the calibrated view', () => {
  const {staircase}=createSculptureModel();
  assert.ok(staircase.end[1]-staircase.start[1]>2.9);
  const aligned={...PARADOX_VIEW,scale:50};
  const a=project(staircase.start,aligned),b=project(staircase.end,aligned);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-9);
  const rotated={...aligned,yaw:aligned.yaw+.3};
  const c=project(staircase.start,rotated),d=project(staircase.end,rotated);
  assert.ok(Math.hypot(c[0]-d[0],c[1]-d[1])>50);
});

test('the traveling trace rises on every flight and wraps continuously in projection', () => {
  const {staircase}=createSculptureModel();
  for(const flight of [0,1,2])assert.ok(tracePoint(staircase,(flight+.8)/3)[1]>tracePoint(staircase,(flight+.2)/3)[1]);
  const a=project(tracePoint(staircase,0),PARADOX_VIEW),b=project(tracePoint(staircase,.999999),PARADOX_VIEW);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<.005);
});
