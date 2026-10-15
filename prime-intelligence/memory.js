export const GRID_SIZE = 8;
export const PATTERN_NAMES = ['Cross', 'Ring', 'Plus'];
export const PATTERNS = Array.from({ length:3 }, (_, pattern) => Int8Array.from({ length:GRID_SIZE ** 2 }, (_, index) => {
  const x = index % GRID_SIZE, y = Math.floor(index / GRID_SIZE);
  const distance = Math.hypot(x - 3.5, y - 3.5);
  const on = pattern === 0 ? x === y || x + y === 7 : pattern === 1 ? distance > 2.4 && distance < 3.6 : x === 3 || x === 4 || y === 3 || y === 4;
  return on ? 1 : -1;
}));

export function trainMemories(patterns) {
  const size = patterns[0].length;
  const weights = new Float64Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      const weight = patterns.reduce((sum, pattern) => sum + pattern[i] * pattern[j], 0) / size;
      weights[i * size + j] = weights[j * size + i] = weight;
    }
  }
  return weights;
}

export function networkEnergy(weights, state) {
  let energy = 0;
  for (let i = 0; i < state.length; i++) {
    for (let j = i + 1; j < state.length; j++) energy -= weights[i * state.length + j] * state[i] * state[j];
  }
  return energy;
}

export function updateMemory(weights, state, order) {
  const next = new Int8Array(state);
  for (const index of order) {
    let field = 0;
    for (let j = 0; j < next.length; j++) field += weights[index * next.length + j] * next[j];
    if (field) next[index] = field > 0 ? 1 : -1;
  }
  return next;
}

export function shuffledIndices(size, random = Math.random) {
  const indices = Array.from({ length:size }, (_, index) => index);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function disruptPattern(pattern, percentage, random = Math.random) {
  const result = new Int8Array(pattern);
  const count = Math.round(result.length * percentage / 100);
  for (const index of shuffledIndices(result.length, random).slice(0, count)) result[index] *= -1;
  return result;
}
