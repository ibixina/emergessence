import { NeuralScene } from './scenes.js?v=5';
import { initializeCipher } from '../site/cipher.js?v=4';

const design = document.documentElement.dataset.design;
const names = { axon: 'Neuron', sketchbook: 'Sketchbook', thoughtspace: 'Thoughtspace' };
document.title = `emergessence — ${names[design]}`;
document.querySelectorAll('[data-design-link]').forEach(link => {
  if (link.dataset.designLink === design) link.setAttribute('aria-current', 'page');
});

if (design === 'axon') {
  document.getElementById('neural-space').hidden = false;
  new NeuralScene(document.getElementById('neural-canvas'));
  document.fonts.ready.then(() => initializeCipher());
} else if (design === 'thoughtspace') {
  const { initializeThoughtspace } = await import('../site/thoughtspace.js?v=12');
  const scene = await initializeThoughtspace();
  if (location.hash) scene.navigate(location.hash);
} else {
  const { initializeSketchbook } = await import('../site/sketchbook.js?v=11');
  initializeSketchbook();
  await document.fonts.ready;
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
}

const navigation = document.querySelector('.primary-navigation');
const sectionLinks = [...navigation.querySelectorAll('a')];
const sections = [...document.querySelectorAll('.portfolio-section')];
let navigationFrame = 0;

function updateNavigation() {
  const threshold = window.scrollY + window.innerHeight * .34;
  let active = null;
  for (const section of sections) if (section.offsetTop + section.parentElement.offsetTop <= threshold) active = section.id;
  sectionLinks.forEach(link => {
    if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const hero = document.querySelector('.hero');
  navigation.classList.toggle('is-stuck', window.scrollY > hero.offsetHeight - navigation.offsetHeight);
  navigationFrame = 0;
}

window.addEventListener('scroll', () => {
  if (!navigationFrame) navigationFrame = requestAnimationFrame(updateNavigation);
}, { passive: true });
window.addEventListener('resize', updateNavigation, { passive: true });
document.querySelectorAll('.research-entry').forEach(entry => entry.addEventListener('toggle', updateNavigation));
updateNavigation();
