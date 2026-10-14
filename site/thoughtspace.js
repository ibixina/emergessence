import { initializeSketchbook, connectNotes } from './sketchbook.js?v=14';
import { ThoughtScene } from './thought-scene.js?v=23';
import { lateralBrainSketch, dorsalBrainSketch, mindSketch, imagerySketch, recallMindSketch, embodiedMindSketch, probabilitySketch, latentSpaceSketch } from './cognition-studies.js?v=9';
import { initializeCipher, markCipherTerms } from './cipher.js?v=5';
import { latentStudy, initializeLatentStudy } from './latent-study.js?v=1';
import { EmergenceColony } from './emergence-ants.js?v=1';

export async function initializeThoughtspace() {
  const artworkReady = Promise.allSettled(['lateral', 'dorsal', 'medial'].map(name => {
    const image = new Image();
    image.src = new URL(`./assets/cognition-${name}-v4.webp`, import.meta.url).href;
    return image.decode();
  })).then(results => {
    document.documentElement.dataset.cognitiveArt = results.every(result => result.status === 'fulfilled') ? 'ready' : 'partial';
  });
  initializeSketchbook({ cover:false, connections:false });
  document.querySelector('.about-statement h2').innerHTML = 'Mind, brain,<br>and <span class="crayon-underline">models.</span>';
  document.querySelectorAll('.thinking-notes h3').forEach((heading, index) => {
    heading.innerHTML = `<span class="crayon-underline" data-crayon="${['teal', 'blue', 'coral'][index]}">${heading.textContent}</span>`;
  });
  const studyUpdates = [
    ['.about-process', mindSketch(), 'From neural activity to cognition.'],
    ['#memory .working-study', recallMindSketch(), 'a cue / an association / a reconstruction?'],
    ['#imagery .working-study', imagerySketch(), 'an internal world, without new sensory input?'],
    ['#environment .working-study', embodiedMindSketch(), 'seeing changes action; action changes seeing.'],
    ['.research-crossnotes .working-study', latentSpaceSketch(), 'related representations, neighboring states?'],
    ['#climbing .working-study', embodiedMindSketch(), 'observe → act → reward: a loop to test behavior.']
  ];
  for (const [selector, drawing, caption] of studyUpdates) {
    const figure = document.querySelector(selector);
    figure.innerHTML = `${drawing}<figcaption>${caption}</figcaption>`;
  }
  document.querySelector('.method-jot .pen-practice').outerHTML = `<figure class="method-brain">${dorsalBrainSketch()}<figcaption>many parts. one mind?</figcaption></figure>`;
  document.getElementById('research').insertAdjacentHTML('beforeend', `<div class="cognitive-note" id="probabilistic-modeling"><h3>Probabilistic modeling</h3><p>How certain is the model?</p><figure class="working-study">${probabilitySketch()}<figcaption>prior + evidence → posterior</figcaption></figure><span>Keep uncertainty in the picture.<br>Update the belief when the evidence changes.</span></div><div class="cognitive-note" id="latent-spaces"><h3>Latent spaces</h3><p class="latent-description">Two coordinates can describe a point on a surface folded through three dimensions. The latent space makes those underlying factors explicit.</p>${latentStudy()}<p class="latent-footnote">A geometric example. Learned representations depend on the data and training objective.</p></div>`);
  const hero = document.querySelector('.hero');
  hero.innerHTML = `<div class="thought-cover"><div class="thought-cover-page">
    <header class="masthead"><a class="wordmark" href="#top">emergessence</a><p class="disciplines">neuroscience / cognitive science / math</p></header>
    <div class="thought-opening"><span class="page-jot">start with a question…</span><h2 aria-label="How does a mind emerge?">How does a<br><span class="crayon-underline">mind <span class="emergence-word"><span class="emergence-ink">emerge</span></span>?</span></h2><p><del>just more neurons?</del><br><span>or the right connections?</span></p></div>
    <figure class="thought-cover-study"><span>brain ↔ mind?</span>${lateralBrainSketch()}<figcaption>structure becomes experience… how?</figcaption></figure>
    <figure class="thought-cover-neurons">${mindSketch()}<figcaption>one connection → many possibilities</figcaption></figure>
    <div class="thought-aside"><span>one thought leads<br>into another.</span><svg viewBox="0 0 170 80" aria-hidden="true"><path d="M9 14 C51 4 65 78 151 57 M142 50 L151 57 L139 64"/></svg></div>
    <div class="thought-signature"><h1 class="glyph" aria-label="Shishir">Shishir</h1><p class="byline">computational cognitive science</p></div>
    <a class="thought-enter" href="#first-connection"><span>about & research</span><span aria-hidden="true">↓</span></a>
    <span class="thought-folio">notes in the making / 01</span>
  </div></div><span id="first-connection" class="thought-entry-point" aria-hidden="true"></span>`;
  hero.querySelector('.thought-opening').append(hero.querySelector('.thought-cover-neurons'));

  const passages = [
    ['research', 'a fragment. an association. a memory?', 'how much do we reconstruct?'],
    ['projects', 'what if the model could imagine?', 'uncertainty / latent states / possible worlds'],
    ['contact', 'a brain. a network. a point of view.', 'structure / experience / one more question']
  ];
  for (const [id, question, note] of passages) {
    const bridge = document.createElement('div');
    bridge.className = 'thought-bridge';
    bridge.innerHTML = `<p>${question}</p><span>${note}</span><svg viewBox="0 0 250 65" aria-hidden="true"><path d="M228 5 C119 -9 100 63 17 50 M25 42 L17 50 L28 56"/></svg>`;
    document.getElementById(id).before(bridge);
  }
  document.querySelector('#about .section-note')?.remove();
  document.querySelector('.contact-layout h2').innerHTML = 'Get in <span class="crayon-underline" data-crayon="coral">touch.</span>';
  document.querySelector('.site-footer a').textContent = 'back to the first thought ↑';

  function spread(elements, className = '', pairs = []) {
    const stop = document.createElement('div');
    stop.className = 'thought-stop';
    const page = document.createElement('div');
    page.className = `thought-cluster ${className}`;
    elements[0].before(stop);
    stop.append(page);
    page.append(...elements);
    if (pairs.length) connectNotes(page, pairs);
    return page;
  }
  spread([document.querySelector('.about-layout')], 'thought-about');
  spread([document.querySelector('.thinking-notes'), document.querySelector('.about-specifications')], 'thought-methods');
  spread([document.getElementById('memory'), document.getElementById('imagery')], 'thought-pair', [['#memory h2', '#imagery h2', -24]]);
  spread([document.getElementById('environment'), document.querySelector('.research-crossnotes')], 'thought-pair thought-crossnotes', [['#environment .ink-afterthought', '.scratch-list', 22]]);
  spread([document.getElementById('probabilistic-modeling')], 'thought-models thought-probability');
  spread([document.getElementById('latent-spaces')], 'thought-models thought-latent');
  initializeLatentStudy(document.getElementById('latent-spaces'));
  const experiments = [...document.querySelectorAll('.project')];
  for (let index = 0; index < experiments.length; index += 2) {
    const pair = experiments.slice(index, index + 2);
    spread(pair, 'thought-pair thought-experiments', [[`#${pair[0].id} h2`, `#${pair[1].id} h2`, -18]]);
  }
  spread([document.querySelector('.contact-layout')], 'thought-contact');
  await document.fonts.ready;
  await artworkReady;
  const scene = new ThoughtScene(hero);
  const topInset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--selector-height')) || 0;
  const terms = markCipherTerms(document.getElementById('portfolio'));
  initializeCipher([document.querySelector('.wordmark'), ...terms], { rootMargin: `-${topInset}px 0px -8% 0px` });
  scene.emergence = new EmergenceColony(document.querySelector('.emergence-word'), scene);
  return scene;
}
