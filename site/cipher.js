const alphabet = [...'Λⲃ⊂◖Ξ╒⟒⊦ǀ⌡⋉⌊⋈⊓⎔☧⍜Ɽ⟆⊺⋃∨Ⱳ⨉⋎⦚0123456789'];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function prepare(element) {
  if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', element.innerText.replace(/\s+/g, ' ').trim());
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const characters = [];
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
        characters.forEach(({ cell, rune }, index) => {
          const pending = index >= resolved && elapsed < 760 && !reducedMotion.matches;
          cell.classList.toggle('cipher-pending', pending);
          if (pending) rune.textContent = alphabet[Math.floor(Math.random() * alphabet.length)];
        });
        lastStep = step;
      }
      if (elapsed < 760 && !reducedMotion.matches && !document.hidden) requestAnimationFrame(frame);
      else {
        characters.forEach(({ cell }) => cell.classList.remove('cipher-pending'));
        element.dataset.cipherState = 'resolved';
        running = false;
      }
    }
    requestAnimationFrame(frame);
  }
  element.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') animate(); });
  element.addEventListener('focusin', animate);
  element.querySelector('button')?.addEventListener('click', animate);
  return animate;
}

export function initializeCipher(selector = '.glyph, .wordmark, .portfolio-section h2', { rootMargin = '-105px 0px -8% 0px' } = {}) {
  if (reducedMotion.matches) return;
  const animations = new Map();
  document.querySelectorAll(selector).forEach(element => {
    animations.set(element, prepare(element));
  });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      animations.get(entry.target)();
      observer.unobserve(entry.target);
    }
  }, { threshold: .4, rootMargin });
  animations.forEach((animate, element) => observer.observe(element));
}
