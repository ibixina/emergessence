import { PLACES } from './geometry.js?v=5';
import { createSculpture } from './sculpture.js?v=5';
import { flockDrawing } from './drawings.js?v=5';
import { GRID_SIZE, PATTERNS, PATTERN_NAMES, trainMemories, networkEnergy, updateMemory, shuffledIndices, disruptPattern } from './memory.js?v=5';

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const labels = new Map([...document.querySelectorAll('.scene-labels button')].map(button => [button.dataset.place, button]));
const sculpture = createSculpture(document.getElementById('mind-atlas'), labels);
const reader = document.querySelector('.reader');
const indexDialog = document.querySelector('.atlas-index');
const readerHeading = document.getElementById('reader-heading');
let activePlace = 0;

function openPlace(id, updateHistory = true) {
  const index = PLACES.findIndex(place => place.id === id);
  if (index < 0) return;
  activePlace = index;
  const place = PLACES[index];
  if (indexDialog.open) indexDialog.close();
  document.querySelectorAll('.reading-place').forEach(section => { section.hidden = section.id !== `${id}-content`; });
  readerHeading.textContent = place.heading;
  document.querySelector('.reader-number').textContent = `${String(index + 1).padStart(2, '0')} / ${place.name.toUpperCase()}`;
  document.querySelector('.reader-position').textContent = `${String(index + 1).padStart(2, '0')} / 06`;
  document.querySelector('.reader-scroll').scrollTop = 0;
  document.body.dataset.reading = 'true';
  sculpture.focus(id);
  if (!reader.open) reader.showModal();
  readerHeading.tabIndex = -1;
  readerHeading.focus({ preventScroll:true });
  if (updateHistory && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
  if (recallButton.disabled && id !== 'memory') resetRecall();
}

document.querySelectorAll('[data-place]').forEach(button => {
  button.addEventListener('click', () => openPlace(button.dataset.place));
  if (button.closest('.scene-labels')) {
    button.addEventListener('pointerenter', () => sculpture.setHover(button.dataset.place));
    button.addEventListener('pointerleave', () => sculpture.setHover(''));
    button.addEventListener('focus', () => sculpture.setHover(button.dataset.place));
    button.addEventListener('blur', () => sculpture.setHover(''));
  }
});
document.querySelector('.close-reader').addEventListener('click', () => reader.close());
reader.addEventListener('close', () => {
  document.body.dataset.reading = 'false';
  sculpture.focus('');
  sculpture.setHover('');
  if (recallButton.disabled) resetRecall();
  if (PLACES.some(place => `#${place.id}` === location.hash)) history.pushState(null, '', '#top');
  const destination = labels.get(PLACES[activePlace].id);
  (destination.getClientRects().length ? destination : document.querySelector('.index-toggle')).focus({ preventScroll:true });
});
document.querySelector('.previous-place').addEventListener('click', () => openPlace(PLACES[(activePlace + 5) % 6].id));
document.querySelector('.next-place').addEventListener('click', () => openPlace(PLACES[(activePlace + 1) % 6].id));
document.querySelector('.index-toggle').addEventListener('click', () => indexDialog.showModal());
document.querySelector('.close-index').addEventListener('click', () => indexDialog.close());
indexDialog.addEventListener('click', event => { if (event.target === indexDialog) { const bounds = indexDialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) indexDialog.close(); } });
document.querySelector('.motion-toggle').addEventListener('click', sculpture.toggle);
document.querySelector('.zoom-in').addEventListener('click', () => sculpture.zoom(.1));
document.querySelector('.zoom-out').addEventListener('click', () => sculpture.zoom(-.1));
document.querySelector('.reset-view').addEventListener('click', sculpture.reset);
document.querySelectorAll('[data-form]').forEach(button => button.addEventListener('click', () => sculpture.setForm(Number(button.dataset.form))));
document.querySelector('.disassemble').addEventListener('click', sculpture.disassemble);
document.querySelector('.structure-toggle').addEventListener('click', sculpture.structure);
document.querySelector('.atlas-brand').addEventListener('click', () => { if (reader.open) reader.close(); sculpture.reset(); });
window.addEventListener('popstate', () => {
  const id = location.hash.slice(1);
  if (PLACES.some(place => place.id === id)) openPlace(id, false);
  else if (reader.open) reader.close();
});

const flock = flockDrawing(document.getElementById('flock'), document.querySelector('.flock-pause'));
const cohesion = document.getElementById('cohesion');
cohesion.addEventListener('input', () => {
  document.getElementById('cohesion-value').value = `${cohesion.value}%`;
  flock.setInfluence(Number(cohesion.value) / 100);
});
document.querySelector('.scatter-button').addEventListener('click', flock.scatter);

const weights = trainMemories(PATTERNS);
const inputGrid = document.querySelector('.input-grid');
const outputGrid = document.querySelector('.output-grid');
const recallButton = document.querySelector('.recall-button');
const recallStatus = document.querySelector('.recall-status');
const indicator = document.querySelector('.output-indicator');
const noise = document.getElementById('noise');
let patternIndex = 0, cue = disruptPattern(PATTERNS[0], Number(noise.value));
let runToken = 0, painting = false, paintValue = 1;

const inputCells = Array.from({ length:GRID_SIZE ** 2 }, (_, index) => {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.tabIndex = index === 0 ? 0 : -1;
  cell.dataset.index = index;
  cell.setAttribute('aria-label', `Pixel row ${Math.floor(index / GRID_SIZE) + 1}, column ${index % GRID_SIZE + 1}`);
  inputGrid.append(cell);
  return cell;
});
const outputCells = inputCells.map(() => {
  const cell = document.createElement('span');
  outputGrid.append(cell);
  return cell;
});

function showInput() {
  inputCells.forEach((cell, index) => cell.setAttribute('aria-pressed', String(cue[index] === 1)));
  sculpture.setMemory(cue);
}

function resetRecall() {
  runToken++;
  recallButton.disabled = false;
  recallButton.innerHTML = 'Find the memory <span>→</span>';
  indicator.textContent = 'WAITING';
  indicator.dataset.state = 'waiting';
  outputCells.forEach(cell => cell.classList.remove('active'));
  outputGrid.setAttribute('aria-label', 'No recalled pattern yet');
  recallStatus.textContent = 'Your fragment. The next move is the network’s.';
  document.querySelector('.energy-value').textContent = 'ENERGY / —';
  document.querySelector('.energy-line').setAttribute('d', 'M0 20H500');
  document.querySelector('.energy-graph').setAttribute('aria-label', 'Network energy during recall');
}

function generateCue() {
  cue = disruptPattern(PATTERNS[patternIndex], Number(noise.value));
  resetRecall();
  showInput();
}

document.querySelectorAll('[data-pattern]').forEach(button => button.addEventListener('click', () => {
  patternIndex = Number(button.dataset.pattern);
  document.querySelectorAll('[data-pattern]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  generateCue();
}));
noise.addEventListener('input', () => { document.getElementById('noise-value').value = `${noise.value}%`; generateCue(); });
document.querySelector('.disrupt-button').addEventListener('click', generateCue);
document.querySelector('.clear-button').addEventListener('click', () => { cue.fill(-1); resetRecall(); showInput(); });

function paint(cell) {
  const index = Number(cell.dataset.index);
  if (cue[index] === paintValue) return;
  cue[index] = paintValue;
  cell.setAttribute('aria-pressed', String(paintValue === 1));
  sculpture.setMemory(cue);
}

inputGrid.addEventListener('pointerdown', event => {
  const cell = event.target.closest('button');
  if (!cell || event.button) return;
  event.preventDefault();
  cell.focus({ preventScroll:true });
  resetRecall();
  painting = true;
  paintValue = cue[Number(cell.dataset.index)] === 1 ? -1 : 1;
  paint(cell);
});
inputGrid.addEventListener('pointerover', event => { if (painting && event.target.matches('button')) paint(event.target); });
inputGrid.addEventListener('pointermove', event => {
  if (!painting || event.pointerType !== 'touch') return;
  const cell = document.elementFromPoint(event.clientX, event.clientY);
  if (cell?.matches('.input-grid button')) paint(cell);
});
document.addEventListener('pointerup', () => { painting = false; }, { passive:true });
document.addEventListener('pointercancel', () => { painting = false; }, { passive:true });
inputGrid.addEventListener('click', event => {
  if (event.detail || !event.target.matches('button')) return;
  resetRecall();
  paintValue = cue[Number(event.target.dataset.index)] === 1 ? -1 : 1;
  paint(event.target);
});
inputGrid.addEventListener('focusin', event => {
  inputCells.forEach(cell => { cell.tabIndex = cell === event.target ? 0 : -1; });
});
inputGrid.addEventListener('keydown', event => {
  if (!event.target.matches('button')) return;
  const movements = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-GRID_SIZE, ArrowDown:GRID_SIZE };
  if (!(event.key in movements)) return;
  event.preventDefault();
  const index = clamp(Number(event.target.dataset.index) + movements[event.key], 0, inputCells.length - 1);
  inputCells[index].focus({ preventScroll:true });
});

function showEnergy(history) {
  const high = history[0], low = Math.min(...history), span = Math.max(1, high - low);
  const path = history.map((energy, index) => `${index ? 'L' : 'M'}${index / Math.max(1, history.length - 1) * 500} ${10 + (high - energy) / span * 45}`).join(' ');
  document.querySelector('.energy-line').setAttribute('d', path);
  document.querySelector('.energy-graph').setAttribute('aria-label', `Network energy moved from ${high.toFixed(1)} to ${history.at(-1).toFixed(1)} during recall`);
  document.querySelector('.energy-value').textContent = `ENERGY / ${history.at(-1).toFixed(1)}`;
}

recallButton.addEventListener('click', async () => {
  const token = ++runToken;
  recallButton.disabled = true;
  recallButton.innerHTML = 'Finding the memory <span>···</span>';
  indicator.textContent = 'SETTLING';
  indicator.dataset.state = 'running';
  recallStatus.textContent = 'Following the connections…';
  let state = new Int8Array(cue);
  const energies = [networkEnergy(weights, state)];
  for (let sweep = 0; sweep < 12; sweep++) {
    const previous = new Int8Array(state), order = shuffledIndices(state.length);
    for (let offset = 0; offset < order.length; offset += 8) {
      if (token !== runToken) return;
      state = updateMemory(weights, state, order.slice(offset, offset + 8));
      outputCells.forEach((cell, index) => cell.classList.toggle('active', state[index] === 1));
      sculpture.setMemory(state);
      energies.push(networkEnergy(weights, state));
      showEnergy(energies);
      await new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : 55));
    }
    if (state.every((value, index) => value === previous[index])) break;
  }
  if (token !== runToken) return;
  const recalled = PATTERNS.findIndex(pattern => pattern.every((value, index) => value === state[index]));
  indicator.textContent = 'SETTLED';
  indicator.dataset.state = 'settled';
  if (recalled >= 0) {
    recallStatus.textContent = recalled === patternIndex ? `${PATTERN_NAMES[recalled]} recovered. A fragment became a memory.` : `${PATTERN_NAMES[recalled]} recovered. The cue led to another memory.`;
    outputGrid.setAttribute('aria-label', `${PATTERN_NAMES[recalled]} pattern recovered`);
  } else {
    recallStatus.textContent = 'A new pattern emerged. Try a clearer cue.';
    outputGrid.setAttribute('aria-label', 'A stable pattern different from the three learned memories');
  }
  recallButton.disabled = false;
  recallButton.innerHTML = 'Find it again <span>→</span>';
});
showInput();


const initialPlace = location.hash.slice(1);
if (PLACES.some(place => place.id === initialPlace)) openPlace(initialPlace, false);
else if (initialPlace && initialPlace !== 'top') history.replaceState(null, '', '#top');
