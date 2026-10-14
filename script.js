import { initializeThoughtspace } from './site/thoughtspace.js?v=12';

const benchmark = new URLSearchParams(location.search).has('benchmark')
  ? await import('./tools/benchmark.js') : null;
const scene = await initializeThoughtspace();
if (location.hash) scene.navigate(location.hash);
if (benchmark) await benchmark.run(scene);
