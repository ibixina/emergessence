const alphabet = [...'Λⲃ⊂◖Ξ╒⟒⊦ǀ⌡⋉⌊⋈⊓⎔☧⍜Ɽ⟆⊺⋃∨Ⱳ⨉⋎⦚0123456789'];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const svgNamespace = 'http://www.w3.org/2000/svg';
const prepared = new WeakSet();

export function markCipherTerms(root) {
  if (reducedMotion.matches) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script, style, textarea, input, select, option, title, desc, .cipher-term, .cipher-word, [aria-hidden="true"], [contenteditable]')) continue;
    if (/\b(mind|cognition)\b/i.test(node.textContent)) nodes.push(node);
  }
  const terms = [];
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    let start = 0;
    for (const match of node.textContent.matchAll(/\b(mind|cognition)\b/gi)) {
      fragment.append(document.createTextNode(node.textContent.slice(start, match.index)));
      const svg = node.parentElement.namespaceURI === svgNamespace;
      const term = svg ? document.createElementNS(svgNamespace, 'tspan') : document.createElement('span');
      term.classList.add('cipher-term');
      term.textContent = match[0];
      fragment.append(term);
      terms.push(term);
      start = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(node.textContent.slice(start)));
    node.replaceWith(fragment);
  }
  return terms;
}

function prepare(element) {
  const svg = element.namespaceURI === svgNamespace;
  const text = element.textContent;
  const term = element.classList.contains('cipher-term');
  if (!term && !element.hasAttribute('aria-label')) element.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim());
  const characters = [];
  if (svg) {
    const widths = [...text].map((_, index) => element.getSubStringLength(index, 1));
    element.replaceChildren(...[...text].map((letter, index) => {
      const cell = document.createElementNS(svgNamespace, 'tspan');
      cell.classList.add('cipher-svg-char');
      cell.textContent = letter;
      cell.setAttribute('textLength', widths[index]);
      cell.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      characters.push({ cell, rune:cell, letter });
      return cell;
    }));
    element.setAttribute('aria-label', text);
  } else {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const word of node.textContent.match(/\S+|\s+/gu) || []) {
        if (/^\s+$/.test(word)) { fragment.append(document.createTextNode(word)); continue; }
        const wrapper = document.createElement('span');
        wrapper.className = 'cipher-word';
        wrapper.setAttribute('aria-hidden', 'true');
        for (const letter of word) {
          const cell = document.createElement('span');
          cell.className = 'cipher-char';
          const original = document.createElement('span');
          original.className = 'cipher-original';
          original.textContent = letter;
          const rune = document.createElement('span');
          rune.className = 'cipher-rune';
          cell.append(original, rune);
          wrapper.append(cell);
          characters.push({ cell, rune });
        }
        fragment.append(wrapper);
      }
      node.replaceWith(fragment);
    }
    if (term) {
      const accessible = document.createElement('span');
      accessible.className = 'cipher-accessible';
      accessible.textContent = text;
      element.prepend(accessible);
    }
  }
  function resolve() {
    characters.forEach(({ cell, rune, letter }) => {
      cell.classList.remove('cipher-pending');
      if (svg) rune.textContent = letter;
    });
    element.dataset.cipherState = 'resolved';
  }
  let running = false;
  function animate() {
    if (running || reducedMotion.matches || document.hidden) return;
    running = true;
    element.dataset.cipherState = 'decoding';
    let start = null, lastStep = -1;
    function frame(time) {
      start ??= time;
      const elapsed = time - start;
      const step = Math.floor(elapsed / 64);
      const resolved = Math.floor(Math.max(0, elapsed - 110) / 520 * characters.length);
      if (step !== lastStep) {
        characters.forEach(({ cell, rune, letter }, index) => {
          const pending = index >= resolved && elapsed < 760 && !reducedMotion.matches;
          cell.classList.toggle('cipher-pending', pending);
          if (pending) rune.textContent = alphabet[Math.floor(Math.random() * alphabet.length)];
          else if (svg) rune.textContent = letter;
        });
        lastStep = step;
      }
      if (elapsed < 760 && !reducedMotion.matches && !document.hidden) requestAnimationFrame(frame);
      else {
        resolve();
        running = false;
      }
    }
    requestAnimationFrame(frame);
  }
  element.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') animate(); });
  element.addEventListener('focusin', animate);
  if (term) {
    element.addEventListener('pointerdown', animate);
    element.closest('a, button, summary, [tabindex]')?.addEventListener('focusin', animate);
  }
  element.querySelector('button')?.addEventListener('click', animate);
  return animate;
}

export function initializeCipher(selector = '.glyph, .wordmark, .portfolio-section h2', { rootMargin = '-105px 0px -8% 0px' } = {}) {
  if (reducedMotion.matches) return;
  const animations = new Map();
  const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
  elements.forEach(element => {
    if (prepared.has(element)) return;
    const animate = prepare(element);
    prepared.add(element);
    animations.set(element, animate);
  });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const animate = animations.get(entry.target);
      if (!animate || !entry.isIntersecting) continue;
      if (entry.target.closest('.thought-plane')?.inert || getComputedStyle(entry.target).visibility === 'hidden') continue;
      animate();
      observer.unobserve(entry.target);
      animations.delete(entry.target);
    }
  }, { threshold: .4, rootMargin });
  animations.forEach((animate, element) => observer.observe(element));
  const pages = new Map();
  animations.forEach((_, element) => {
    const page = element.closest('.thought-plane');
    if (!page) return;
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page).push(element);
  });
  pages.forEach((elements, page) => page.addEventListener('notebook-enter', () => {
    elements.forEach(element => {
      if (!animations.has(element)) return;
      observer.unobserve(element);
      observer.observe(element);
    });
  }));
}
