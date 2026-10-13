function sketch(content, description) {
  return `<svg class="study-sketch cognition-sketch" viewBox="0 0 420 240" role="img" aria-label="${description}">${content}</svg>`;
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

function shading(patches) {
  return patches.map(([x,y,count=5]) => Array.from({length:count}, (_,index) => {
    const left = x + index * 2.4, top = y + index * .65;
    return stroke(`M${left} ${top} q-1 4 -4 8`, 'brain-shade');
  }).join('')).join('');
}

function lateralBrain(transform = '') {
  const outline = 'M21 114 C9 108 6 91 14 80 C9 64 22 47 38 44 C44 25 62 18 79 22 C94 6 117 9 131 13 C149 3 170 10 182 17 C201 12 219 23 227 33 C250 32 269 48 270 62 C289 73 297 91 290 106 C304 121 294 143 275 149 C261 164 237 166 223 158 C204 172 181 173 165 167 C142 176 118 171 104 161 C88 162 68 152 62 142 C43 143 27 133 21 114';
  const folds = [
    'M37 47 C48 52 53 62 42 70 C25 73 28 88 37 94 C48 103 42 118 31 119',
    'M70 26 C64 42 88 38 86 54 C83 67 58 61 59 78 C57 92 76 95 68 109 C61 120 49 116 49 129',
    'M111 16 C103 29 113 38 99 45 M113 41 C126 45 128 56 116 66 C101 77 80 74 84 94 C87 105 110 100 104 116 C100 128 79 124 80 143',
    'M146 17 C133 26 149 39 137 46 C129 51 138 62 151 60 C169 58 176 69 168 82 C159 94 141 79 131 89 C116 106 137 111 132 128 C128 140 112 143 110 158',
    'M176 24 C167 33 183 43 175 54 M195 29 C189 43 207 45 211 56 C217 72 194 68 190 81 C187 94 206 98 203 111',
    'M230 43 C216 53 239 61 235 74 C230 89 214 80 213 96 C211 111 230 109 232 121 C235 134 214 143 203 143',
    'M261 64 C244 60 249 77 263 81 C283 89 280 107 263 110 C252 110 247 121 255 130 M282 120 C278 137 257 137 247 147',
    'M52 137 C76 133 90 146 109 137 C128 127 144 139 154 128 C164 113 156 104 174 98 C185 94 190 105 186 118',
    'M151 162 C166 144 182 156 190 141 C199 123 209 127 218 130',
    'M73 45 C73 33 87 25 99 29 M156 76 C146 69 132 73 131 83 M96 112 C94 101 81 102 79 96',
    'M34 94 C35 82 50 87 53 99 M145 130 C151 145 139 151 134 158 M216 85 C230 92 241 85 246 96'
  ];
  const hindbrain = strokes([
    'M238 158 C243 146 267 144 279 157 C295 174 278 190 258 187 C249 183 239 176 238 158',
    'M243 159 C256 153 270 157 280 165 M244 165 C258 160 271 164 280 171 M247 172 C257 169 269 172 276 178 M252 178 C260 176 265 180 270 182',
    'M229 160 C220 174 219 182 226 194 L238 200 M234 175 L242 192'
  ], 'brain-detail');
  return `<g transform="${transform}">${stroke(outline, 'brain-contour')}${stroke('M17 82 C8 95 15 111 23 116 M81 20 C98 8 118 12 130 16 M225 159 C212 172 190 174 173 170', 'construction')}${strokes(folds, 'brain-fold')}${shading([[39,82],[73,111],[106,61,4],[139,90,5],[174,127,4],[220,96],[267,110,4]])}${hindbrain}</g>`;
}

function dorsalBrain(transform = '') {
  const outlines = [
    'M202 20 C170 7 146 21 128 40 C102 69 98 107 106 143 C105 176 129 212 163 217 C189 222 200 205 201 186 C207 166 199 144 202 124 C198 101 207 79 202 58 C207 39 205 28 202 20',
    'M213 21 C243 8 275 26 289 48 C311 70 319 109 310 139 C315 165 292 201 269 212 C245 225 220 214 214 193 C209 173 217 151 212 132 C218 111 209 89 214 67 C210 49 216 34 213 21'
  ];
  const folds = [
    'M183 27 C181 47 153 39 150 58 C149 74 174 74 175 88 C176 109 144 99 143 116 C139 133 164 133 164 147 C163 163 140 162 144 183 C147 198 168 193 168 210',
    'M132 58 C134 80 116 81 120 98 C123 109 136 105 133 122 C130 137 118 141 126 160 C132 173 126 187 139 196',
    'M189 56 C178 62 188 76 188 84 M191 103 C180 107 186 124 178 130 M192 149 C183 155 187 172 177 181',
    'M236 28 C227 44 251 47 247 63 C243 77 228 70 227 88 C226 105 253 101 251 119 C250 137 227 132 229 149 C233 163 252 161 251 179 C247 194 235 200 239 213',
    'M271 43 C267 61 285 62 284 78 C284 93 267 92 269 109 C272 124 295 116 297 133 C300 150 279 151 278 165 C281 178 271 190 261 198',
    'M295 70 C303 82 290 92 298 105 M232 119 C229 109 217 108 223 96 M265 142 C254 138 259 126 262 121',
    'M159 85 C148 79 135 92 137 100 M159 171 C173 166 170 181 183 183 M267 69 C254 62 259 51 253 44'
  ];
  return `<g transform="${transform}">${strokes(outlines, 'brain-contour')}${strokes(folds, 'brain-fold')}${shading([[127,92],[157,120],[167,171,4],[241,80,4],[273,127],[285,156,4]])}${stroke('M207 23 C202 69 210 92 206 127 C204 157 210 186 207 207', 'construction')}</g>`;
}

function medialBrain(transform = '') {
  return `<g transform="${transform}">${stroke('M22 112 C9 90 18 63 40 44 C58 19 89 10 124 14 C156 4 203 18 230 35 C257 39 284 65 286 91 C307 121 278 144 252 148 L230 152 C222 171 222 185 233 199 M223 198 C207 181 205 171 212 158 C177 171 134 172 102 159 C65 160 38 144 22 112', 'brain-contour')}${strokes([
    'M38 111 C34 82 64 52 92 45 C130 28 180 33 214 57 C236 67 250 93 251 116',
    'M76 106 C77 83 105 62 128 61 C158 48 189 61 204 77 C218 95 209 113 188 113 C170 113 152 103 138 119',
    'M87 112 C96 94 116 77 136 77 C158 69 178 78 188 92 C195 106 180 111 165 107',
    'M136 120 C152 126 174 124 181 137 C176 150 154 145 143 142 C128 148 119 146 117 133',
    'M47 48 C48 65 69 63 65 80 M92 24 C84 38 105 37 109 45 M144 20 C139 32 159 33 165 38',
    'M193 30 C189 43 217 46 220 59 M259 70 C241 76 264 94 269 100 M34 102 C54 95 51 115 63 121 M80 135 C92 125 103 143 115 145',
    'M238 155 C252 144 278 148 284 166 C290 185 269 192 249 184 C240 176 234 168 238 155',
    'M245 159 Q264 153 278 165 M244 166 Q261 161 280 174 M249 175 Q262 169 275 181'
  ], 'brain-fold')}${shading([[65,75,4],[101,46,4],[193,77],[257,110,4],[155,139,4]])}${arrow('M115 117 C138 93 171 95 183 108 M174 103 L183 108 L173 113')}${stroke('M23 112 C15 94 18 79 23 68 M124 10 C162 5 194 16 219 30', 'construction')}</g>`;
}

function coronalBrain(transform = '') {
  return `<g transform="${transform}">${stroke('M78 140 C54 112 66 68 90 48 C121 16 165 8 207 18 C248 5 294 26 319 63 C342 87 342 119 322 146 C304 168 277 180 248 170 L224 151 C220 167 220 194 222 210 L199 211 L194 154 C169 180 143 180 119 169 C102 165 86 154 78 140', 'brain-contour')}${strokes([
    'M83 82 C103 82 99 58 119 55 C134 53 130 36 152 34 M171 27 C164 44 184 47 181 61 C178 80 155 68 150 86 C146 101 171 106 166 122 C160 133 139 119 132 136',
    'M89 99 C103 88 116 106 107 118 C100 132 119 139 125 152 M117 77 C133 70 145 89 133 103 M155 152 C170 139 182 153 189 140',
    'M239 29 C245 42 224 46 229 62 C234 77 257 64 262 81 C268 98 244 103 248 118 C251 130 274 124 277 140 M285 49 C290 66 311 64 309 84',
    'M318 99 C305 87 292 102 300 118 C307 133 287 139 288 151 M281 74 C269 66 265 86 278 99 M230 142 C248 145 244 161 263 160',
    'M189 88 C176 80 165 95 173 105 L194 133 L198 105 C203 93 201 86 189 88 M224 89 C237 80 249 93 242 105 L222 133 L218 107 C212 95 213 85 224 89'
  ], 'brain-fold')}${shading([[105,111,4],[150,86],[177,114,4],[240,109],[280,118,4],[302,84,4]])}${stroke('M208 21 L209 75 M207 147 L209 197', 'construction')}</g>`;
}

function head(transform = '', closedEye = false) {
  return `<g transform="${transform}">${stroke('M113 227 L128 190 C109 171 100 150 103 125 C85 101 90 72 105 52 C120 24 151 11 183 15 C218 8 249 26 261 51 C275 69 273 88 282 99 L281 109 L300 135 C302 140 288 143 284 143 L285 155 L277 164 C291 180 277 191 253 192 L250 225', 'brain-contour')}${stroke(closedEye ? 'M257 111 Q269 118 278 109 M265 113 L264 118 M273 113 L275 118' : 'M253 111 Q266 103 277 110 Q267 116 253 111 M265 106 Q269 110 265 114', 'brain-detail')}${stroke('M258 155 L276 155 M255 168 Q266 172 277 164 M113 131 C128 119 136 140 127 151 C116 155 111 147 116 140 M131 186 Q156 196 169 190', 'brain-detail')}${stroke('M96 77 C102 42 126 25 155 20 M107 128 C99 151 109 168 122 183', 'construction')}</g>`;
}

function eye(transform = '') {
  return `<g transform="${transform}">${stroke('M21 71 C48 35 102 30 140 64 C106 93 55 97 21 71 M25 71 C55 67 109 70 135 64', 'brain-contour')}${stroke('M60 46 C45 72 66 94 86 83 C105 71 97 46 83 42 M68 46 C57 62 64 80 80 80 M31 60 L24 50 M42 49 L38 37 M113 47 L122 36 M128 56 L139 47 M31 83 Q74 106 126 87', 'brain-detail')}<circle class="ink-dot" cx="76" cy="65" r="7"/>${stroke('M39 27 C65 15 109 21 132 36', 'construction')}</g>`;
}

export function lateralBrainSketch() {
  return sketch(`${lateralBrain('translate(48 17)')}${note('a structure…',16,212)}${note('experience?',236,229,'violet')}${arrow('M329 195 Q365 190 365 159 M359 167 L365 159 L369 169')}`, 'A loose lateral brain study, with cortical folds, a cerebellum, and a question about structure and experience.');
}

export function dorsalBrainSketch() {
  return sketch(`${dorsalBrain()}${note('two hemispheres',17,28,'tiny')}${arrow('M93 31 Q123 18 150 26 M140 21 L150 26 L139 30')}${note('one mind?',310,220,'violet')}${stroke('M194 226 Q211 235 230 224', 'violet')}`, 'A brain viewed from above, with two irregular hemispheres and a handwritten question: one mind?');
}

export function medialBrainSketch() {
  return sketch(`${medialBrain('translate(48 8)')}${note('paths within paths',16,226,'violet')}${arrow('M349 207 Q361 176 336 137 M337 147 L336 137 L344 143')}`, 'A schematic medial brain study, with nested internal contours and a pencil arrow tracing a route.');
}

export function coronalBrainSketch() {
  return sketch(`${coronalBrain()}${note('another view',15,227,'violet')}${stroke('M57 39 l12 -7 M53 46 l13 -6 M344 35 l12 7', 'construction')}`, 'A schematic frontal section of a brain, drawn as a loose study with bilateral folds and inner spaces.');
}

export function mindSketch() {
  return sketch(`${head('translate(8 0)', true)}${lateralBrain('translate(124 51) scale(.46)')}${note('brain',45,78,'tiny')}${arrow('M95 78 Q119 57 150 69 M139 66 L150 69 L141 76')}${note('mind?',303,28,'violet')}${stroke('M286 44 Q310 57 303 88', 'violet')}${note('an experience, from this?',44,235,'violet')}`, 'A profile of a person with a small brain study inside the head and an open question about subjective experience.');
}

export function imagerySketch() {
  return sketch(`${head('translate(-33 20) scale(.88)', true)}${stroke('M122 98 L152 71 L183 99 L179 139 L130 140 Z M117 101 L152 70 L187 100 M145 140 L146 116 L161 115 L162 140 M133 107 l9 0 l0 9 l-9 1 Z', 'brain-detail')}${stroke('M295 104 L323 78 L351 106 L348 142 L302 143 Z M289 107 L323 77 L357 107 M315 142 L316 121 L329 120 L330 142', 'construction')}${arrow('M193 110 C216 81 262 79 288 100 M277 96 L288 100 L278 105')}${note('inside',125,167,'violet')}${note('outside',294,168)}${note('the world, with eyes closed?',50,234,'violet')}${stroke('M219 54 l4 -8 l3 9 l8 2 l-8 3 l-4 8 l-2 -9 l-9 -3 Z', 'construction')}`, 'A closed-eye profile imagines a roughly drawn house, with a faint house outside and an arrow connecting the two.');
}

export function attentionSketch() {
  return sketch(`${eye('translate(19 61)')}${stroke('M199 46 l15 27 l-30 2 Z M267 110 l29 2 l-1 27 l-27 -1 Z M333 58 C347 42 373 50 366 70 C359 88 337 82 333 58 M310 185 l9 -14 l7 17 l17 3 l-16 6 l-9 14 l-5 -16 l-15 -3 Z', 'brain-detail')}${stroke('M160 129 L209 62 M162 131 L350 66 M160 132 L282 127 M159 134 L321 189', 'construction')}${stroke('M258 103 C284 89 315 105 307 135 C284 159 252 143 258 103', 'violet')}${arrow('M169 130 Q215 109 266 121 M256 115 L266 121 L255 126')}${note('same scene.',31,222)}${note('different attention.',194,237,'violet')}`, 'An eye faces several objects; one object is loosely circled, suggesting selection and attention.');
}

export function recallMindSketch() {
  return sketch(`${medialBrain('translate(102 28) scale(.76)')}${stroke('M28 90 l25 -17 l26 15 l-2 28 l-25 14 l-25 -14 Z M28 90 L52 105 L79 88 M52 105 L52 130 M52 105 L51 73', 'construction')}${arrow('M78 117 Q99 102 122 119 M111 114 L122 119 L112 125')}${stroke('M322 174 l26 -17 l26 16 l-2 29 l-26 13 l-25 -15 Z M322 174 L346 189 L374 173 M346 189 L346 215 M346 189 L348 157', 'brain-detail')}${arrow('M302 149 Q331 145 341 157 M333 151 L341 157 L331 158')}${note('a cue',19,158)}${note('reconstruct?',275,237,'violet')}`, 'A faint cube enters a medial brain sketch and a fuller cube reappears, posing a question about reconstruction in memory.');
}

export function learningBrainSketch() {
  return sketch(`${lateralBrain('translate(53 10)')}${stroke('M109 100 C145 58 195 165 252 81 M110 101 C143 63 200 158 252 83', 'violet')}${arrow('M148 206 C174 221 220 220 240 199 M231 204 L240 199 L237 211')}${note('experience leaves a trace?',47,235,'violet')}`, 'A lateral brain sketch with a retraced ink route and a question about changes through experience.');
}

export function workingMemorySketch() {
  return sketch(`${head('translate(9 0)')}${stroke('M140 93 l18 -23 l18 25 Z M206 76 C217 61 237 68 234 85 C228 101 208 94 206 76 M177 140 l25 0 l-2 24 l-24 -2 Z', 'brain-detail')}${stroke('M131 74 C179 40 253 62 250 121 C254 180 157 179 130 128 C113 111 113 91 131 74', 'violet')}${arrow('M223 150 Q243 146 248 125 M242 132 L248 125 L251 136')}${note('hold on to this…',282,62,'violet')}${note('…while doing that.',13,236)}`, 'A head holds three small objects in an irregular loop, suggesting working memory and keeping something in mind.');
}

export function embodiedMindSketch() {
  return sketch(`${head('translate(-33 3) scale(.78)')}${stroke('M272 216 L274 185 C263 172 264 162 269 158 L283 173 L284 128 C284 118 294 119 295 129 L297 164 L301 115 C303 105 312 109 312 119 L310 164 L318 125 C321 116 329 122 327 133 L321 170 L334 149 C339 143 345 150 341 157 L330 190 L320 215 M281 174 Q303 166 320 179', 'brain-contour')}${stroke('M290 59 l28 -17 l30 16 l-3 31 l-29 14 l-27 -15 Z M290 59 L316 75 L348 58 M316 75 L316 103 M316 75 L318 42', 'brain-detail')}${arrow('M190 83 Q243 40 286 67 M276 60 L286 67 L275 70 M315 113 Q326 127 323 141 M319 132 L323 141 L329 132')}${stroke('M274 201 C241 211 207 190 189 147', 'construction')}${note('seeing ↔ doing',48,230,'violet')}`, 'A profile looks toward a cube while an open hand reaches toward it, with arrows joining perception and action.');
}

export function selfSketch() {
  return sketch(`${head('translate(5 0)', true)}${stroke('M164 65 C154 85 169 96 187 87 C208 77 205 103 185 109 C162 118 174 139 191 133 C212 126 220 149 200 159 M142 79 C137 109 151 134 146 155 M231 58 C224 83 241 100 234 117', 'brain-fold')}${note('a self?',306,74,'violet')}${arrow('M325 87 C352 143 328 204 273 195 M281 190 L273 195 L283 201')}${note('body / memory / a point of view',5,237,'violet')}`, 'A contemplative profile with incomplete internal traces and a looping arrow asking about self and point of view.');
}

export function languageMindSketch() {
  return sketch(`${head('translate(-19 8) scale(.88)')}${stroke('M173 113 C179 99 195 101 196 115 C207 100 223 113 214 126 C200 138 185 140 173 113', 'brain-detail')}${arrow('M245 147 C272 159 288 131 298 113 M289 119 L298 113 L294 125')}${note('a thought',128,169,'violet')}${note('word?',302,77)}${note('meaning?',295,166,'violet')}${stroke('M298 81 Q329 91 365 80 M301 169 Q336 177 375 166', 'construction')}${note('how does it become a symbol?',26,236,'violet')}`, 'A profile holds a small internal thought and sends it toward words and meaning, asking how thoughts become symbols.');
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
  return sketch(`${grid}${stroke(curve(0,true),'brain-detail')}${stroke(curve(1,true),'brain-detail')}${stroke(curve(0,false),'brain-detail')}${stroke(curve(1,false),'brain-detail')}${stroke(route,'violet')}<circle class="latent-point violet" cx="${x}" cy="${y}" r="3.4"/>${note('many dimensions…',7,30,'tiny')}${note('…a few ways to move?',168,223,'violet')}${arrow('M80 193 Q108 197 130 176 M121 182 L130 176 L127 187')}`, 'A folded conceptual latent manifold, drawn as a faint pencil mesh with an ink trajectory across its surface.');
}
