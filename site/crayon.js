const texture = new URL('./assets/crayon-grain.svg', import.meta.url).href;
const colors = { teal:'#6caaa0', ochre:'#e1b453', coral:'#d99585', blue:'#83a7c9' };
let drawing = 0;

export function crayonStrokes(strokes, width = 420, height = 240) {
  const id = `crayon-${++drawing}`;
  const grain = width * 32 / 420;
  const paths = strokes.map(({ d, color = 'teal', weight = 6 }) =>
    `<path d="${d}" style="fill:none;stroke:${colors[color]};stroke-width:${weight};stroke-linecap:round;stroke-linejoin:round"/>`
  ).join('');
  return `<defs><pattern id="${id}-grain" patternUnits="userSpaceOnUse" width="${grain}" height="${grain}"><image href="${texture}" width="${grain}" height="${grain}"/></pattern><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="url(#${id}-grain)"/></mask></defs><g class="crayon-marks" aria-hidden="true" mask="url(#${id})">${paths}</g>`;
}
