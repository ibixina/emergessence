function sketch(content, description) {
  return `<svg class="study-sketch cognition-sketch scientific-study" viewBox="0 0 420 240" role="img" aria-label="${description}">${content}</svg>`;
}

function stroke(d, className = '') {
  return `<path class="${className}" d="${d}"/>`;
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
  const filename = name === 'neurons' ? 'neuron.png' : `cognition-${name}-v4.png`;
  const source = new URL(`./assets/${filename}`, import.meta.url).href;
  return `<image href="${source}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
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
  return sketch(`${illustration('neurons',12,26,397,183)}${note('connections ↔ experience?',40,235,'violet')}`, 'Delicate branching neurons with a question about connections and experience.');
}

export function imagerySketch() {
  return sketch(`${illustration('lateral',7,12,273,187)}${illustration('neurons',262,75,155,110)}${arrow('M228 64 C294 30 342 64 335 118 M331 107 L335 118 L342 108')}${note('an internal world?',101,235,'violet')}`, 'A pen brain study connects to delicate neurons, posing a question about internal simulation.');
}

export function recallMindSketch() {
  return sketch(`${illustration('medial',103,15,265,185)}${stroke('M28 90 l25 -17 l26 15 l-2 28 l-25 14 l-25 -14 Z M28 90 L52 105 L79 88 M52 105 L52 130 M52 105 L51 73','construction')}${arrow('M78 117 Q99 102 122 119 M111 114 L122 119 L112 125')}${stroke('M322 174 l26 -17 l26 16 l-2 29 l-26 13 l-25 -15 Z M322 174 L346 189 L374 173 M346 189 L346 215 M346 189 L348 157','brain-detail')}${arrow('M302 149 Q331 145 341 157 M333 151 L341 157 L331 158')}${note('a cue',19,158)}${note('reconstruct?',275,235,'violet')}`, 'A faint cube enters a pen brain study and a fuller cube reappears, asking about reconstruction in memory.');
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
  const prior = { mean:0, deviation:1.2, className:'construction' };
  const evidence = { mean:1.3, deviation:.7, className:'brain-detail' };
  const variance = 1 / (1 / prior.deviation ** 2 + 1 / evidence.deviation ** 2);
  const posterior = { mean:variance * evidence.mean / evidence.deviation ** 2, deviation:Math.sqrt(variance), className:'violet' };
  const curves = [prior, evidence, posterior].map(({mean,deviation,className}) => {
    const points = Array.from({length:111}, (_,index) => {
      const value = -4 + index * 8 / 110;
      const density = Math.exp(-.5 * ((value - mean) / deviation) ** 2) / (deviation * Math.sqrt(2 * Math.PI));
      return `${index ? 'L' : 'M'}${(31 + (value + 4) * 43).toFixed(2)} ${(171 - density * 172).toFixed(2)}`;
    }).join(' ');
    return stroke(points, className);
  }).join('');
  return sketch(`${stroke('M26 172 Q199 169 389 173 M31 177 L32 45 M25 54 L32 45 L37 56', 'construction')}${curves}${note('prior',83,114,'tiny')}${note('likelihood',265,91,'tiny')}${note('posterior',186,40,'violet')}${arrow('M235 44 Q251 56 245 66 M240 58 L245 66 L251 58')}${note('beliefs + evidence → updated beliefs',23,205,'tiny')}${note('p(h | x) ∝ p(x | h) p(h)',58,232,'violet')}`, 'Gaussian prior, likelihood, and their correctly calculated Gaussian posterior, with a handwritten form of Bayes’ rule.');
}

export function latentSpaceSketch() {
  const points = [[72,142],[94,130],[89,156],[123,119],[139,108],[154,127],[184,103],[217,121],[236,104],[268,87],[279,105],[306,77],[328,91]];
  return sketch(`${stroke('M38 193 Q200 194 377 191 M43 198 L44 32 M37 42 L44 32 L49 43 M367 186 L377 191 L367 197', 'construction')}${stroke('M56 158 C92 72 139 83 180 103 C218 151 242 64 302 58 C337 53 362 89 365 126 M63 169 C90 101 142 105 178 123 C218 165 247 84 302 79 C330 70 348 95 352 131', 'construction')}${points.map(([x,y],index) => `<circle class="latent-point ${index===6?'violet':''}" cx="${x}" cy="${y}" r="${index===6?4:2.1}"/>`).join('')}${stroke('M70 142 C101 122 132 111 154 127 C177 140 201 128 236 104 S281 84 306 77', 'violet')}${arrow('M169 78 Q186 80 185 98 M180 89 L185 98 L190 89')}${note('a thought?',113,65,'violet')}${note('z1',380,211,'tiny')}${note('z2',14,34,'tiny')}${note('nearby ≠ identical',69,227,'violet')}`, 'A conceptual latent space with two coordinates, grouped representation points, and a route through a neighborhood.');
}

export function latentManifoldSketch() {
  function point(u,v) {
    const fold = Math.sin(u * Math.PI * 1.6 + v * .7);
    return [46 + u * 285 + v * 58, 69 + v * 95 + fold * 40 - u * 17];
  }
  function curve(fixed, across) {
    return Array.from({length:61},(_,index) => {
      const t = index / 60;
      const [x,y] = across ? point(t,fixed) : point(fixed,t);
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }
  const grid = Array.from({length:9},(_,index) => stroke(curve(index/8,true),'construction')).join('')
    + Array.from({length:15},(_,index) => stroke(curve(index/14,false),'construction')).join('');
  const route = Array.from({length:61},(_,index) => {
    const t = index/60;
    const [x,y] = point(.1 + t * .77,.42 + Math.sin(t*Math.PI)*.25);
    return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  const [x,y] = point(.53,.66);
  return sketch(`${grid}${stroke(curve(0,true),'brain-detail')}${stroke(curve(1,true),'brain-detail')}${stroke(curve(0,false),'brain-detail')}${stroke(curve(1,false),'brain-detail')}${stroke(route,'violet')}<circle class="latent-point violet" cx="${x}" cy="${y}" r="3.4"/>${note('many dimensions…',7,30,'tiny')}${note('…a few ways to move?',168,223,'violet')}${arrow('M80 193 Q108 197 130 176 M121 182 L130 176 L127 187')}`, 'A folded conceptual latent manifold, drawn as a faint pen mesh with an ink trajectory across its surface.');
}
