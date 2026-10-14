import { crayonStrokes } from './crayon.js?v=2';

function sketch(content, description) {
  return `<svg class="study-sketch cognition-sketch scientific-study" viewBox="0 0 420 240" role="img" aria-label="${description}">${content}</svg>`;
}

function stroke(d, className = '', color = className === 'violet' ? 'teal' : null) {
  const pigment = color ? crayonStrokes([{ d, color }]) : '';
  return `${pigment}<path class="${className}" d="${d}"/>`;
}

function strokes(paths, className = '') {
  return paths.map(d => stroke(d, className)).join('');
}

function note(text, x, y, className = '') {
  return `<text x="${x}" y="${y}" class="${className}">${text}</text>`;
}

function arrow(d) {
  return stroke(d, 'pen-arrow');
}

function illustration(name, x = 45, y = 0, width = 330, height = 215) {
  const filename = name === 'neurons' ? 'neuron.webp' : `cognition-${name}-v4.webp`;
  const source = new URL(`./assets/${filename}`, import.meta.url).href;
  const [artWidth, artHeight] = name === 'neurons' ? [1958, 803] : name === 'dorsal' ? [1254, 1254] : [1536, 1024];
  const marks = {
    neurons:[
      { d:'M605 570 Q643 528 670 494 Q697 462 720 416 M655 514 Q610 492 574 478 M664 501 Q687 539 687 587', weight:32 },
      { d:'M1277 353 Q1304 324 1321 296 Q1343 265 1344 237 M1312 310 Q1351 313 1388 327', color:'blue', weight:30 },
      { d:'M731 433 C854 403 901 469 1015 448 S1186 401 1259 363', color:'ochre', weight:20 },
      { d:'M573 478 Q610 492 635 503 M692 553 Q690 573 686 592', color:'coral', weight:24 }
    ],
    lateral:[
      { d:'M385 273 C435 235 499 215 555 228 M375 299 C425 257 489 241 555 251 M366 325 C418 284 477 269 535 277', color:'coral', weight:32 },
      { d:'M1017 280 C1040 243 1070 221 1100 223 M1044 302 C1060 268 1090 245 1111 249', color:'blue', weight:28 }
    ],
    dorsal:[
      { d:'M374 398 Q416 366 467 389 M368 426 Q410 395 466 417', color:'coral', weight:28 },
      { d:'M782 500 Q813 465 865 488 M780 530 Q820 498 864 513', color:'blue', weight:28 }
    ],
    medial:[
      { d:'M453 265 Q502 245 553 260 M449 293 Q504 271 552 282', weight:32 },
      { d:'M1000 570 Q1055 533 1115 550 M1007 598 Q1068 560 1119 577', color:'ochre', weight:28 }
    ]
  };
  const color = `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 ${artWidth} ${artHeight}" aria-hidden="true">${crayonStrokes(marks[name], artWidth, artHeight)}</svg>`;
  return `${color}<image href="${source}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
}

export function lateralBrainSketch() {
  return sketch(`${illustration('lateral')}${note('structure ↔ experience?',65,235,'violet')}`, 'A fine pen study of a brain from the side, with an open question about structure and experience.');
}

export function dorsalBrainSketch() {
  return sketch(`${illustration('dorsal',80,0,260,225)}${note('one mind?',309,223,'violet')}`, 'A pen brain study from above, with two cerebral hemispheres and a handwritten question: one mind?');
}

export function medialBrainSketch() {
  return sketch(`${illustration('medial')}${note('paths within paths',63,235,'violet')}`, 'A fine pen study of a medial brain view, with nested internal structures.');
}

export function brainConnectionsSketch() {
  return sketch(`${illustration('lateral',12,15,214,174)}${illustration('medial',204,24,208,170)}${arrow('M138 197 C185 218 244 215 283 191 M274 194 L283 191 L280 201')}${note('different views. the same question.',31,239,'violet')}`, 'Two fine pen brain studies, an external and an internal view, connected by a small ink arrow.');
}

export function mindSketch() {
  return `<svg class="study-sketch cognition-sketch scientific-study neuron-study" viewBox="0 0 420 176" role="img" aria-label="A branching neuron study in fine pen, with colored marks tracing the connections.">${illustration('neurons',0,0,420,176)}</svg>`;
}

export function imagerySketch() {
  return sketch(`${illustration('lateral',7,12,273,187)}${illustration('neurons',262,75,155,110)}${arrow('M228 64 C294 30 342 64 335 118 M331 107 L335 118 L342 108')}${note('an internal world?',101,235,'violet')}`, 'A pen brain study connects to delicate neurons, posing a question about internal simulation.');
}

export function recallMindSketch() {
  return sketch(`${crayonStrokes([{ d:'M40 89 L52 81 L67 88 M335 173 L348 166 L362 173', color:'ochre', weight:12 }])}${illustration('medial',103,15,265,185)}${stroke('M28 90 l25 -17 l26 15 l-2 28 l-25 14 l-25 -14 Z M28 90 L52 105 L79 88 M52 105 L52 130 M52 105 L51 73','construction')}${arrow('M78 117 Q99 102 122 119 M111 114 L122 119 L112 125')}${stroke('M322 174 l26 -17 l26 16 l-2 29 l-26 13 l-25 -15 Z M322 174 L346 189 L374 173 M346 189 L346 215 M346 189 L348 157','brain-detail')}${arrow('M302 149 Q331 145 341 157 M333 151 L341 157 L331 158')}${note('a cue',19,158)}${note('reconstruct?',275,235,'violet')}`, 'A faint cube enters a pen brain study and a fuller cube reappears, asking about reconstruction in memory.');
}

export function embodiedMindSketch() {
  return sketch(`${illustration('neurons',-8,28,270,151)}${illustration('medial',198,21,230,173)}${arrow('M145 179 C176 225 263 220 289 187 M282 193 L289 187 L287 197')}${note('perception ↔ action',80,235,'violet')}`, 'Branching neurons and an internal brain study joined by a feedback loop between perception and action.');
}

export function selfSketch() {
  return sketch(`${illustration('dorsal',86,0,260,225)}${note('a mind?',304,61,'violet')}${stroke('M318 75 C356 119 348 178 310 201','construction')}${note('memory / experience / a point of view',3,237,'violet')}`, 'A pen brain study from above with an open question about mind and point of view.');
}

export function languageMindSketch() {
  return sketch(`${illustration('lateral',19,5,285,200)}${arrow('M270 174 C319 195 361 146 347 112 M343 124 L347 112 L354 121')}${note('meaning?',305,70,'violet')}${note('how does it become a symbol?',26,237,'violet')}`, 'A pen brain study connected to a handwritten question about meaning and symbols.');
}

export function attentionSketch() {
  return sketch(`${illustration('lateral',41,6,335,208)}${stroke('M188 75 C215 47 268 63 262 101 C248 126 210 130 189 110 C181 99 180 85 188 75','violet')}${note('selection?',9,43,'violet')}${arrow('M94 47 Q143 43 187 77 M177 70 L187 77 L175 79')}${note('same input. different focus.',44,236,'violet')}`, 'A fine pen brain study with an irregular ink circle and an open question about selection and attention.');
}

export function probabilitySketch() {
  const prior = { mean:0, deviation:1.2, className:'construction', color:'ochre' };
  const evidence = { mean:1.3, deviation:.7, className:'brain-detail', color:'blue' };
  const variance = 1 / (1 / prior.deviation ** 2 + 1 / evidence.deviation ** 2);
  const posterior = { mean:variance * evidence.mean / evidence.deviation ** 2, deviation:Math.sqrt(variance), className:'violet', color:'coral' };
  const curves = [prior, evidence, posterior].map(({mean,deviation,className,color}) => {
    const points = Array.from({length:111}, (_,index) => {
      const value = -4 + index * 8 / 110;
      const density = Math.exp(-.5 * ((value - mean) / deviation) ** 2) / (deviation * Math.sqrt(2 * Math.PI));
      return `${index ? 'L' : 'M'}${(31 + (value + 4) * 43).toFixed(2)} ${(171 - density * 172).toFixed(2)}`;
    }).join(' ');
    return stroke(points, className, color);
  }).join('');
  return sketch(`${stroke('M26 172 Q199 169 389 173 M31 177 L32 45 M25 54 L32 45 L37 56', 'construction')}${curves}${note('prior',83,114,'tiny')}${note('likelihood',265,91,'tiny')}${note('posterior',186,40,'violet')}${arrow('M235 44 Q251 56 245 66 M240 58 L245 66 L251 58')}${note('beliefs + evidence → updated beliefs',23,205,'tiny')}${note('p(h | x) ∝ p(x | h) p(h)',58,232,'violet')}`, 'Gaussian prior, likelihood, and their correctly calculated Gaussian posterior, with a handwritten form of Bayes’ rule.');
}

export function latentSpaceSketch() {
  const points = [[72,142],[94,130],[89,156],[123,119],[139,108],[154,127],[184,103],[217,121],[236,104],[268,87],[279,105],[306,77],[328,91]];
  return sketch(`${stroke('M38 193 Q200 194 377 191 M43 198 L44 32 M37 42 L44 32 L49 43 M367 186 L377 191 L367 197', 'construction')}${stroke('M56 158 C92 72 139 83 180 103 C218 151 242 64 302 58 C337 53 362 89 365 126 M63 169 C90 101 142 105 178 123 C218 165 247 84 302 79 C330 70 348 95 352 131', 'construction')}${points.map(([x,y],index) => `<circle class="latent-point ${index===6?'violet':''}" cx="${x}" cy="${y}" r="${index===6?4:2.1}"/>`).join('')}${stroke('M70 142 C101 122 132 111 154 127 C177 140 201 128 236 104 S281 84 306 77', 'violet')}${arrow('M169 78 Q186 80 185 98 M180 89 L185 98 L190 89')}${note('a thought?',113,65,'violet')}${note('z1',380,211,'tiny')}${note('z2',14,34,'tiny')}${note('nearby ≠ identical',69,227,'violet')}`, 'A conceptual latent space with two coordinates, grouped representation points, and a route through a neighborhood.');
}
