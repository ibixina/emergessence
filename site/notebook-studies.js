function svg(content, label, className = '') {
  return `<svg class="study-sketch ${className}" viewBox="0 0 420 240" role="img" aria-label="${label}">${content}</svg>`;
}

function line(d, className = '') {
  return `<path class="${className}" d="${d}"/>`;
}

function label(text, x, y, className = '') {
  return `<text class="${className}" x="${x}" y="${y}">${text}</text>`;
}

function box(x, y, width, height) {
  return line(`M${x} ${y + 2} L${x + width - 2} ${y} L${x + width} ${y + height - 1} L${x + 1} ${y + height} Z`);
}

function arrow(x, y, endX, endY, bend = 0) {
  return line(`M${x} ${y} Q${(x + endX) / 2} ${(y + endY) / 2 + bend} ${endX} ${endY} M${endX - 8} ${endY - 5} L${endX} ${endY} L${endX - 9} ${endY + 5}`, 'pen-arrow');
}

function pattern(x, y, bits, size = 14) {
  return bits.map((bit, index) => {
    const left = x + (index % 3) * (size + 5), top = y + Math.floor(index / 3) * (size + 5);
    const cell = `<path class="${bit === null ? 'missing-cell' : ''}" d="M${left} ${top + 1} l${size - 1} -1 l1 ${size} l-${size} 1 Z"/>`;
    const hatching = bit === 1 ? Array.from({length:4},(_,mark) => line(`M${left+2} ${top+3+mark*3} L${left+size-2} ${top+2+mark*3}`, 'cell-hatch')).join('') : '';
    return cell + hatching;
  }).join('');
}

export function recallSketch() {
  const nodes = [[143,83],[192,56],[246,85],[171,142],[223,161],[274,136]];
  const edges = [[0,1],[0,3],[0,4],[1,2],[1,4],[2,3],[2,5],[3,4],[4,5],[1,5]];
  let marks = edges.map(([a,b], index) => {
    const start = nodes[a], end = nodes[b];
    return line(`M${start[0]} ${start[1]} Q${(start[0]+end[0])/2 + (index%2 ? 3 : -3)} ${(start[1]+end[1])/2 - 3} ${end[0]} ${end[1]}`, index%3 ? 'faint' : '');
  }).join('');
  marks += nodes.map(([x,y], index) => `<path class="neuron-node" d="M${x-6} ${y-4} q7 -9 13 1 q4 10 -7 12 q-11 -2 -6 -13 Z"/>${label(['a','b','c','d','e','f'][index],x+9,y-10,'tiny')}`).join('');
  return svg(`${pattern(24,91,[1,null,0,null,1,null,0,null,1])}${arrow(90,119,131,111,-10)}${marks}${arrow(289,119,326,110,8)}${pattern(341,91,[1,1,0,0,1,0,0,1,1])}${label('a fragment',13,186)}${label('connections',153,211)}${label('a pattern?',326,187)}${line('M137 190 Q194 224 271 183 M263 181 L271 183 L267 192','pen-arrow')}${label('again',190,233,'violet')}${label('W',207,113,'violet')}`, 'A partial pattern enters a recurrent network. Repeated updates lead toward a possible complete pattern. This is a conceptual recall sketch.');
}

export function memorySketch() {
  let contour = '';
  for (let index=0; index<7; index++) {
    const offset=index*9;
    contour += line(`M35 ${132+offset*.6} C99 ${27+offset} 141 ${154-offset} 205 ${115+offset*.3} S298 ${36+offset} 375 ${102+offset}`, 'faint');
  }
  const points = [[74,124],[103,105],[139,121],[185,137],[224,111],[264,91],[296,98],[339,116]];
  return svg(`${contour}${points.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')}${line('M73 124 Q94 92 138 121 Q170 143 224 111 Q264 79 297 98','pen-arrow')}${line('M63 109 C106 67 169 103 153 143 C114 170 63 156 63 109','violet')}${label('nearby ≠ identical',43,207,'violet')}${label('cue',52,73)}${label('neighbors?',234,63)}${line('M254 68 L270 84 M263 79 L270 84 L268 75','pen-arrow')}`, 'A loosely drawn representation space, neighboring points, and a route from a cue.');
}

export function predictionSketch() {
  return svg(`${box(18,60,111,51)}${box(207,58,114,53)}${label('world',43,94)}${label('model',234,92)}${arrow(137,83,197,81,-12)}${label('input',144,62,'tiny')}${line('M317 116 Q331 173 221 187 Q108 199 70 139','pen-arrow')}${label('predict → compare → update',51,213,'violet')}${line('M71 139 l-5 11 M71 139 l10 7','pen-arrow')}${label('difference?',288,166,'tiny')}${label('imagery: run it',232,25,'violet')}${label('without the input?',223,45,'violet')}`, 'Input moves from a world to a model; predictions are compared with input to form an update loop. Imagery raises the question of running a model without new input.');
}

export function interactionSketch() {
  return svg(`${box(16,82,123,53)}${box(263,81,132,55)}${label('agent',45,115)}${label('environment',271,115)}${arrow(143,96,255,96,-34)}${label('action',174,56,'violet')}${line('M264 144 Q205 217 139 151 M145 148 L139 151 L143 160','pen-arrow')}${label('observation + reward',135,210,'violet')}${label('change one side…',26,34)}${label('…what changes on the other?',35,237,'tiny')}`, 'An agent acts on an environment and receives observations and rewards in a feedback loop.');
}

export function activationSketch() {
  const paths = [
    {name:'tanh', color:'violet', fn:x=>Math.tanh(x)},
    {name:'ReLU', color:'', fn:x=>Math.max(0,x)},
    {name:'sigmoid', color:'faint', fn:x=>1/(1+Math.exp(-x))}
  ];
  const curves=paths.map(({fn,color}) => {
    const points=Array.from({length:91},(_,index)=>{
      const x=-3+index/15;
      return `${index?'L':'M'}${(30+(x+3)*50).toFixed(2)} ${(149-fn(x)*34).toFixed(2)}`;
    }).join(' ');
    return line(points,color);
  }).join('');
  return svg(`${line('M22 149 Q198 147 351 150 M180 211 L180 24 M175 33 L180 24 L185 33 M342 145 L351 150 L342 154','faint')}${curves}${label('x',354,166,'tiny')}${label('tanh',339,83,'violet')}${label('ReLU',270,32)}${label('sigmoid',282,130,'tiny')}${label('f(x): another thing to learn?',29,236,'violet')}`, 'Accurate sketches of tanh, ReLU, and sigmoid activation functions, plotted over x from minus three to three.');
}

export function layersSketch() {
  const columns=[[46,[60,116,172]],[153,[38,91,144,197]],[267,[64,123,179]],[373,[91,151]]];
  let paths='';
  columns.slice(0,-1).forEach(([x,ys],column)=>{
    const [nextX,nextYs]=columns[column+1];
    ys.forEach(y=>nextYs.forEach((nextY,index)=>{ paths+=line(`M${x+6} ${y} Q${(x+nextX)/2} ${(y+nextY)/2 + (index%2?2:-2)} ${nextX-6} ${nextY}`,'faint'); }));
  });
  paths+=columns.map(([x,ys])=>ys.map(y=>`<path d="M${x-6} ${y-4} q7 -7 13 1 q3 9 -7 10 q-9 -1 -6 -11 Z"/>`).join('')).join('');
  return svg(`${paths}${label('input',18,230)}${label('hidden layers',148,231)}${label('output',341,230)}${line('M133 25 Q154 13 182 25','violet')}`, 'A sketched neural network with input, hidden layers, and output units.');
}

export function climbingSketch() {
  return svg(`${line('M58 203 L80 158 L63 142 L107 101 L93 71 L127 39 M302 219 L288 163 L322 130 L303 96 L335 55 L323 22')}${line('M119 88 C98 62 119 45 137 64 C153 78 135 99 119 88 M131 92 l22 43 l-31 30 l-15 40 M153 135 l28 20 l-7 54 M141 108 l-40 14 l-16 -10 M145 111 l40 -39 l21 -3')}${label('observe',9,27)}${label('reach',205,48,'violet')}${label('grip → move → try again',100,236)}${line('M205 53 L219 72 M211 69 L219 72 L218 63','pen-arrow')}`, 'A rough stick figure climbing between irregular rock holds, illustrating an observe, act, and retry loop.');
}

export function compressionSketch() {
  let blocks='';
  for(let index=0;index<5;index++) blocks+=box(26+index*2,37+index*27,104,21);
  for(let index=0;index<3;index++) blocks+=box(287+index,79+index*24,78,19);
  return svg(`${blocks}${label('teacher',44,220)}${label('student',288,220)}${arrow(145,118,275,119,-18)}${label('distill',168,89,'violet')}${label('keep which',155,167)}${label('representations?',149,190)}`, 'A teacher network with several layers passes knowledge to a smaller student network.');
}

export function terminalSketch() {
  return svg(`${box(26,23,369,185)}${line('M28 49 L392 46','faint')}${label('> video → text',47,82)}${label('.  :  *  #  @',115,119,'terminal-mark')}${label(':  #  @  #  :',115,148,'terminal-mark')}${label('.  :  *  :  .',115,178,'terminal-mark')}${label('same frames, different alphabet',36,235,'violet')}`, 'Video pixels are mapped to characters and shown inside a roughly sketched terminal.');
}

export function lifeSketch() {
  return svg(`${box(155,90,105,52)}${label('choices',170,122)}${arrow(136,98,80,59,-13)}${arrow(278,98,339,62,-11)}${line('M163 154 Q124 190 74 188 M83 181 L74 188 L87 191','pen-arrow')}${arrow(263,156,335,191,10)}${label('work',28,40)}${label('education',297,41)}${label('relationships',5,224)}${label('hidden paths',294,222,'violet')}${label('rules → consequences',108,24,'violet')}`, 'Choices branch into work, education, relationships, and hidden paths in a life simulation.');
}

export function processSketch() {
  return svg(`${box(13,82,104,49)}${box(160,80,104,53)}${box(310,82,98,48)}${label('input',36,116)}${label('model',183,115)}${label('action',325,115)}${arrow(122,107,154,105,-4)}${arrow(268,107,304,105,3)}${line('M358 141 Q338 208 205 206 Q69 211 63 143 M57 150 L63 143 L71 150','pen-arrow')}${label('behavior is the check',118,235,'violet')}${label('perception',8,43,'tiny')}${label('learning',173,42,'tiny')}${label('decisions',311,42,'tiny')}`, 'Input is transformed by a model into action, and behavior feeds back into the process.');
}

export function unitSketch() {
  return svg(`${label('x1',23,46)}${label('x2',24,116)}${label('x3',24,187)}${arrow(60,41,158,101,-8)}${arrow(59,111,156,113,2)}${arrow(60,179,157,125,5)}${line('M162 88 C188 61 224 86 217 119 C212 146 170 150 160 121 C157 111 157 98 162 88')}${label('sum',169,119)}${arrow(225,111,282,109,-5)}${box(291,81,62,56)}${label('f',314,118)}${arrow(359,112,402,112,5)}${label('weighted inputs',17,220,'violet')}${label('response',291,183)}${label('w1',90,48,'tiny')}${label('w2',93,100,'tiny')}${label('w3',91,178,'tiny')}`, 'Weighted inputs combine at a single unit, pass through an activation function, and produce a response.');
}

export function penMarks() {
  return svg(`${line('M34 121 C105 36 215 207 160 79 C139 32 76 177 206 131 C310 94 281 150 360 116','faint')}${line('M276 44 l10 23 l21 -10 l-32 -5 l8 30','violet')}${line('M50 190 l65 -5 M52 194 l56 -5 M55 198 l59 -5','faint')}`, 'Loose pen practice marks in the margin.', 'pen-practice');
}
