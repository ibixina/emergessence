import { initializeThoughtspace } from './site/thoughtspace.js?v=2';

const scene = await initializeThoughtspace();
if (location.hash) scene.navigate(location.hash);
