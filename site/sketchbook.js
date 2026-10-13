import { initializeInkPad } from './ink-pad.js?v=3';
import {
  recallSketch, memorySketch, predictionSketch, interactionSketch,
  activationSketch, layersSketch, climbingSketch, compressionSketch,
  terminalSketch, lifeSketch, processSketch, unitSketch, penMarks
} from './notebook-studies.js?v=3';

export function connectNotes(container, pairs) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.classList.add('notebook-connections');
  svg.setAttribute('aria-hidden', 'true');
  container.prepend(svg);
  let frame = 0;
  function path(d) {
    const line = document.createElementNS(namespace, 'path');
    line.setAttribute('d', d);
    svg.append(line);
  }
  function redraw() {
    frame = 0;
    const page = container.getBoundingClientRect();
    const width = container.offsetWidth, height = container.offsetHeight;
    if (!page.width || !page.height || !width || !height) return;
    const scaleX = page.width / width, scaleY = page.height / height;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.replaceChildren();
    for (const [from, to, bend = 35] of pairs) {
      const first = container.querySelector(from), second = container.querySelector(to);
      if (!first || !second) continue;
      const local = element => {
        const rect = element.getBoundingClientRect();
        return { x:(rect.x - page.x) / scaleX, y:(rect.y - page.y) / scaleY, width:rect.width / scaleX, height:rect.height / scaleY };
      };
      const a = local(first), b = local(second);
      if (!a.width || !a.height || !b.width || !b.height) continue;
      const dx = b.x + b.width / 2 - a.x - a.width / 2;
      const dy = b.y + b.height / 2 - a.y - a.height / 2;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const x1 = a.x + a.width / 2 + (horizontal ? Math.sign(dx) * (a.width / 2 + 8) : 0);
      const y1 = a.y + a.height / 2 + (horizontal ? 0 : Math.sign(dy) * (a.height / 2 + 8));
      const x2 = b.x + b.width / 2 - (horizontal ? Math.sign(dx) * (b.width / 2 + 8) : 0);
      const y2 = b.y + b.height / 2 - (horizontal ? 0 : Math.sign(dy) * (b.height / 2 + 8));
      const control = horizontal ? [x1 + (x2 - x1) * .45, y1 + bend, x2 - (x2 - x1) * .3, y2 - bend] : [x1 + bend, y1 + (y2 - y1) * .35, x2 - bend, y2 - (y2 - y1) * .35];
      path(`M${x1} ${y1} C${control.join(' ')} ${x2} ${y2}`);
      const angle = Math.atan2(y2 - control[3], x2 - control[2]);
      path(`M${x2 - 9 * Math.cos(angle - .5)} ${y2 - 9 * Math.sin(angle - .5)} L${x2} ${y2} L${x2 - 10 * Math.cos(angle + .5)} ${y2 - 10 * Math.sin(angle + .5)}`);
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(redraw); };
  container.addEventListener('notebook-layout', redraw);
  new ResizeObserver(schedule).observe(container);
  container.querySelectorAll('details').forEach(entry => entry.addEventListener('toggle', schedule));
  document.fonts.ready.then(schedule);
  schedule();
}

function study(drawing, caption, className = '') {
  return `<figure class="working-study ${className}">${drawing}<figcaption>${caption}</figcaption></figure>`;
}

export function initializeSketchbook({ cover = true, connections = true } = {}) {
  if (cover) {
    const hero = document.querySelector('.hero');
    const identity = hero.querySelector('.hero-identity');
    identity.querySelector('.glyph').textContent = 'Shishir';
    identity.querySelector('.glyph').setAttribute('aria-label', 'Shishir');
    identity.querySelector('.byline').textContent = 'computational cognitive science';
    hero.querySelector('.disciplines').innerHTML = 'neuroscience / AI / psychology<br><span>notes, models, experiments</span>';
    const art = document.getElementById('notebook-art');
    art.hidden = false;
    art.innerHTML = `<div class="opening-page">
      <div class="opening-question"><span class="page-jot">a question to keep coming back to</span><h2>How does a<br>mind emerge?</h2><p>Weighted inputs. A response.<br>Then many units, interacting.</p><span class="ink-afterthought">what changes when the<br>connections change?</span>${study(unitSketch(),'one unit: weigh → combine → respond<br><a href="#activation-functions">activation functions ↗</a>','single-unit-study')}</div>
      <div class="opening-recall"><span class="study-title">recall, from a fragment</span>${study(recallSketch(), 'partial cue → repeated updates → a possible pattern')}<p class="pencil-equation">x(t + 1) = f(W x(t))</p><p class="ink-afterthought">one update is simple.<br>what does repetition do?</p></div>
      <div class="opening-margin"><del>store every detail</del><span>recover the structure?</span><p>Associative memory<br>↳ representations<br>↳ relationships<br>↳ context</p><a href="#memory">follow this question ↗</a></div>
      <div class="opening-paths"><span>three ways into the same problem</span><div><a href="#memory">memory</a><span aria-hidden="true">↔</span><a href="#imagery">prediction</a><span aria-hidden="true">↔</span><a href="#environment">interaction</a></div><p>what is stable? &nbsp; what changes? &nbsp; what gets learned?</p></div>
    </div>`;
    const tools = document.createElement('div');
    tools.className = 'notebook-tools';
    tools.innerHTML = `<button class="pencil-toggle" type="button" aria-pressed="false"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 12.5 12.6 2.9 15.1 5.4 5.5 15 2.4 15.6 3 12.5ZM10.7 4.8 13.2 7.3"/></svg><span>add a scribble</span></button><button class="pencil-undo" type="button" aria-label="Undo the last pencil mark" disabled>undo</button><span class="ink-status" role="status"></span>`;
    const footnote = hero.querySelector('.hero-footnote');
    footnote.querySelector('span').replaceWith(tools);
    document.getElementById('scroll-label').textContent = 'turn the page';
    const signoff = document.createElement('div');
    signoff.className = 'notebook-signoff';
    hero.append(signoff);
    signoff.append(identity, footnote);
    initializeInkPad(hero, tools.querySelector('.pencil-toggle'), tools.querySelector('.pencil-undo'), tools.querySelector('.ink-status'));
  }

  const sectionNames = ['about me', 'questions', 'experiments', 'say hello'];
  const shortNames = ['about', 'questions', 'experiments', 'hello'];
  const pageNotes = ['input → model → behavior', 'three lines of inquiry', 'make it, then look inside', 'one more connection'];
  document.querySelectorAll('.primary-navigation a').forEach((link, index) => {
    link.setAttribute('aria-label', sectionNames[index]);
    link.innerHTML = `<span class="nav-number" aria-hidden="true">${index + 1}.</span><span class="nav-label">${sectionNames[index]}</span><span class="nav-short">${shortNames[index]}</span>`;
  });
  document.querySelectorAll('.section-heading').forEach((heading, index) => {
    heading.querySelector('.section-number').textContent = `0${index + 1}`;
    heading.querySelector('.section-name').textContent = sectionNames[index];
    heading.querySelector('.section-note').textContent = pageNotes[index];
  });

  const about = document.getElementById('about');
  about.querySelector('.about-layout').innerHTML = `<div class="about-statement"><h2>Computation<br>→ cognition.</h2><p class="lead">I study the principles behind perception, learning, decision-making, and consciousness.</p><p>Computational models + behavioral experiments.<br>Neuroscience + AI + cognitive psychology.</p></div>${study(processSketch(), 'A model has to meet behavior somewhere.', 'about-process')}`;
  about.querySelector('.about-layout').insertAdjacentHTML('afterend', `<div class="thinking-notes"><div><h3>Perception</h3><p>Inputs become representations.<br>What gets selected?</p><span>bottom-up ↔ top-down</span></div><div><h3>Learning</h3><p>The same input, changed parameters.<br>What changes in behavior?</p><span>prediction errors / adaptation</span></div><div><h3>Emergence</h3><p>Simple updates. Many interactions.<br>Which structures persist?</p><span>dynamics / information / networks</span></div></div>`);
  const specTitles = ['questions & methods', 'tools I work with'];
  about.querySelectorAll('.about-specifications h3').forEach((title, index) => title.textContent = specTitles[index]);
  about.querySelector('.about-specifications').insertAdjacentHTML('beforeend', `<div class="method-jot"><p>model → experiment<br>→ compare → revise</p>${penMarks()}<span class="ink-afterthought">Where does the model miss<br>the richness of cognition?</span></div>`);
  if (connections) connectNotes(about, [['.about-process', '.thinking-notes > div:nth-child(2) h3', 20]]);

  const research = document.getElementById('research');
  const researchTitles = ['Associative memory<br>manifold', 'Mental imagery<br>& simulation', 'Cognition<br>& environment'];
  const questions = ['Can a partial cue lead to a stable representation?', 'What does a model do without new sensory input?', 'How does the loop change what gets learned?'];
  const observations = ['Hierarchical representations in artificial networks and their correspondence to biological systems.', 'Prediction errors, learning, and internal models of sensory input.', 'Bottom-up and top-down influences on information selection.'];
  const sketches = [memorySketch(), predictionSketch(), interactionSketch()];
  const researchCaptions = ['a cue / a neighborhood / a route', 'sensory input checks the prediction', 'action changes the next observation'];
  const marginNotes = ['<del>an address?</del> a neighborhood?<br>How much does context move the route?', 'Perception ↔ imagination<br>Two uses of an internal model?', 'agent + world<br>Try changing one side of the loop.'];
  research.querySelectorAll('.research-entry').forEach((entry, index) => {
    entry.id = ['memory', 'imagery', 'environment'][index];
    entry.open = true;
    entry.querySelector('h2').innerHTML = researchTitles[index];
    entry.querySelector('.research-status').textContent = entry.querySelector('.research-status').textContent.toLowerCase();
    entry.querySelector('.research-body').innerHTML = `<p class="research-question">${questions[index]}</p>${study(sketches[index],researchCaptions[index])}<p>${observations[index]}</p><p class="ink-afterthought">${marginNotes[index]}</p>`;
  });
  research.querySelector('.research-index').insertAdjacentHTML('beforeend', `<aside class="research-crossnotes"><h3>connect these:</h3><p>recall ↔ simulation<br>prediction ↔ action<br>environment ↔ learning</p>${study(recallSketch(),'Where does one question become another?')}<div class="scratch-list"><span>↳ compare the representations</span><span>↳ look at the dynamics</span><span>↳ keep behavior in view</span></div></aside>`);
  if (connections) connectNotes(research, [['.research-entry:first-child h2', '.research-entry:nth-child(2) h2', -14], ['.research-entry:nth-child(3) .ink-afterthought', '.scratch-list span:last-child', 12]]);

  const projects = document.getElementById('projects');
  const projectSketches = [activationSketch(), layersSketch(), climbingSketch(), compressionSketch(), terminalSketch(), lifeSketch()];
  const titles = ['Activation function<br>optimization','Neural network<br>visualizer','Climbing game<br>RL environment','Neural network<br>compression','Terminal<br>video player','DigiLife'];
  const projectCaptions = ['three functions, three different responses','trace the activations through the layers','a world in which to learn','teacher → smaller student','pixels → another alphabet','choices → branching consequences'];
  const notes = [
    'Genetic programming to evolve activation functions. Compare GP evolution, DARTS, and hand-designed functions.',
    'Activations + weights, visible while the network trains. Color-coded views and step-by-step training.',
    'Physics-based climbing + a custom reinforcement learning environment. JavaScript ↔ Python for experiments.',
    'Distill CNN teachers into smaller students on CIFAR-100. Layer-conditioning, a modular pipeline, and benchmarks.',
    'YouTube streaming, concurrent frame processing, automatic terminal detection, and cross-platform support.',
    'A data-driven life simulation: work, education, relationships, and hidden gameplay paths.'
  ];
  const jots = [
    'candidate → evaluate → evolve<br>What shape does the search favor?',
    'look at one layer at a time<br>↳ which units change together?',
    'observe → act → reward<br>↳ reach → grip → move',
    'fewer parameters, useful structure?<br>↳ compare the representations',
    'brightness → character density<br>↳ preserve the frame’s structure',
    'small rules, many possible paths<br>↳ what follows from a choice?'
  ];
  projects.querySelectorAll('.project').forEach((project, index) => {
    project.id = ['activation-functions', 'network-visualizer', 'climbing', 'neural-compression', 'terminal-video', 'digilife'][index];
    project.querySelector('h2').innerHTML = titles[index];
    project.querySelector('.project-meta span:first-child').textContent = `#0${index + 1}`;
    project.querySelector('p').textContent = notes[index];
    project.querySelector('h2').insertAdjacentHTML('afterend', study(projectSketches[index],projectCaptions[index]));
    project.querySelector('a').insertAdjacentHTML('beforebegin', `<p class="project-jot">${jots[index]}</p>`);
    project.querySelector('a').innerHTML = 'open the experiment <span aria-hidden="true">↗</span>';
  });
  projects.insertAdjacentHTML('beforeend', `<div class="experiment-thread"><p><a href="#activation-functions">evolve a function</a> → <a href="#network-visualizer">watch a network</a> → <a href="#neural-compression">simplify a model</a></p><p><a href="#climbing">build an environment</a> → let an agent act → see what changes</p><span>different experiments, related questions.</span></div>`);

  const contact = document.getElementById('contact');
  contact.querySelector('.contact-layout h2').innerHTML = 'Bring a question.';
  contact.querySelector('.contact-layout p').textContent = 'Open to conversations and collaborations around AI, neuroscience, and cognitive science.';
  contact.querySelector('.contact-layout > div:first-child').insertAdjacentHTML('beforeend', `<div class="contact-prompts"><span>a memory model?</span><span>a learning system?</span><span>an experiment to compare them?</span></div>${penMarks()}`);
  contact.querySelector('.contact-links').insertAdjacentHTML('beforebegin', '<p class="contact-margin">a thought in the margin<br>can become a conversation. ↗</p>');
  contact.querySelectorAll('.contact-links a').forEach(link => {
    if (link.hasAttribute('download')) link.firstChild.textContent = link.textContent.includes('RESUME') ? 'resume.pdf ' : 'cv.pdf ';
  });
  document.querySelector('.site-footer a').innerHTML = 'back to the first question <span aria-hidden="true">↑</span>';
}
