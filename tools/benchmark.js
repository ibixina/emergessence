// Match the initializer's module URL to instrument its shared constructor.
import { ThoughtScene } from '../site/thought-scene.js?v=21';

let recording = null;
let inAnimation = false;
const methods = ['animate', 'drawRoutes', 'resize', 'refresh', 'navigate'];
for (const name of methods) {
  const original = ThoughtScene.prototype[name];
  ThoughtScene.prototype[name] = function (...args) {
    if (!recording) return original.apply(this, args);
    const start = performance.now();
    const previous = inAnimation;
    if (name === 'animate') inAnimation = true;
    try { return original.apply(this, args); }
    finally {
      recording.methods[name].push(performance.now() - start);
      inAnimation = previous;
    }
  };
}

// Count real layout-dependent reads in the animation, without timing each getter.
for (const name of ['offsetWidth', 'offsetHeight']) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name);
  Object.defineProperty(HTMLElement.prototype, name, {
    ...descriptor,
    get() {
      if (recording && inAnimation) recording.layoutReads++;
      return descriptor.get.call(this);
    }
  });
}
const originalBounds = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
  if (recording && inAnimation) recording.layoutReads++;
  return originalBounds.call(this);
};

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const round = value => Math.round(value * 1000) / 1000;
  return {
    count:values.length,
    totalMs:round(values.reduce((sum, value) => sum + value, 0)),
    meanMs:round(values.reduce((sum, value) => sum + value, 0) / (values.length || 1)),
    p50Ms:round(sorted[Math.floor(sorted.length * .5)] || 0),
    p95Ms:round(sorted[Math.floor(sorted.length * .95)] || 0),
    maxMs:round(sorted.at(-1) || 0)
  };
}

function frames(duration, callback) {
  return new Promise(resolve => {
    let start, previous;
    function tick(time) {
      start ??= time;
      const elapsed = time - start;
      callback(Math.min(1, elapsed / duration), previous === undefined ? null : time - previous);
      previous = time;
      if (elapsed < duration) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

export async function run(scene) {
  if (!scene.enabled) return;
  const interactionsOnly = new URLSearchParams(location.search).get('benchmark') === 'interactions';
  const output = document.createElement('pre');
  output.id = 'benchmark-results';
  output.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:100;max-height:45vh;max-width:90vw;overflow:auto;background:#faf9f5;color:#333;padding:12px;font:12px monospace;white-space:pre-wrap';
  document.body.append(output);
  const report = { viewport:[innerWidth, innerHeight], dpr:devicePixelRatio, visibility:document.visibilityState, trials:[] };
  const longFrames = [];
  const observer = PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')
    ? new PerformanceObserver(list => {
      for (const entry of list.getEntries()) longFrames.push({
        startTime:entry.startTime, duration:entry.duration,
        renderStart:entry.renderStart, styleAndLayoutStart:entry.styleAndLayoutStart,
        forcedLayoutMs:entry.scripts.reduce((sum, script) => sum + script.forcedStyleAndLayoutDuration, 0),
        scripts:entry.scripts.map(script => ({ function:script.sourceFunctionName, duration:script.duration, forcedLayoutMs:script.forcedStyleAndLayoutDuration }))
      });
    }) : null;
  observer?.observe({ type:'long-animation-frame' });
  for (let trial = 0; trial < (interactionsOnly ? 0 : 3); trial++) {
    output.textContent = `Performance benchmark: trial ${trial + 1}/3\nScrolling the complete notebook forward and back.`;
    scene.navigate('#top');
    await frames(600, () => {});
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const intervals = [];
    const delays = [];
    const startTime = performance.now();
    recording = { methods:Object.fromEntries(methods.map(name => [name, []])), layoutReads:0 };
    await frames(6000, (progress, interval) => {
      window.scrollTo({ top:maxScroll * progress, behavior:'instant' });
      if (interval !== null) intervals.push(interval);
      if (interval > 50) delays.push({ interval, direction:'forward', progress, anchor:scene.active.anchor, camera:scene.camera });
    });
    await frames(6000, (progress, interval) => {
      window.scrollTo({ top:maxScroll * (1 - progress), behavior:'instant' });
      if (interval !== null) intervals.push(interval);
      if (interval > 50) delays.push({ interval, direction:'backward', progress, anchor:scene.active.anchor, camera:scene.camera });
    });
    const endTime = performance.now();
    const measured = recording;
    recording = null;
    await frames(100, () => {});
    const loafs = longFrames.filter(frame => frame.startTime >= startTime && frame.startTime < endTime);
    report.trials.push({
      durationMs:Math.round(endTime - startTime), maxScroll,
      methods:Object.fromEntries(methods.map(name => [name, stats(measured.methods[name])])),
      animationLayoutReads:measured.layoutReads,
      frameIntervals:stats(intervals), framesOver25Ms:intervals.filter(time => time > 25).length,
      longFrames:stats(loafs.map(frame => frame.duration)),
      longFrameForcedLayoutMs:Math.round(loafs.reduce((sum, frame) => sum + frame.forcedLayoutMs, 0) * 1000) / 1000,
      delays,
      worstLongFrames:loafs.sort((a, b) => b.duration - a.duration).slice(0, 3)
    });
  }
  output.textContent = 'Measuring chapter jumps and research disclosures…';
  recording = { methods:Object.fromEntries(methods.map(name => [name, []])), layoutReads:0 };
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const hash of ['#about', '#research', '#probabilistic-modeling', '#projects', '#contact', '#top']) {
      scene.navigate(hash);
      await frames(150, () => {});
    }
  }
  scene.navigate('#research');
  await frames(150, () => {});
  document.querySelector('#memory summary').click();
  document.querySelector('#imagery summary').click();
  await frames(150, () => {});
  document.querySelector('#memory summary').click();
  document.querySelector('#imagery summary').click();
  await frames(150, () => {});
  report.interactions = Object.fromEntries(methods.map(name => [name, stats(recording.methods[name])]));
  recording = null;
  observer?.disconnect();
  scene.navigate('#top');
  output.textContent = JSON.stringify(report, null, 2);
  output.dataset.complete = 'true';
}
