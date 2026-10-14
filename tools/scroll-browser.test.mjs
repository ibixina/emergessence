import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
let browser;
let server;
let url = process.env.TEST_URL;
const errors = [];

before(async () => {
  if (!url) {
    const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
    const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.ttf':'font/ttf' };
    server = createServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (!path.startsWith(root + sep)) throw new Error('Invalid path');
        const body = await readFile(path);
        response.writeHead(200, { 'Content-Type':types[extname(path)] || 'application/octet-stream' });
        response.end(body);
      } catch {
        response.writeHead(404);
        response.end();
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}/`;
  }
  browser = await chromium.launch({
    headless:true,
    executablePath:process.env.BROWSER_EXECUTABLE || undefined,
    args:['--no-sandbox']
  });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function open(options = {}) {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 }, ...options });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/site/thoughtspace.js?*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('const scene = new ThoughtScene(hero);', 'const scene = new ThoughtScene(hero); window.testScene = scene;');
    await route.fulfill({ response, body });
  });
  await page.goto(url);
  await page.waitForFunction(() => window.testScene?.currentIndex === 0 || window.testScene?.enabled === false);
  return { context, page };
}

const snapshot = page => page.evaluate(() => ({
  offset:scrollY,
  camera:window.testScene.camera,
  index:window.testScene.currentIndex,
  stops:window.testScene.stops.map(stop => ({ anchor:stop.anchor, start:stop.start + stop.entrance, end:stop.start + stop.entrance + stop.overflow }))
}));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1, `expected ${expected}, got ${actual}`);

async function navigate(page, index, pan = 0) {
  await page.evaluate(({ index, pan }) => {
    const scene = window.testScene;
    scene.navigate(`#${scene.stops[index].anchor}`);
    if (pan) window.scrollTo({ top:scene.stops[index].start + scene.stops[index].entrance + pan, behavior:'instant' });
  }, { index, pan });
  await page.waitForTimeout(450);
}

async function trace(page) {
  await page.evaluate(() => {
    window.motionFrames = [];
    const start = performance.now();
    const page = window.testScene.active.page;
    function sample(time) {
      const rect = page.getBoundingClientRect();
      window.motionFrames.push({ time:time - start, camera:window.testScene.camera, width:rect.width, top:rect.top, offset:scrollY });
      if (time - start < 1100) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
}

test('reading spreads fill the viewport without shrinking tall content', async () => {
  for (const viewport of [{ width:1902, height:1058 }, { width:2560, height:1440 }, { width:1440, height:900 }, { width:390, height:844 }]) {
    const { context, page } = await open({ viewport });
    const count = await page.evaluate(() => window.testScene.stops.length);
    for (let index = 1; index < count; index++) {
      await navigate(page, index);
      const dimensions = await page.evaluate(() => {
        const scene = window.testScene;
        const stop = scene.active;
        const rect = stop.page.getBoundingClientRect();
        return {
          width:rect.width, height:rect.height, left:rect.left, top:rect.top,
          availableWidth:scene.width - Math.min(100, scene.width * .12), availableHeight:scene.height - 135,
          viewportWidth:scene.width, viewportHeight:scene.height, scale:stop.scale, overflow:stop.overflow
        };
      });
      assert.ok(dimensions.scale >= 1, 'reading content must never be reduced below its natural size');
      assert.ok(dimensions.width <= dimensions.availableWidth + 1, 'the spread exceeds the available width');
      assert.ok(Math.max(dimensions.width / dimensions.availableWidth, dimensions.height / dimensions.availableHeight) >= .999,
        `page ${index} left unused space at ${viewport.width}×${viewport.height}: ${JSON.stringify(dimensions)}`);
      close(dimensions.left, (dimensions.viewportWidth - dimensions.width) / 2);
      assert.ok(dimensions.top >= 44, 'the start of the page is clipped');
      if (!dimensions.overflow) assert.ok(dimensions.top + dimensions.height <= dimensions.viewportHeight - 89, 'the page overlaps its controls');
      if (index === 1 && viewport.width === 1902 && process.env.READING_PREVIEW_PATH) {
        await page.screenshot({ path:process.env.READING_PREVIEW_PATH });
      }
    }
    await context.close();
  }
});

test('small scrolls give visible feedback in both directions, then restore full reading scale', async () => {
  const { context, page } = await open({ viewport:{ width:1823, height:1033 } });
  await navigate(page, 2);
  const initial = await snapshot(page);
  const readingWidth = await page.evaluate(() => window.testScene.active.page.getBoundingClientRect().width);
  for (const direction of [1, -1]) {
    await trace(page);
    await page.mouse.wheel(0, 20 * direction);
    await page.waitForTimeout(1200);
    const frames = await page.evaluate(() => window.motionFrames);
    const firstMovement = frames.find(frame => Math.abs(frame.width - frames[0].width) > 1);
    assert.ok(firstMovement, 'the rendered drawings did not follow the scroll');
    assert.ok(firstMovement.time < 100, `visual response took ${firstMovement.time}ms`);
    assert.ok(frames.some(frame => direction * (frame.offset - initial.offset) > 1));
    close((await snapshot(page)).offset, initial.offset);
    assert.equal((await snapshot(page)).index, 2);
    const width = await page.evaluate(() => window.testScene.active.page.getBoundingClientRect().width);
    assert.ok(Math.abs(width - readingWidth) < .1, 'the page remained scaled down after release');
  }
  await context.close();
});

test('resizing and research disclosures keep the active spread readable', async () => {
  const { context, page } = await open({ viewport:{ width:1902, height:1058 } });
  await navigate(page, 3);
  for (const viewport of [{ width:2560, height:1440 }, { width:390, height:844 }, { width:1902, height:1058 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(450);
    const state = await snapshot(page);
    assert.equal(state.index, 3, 'resizing changed pages');
    close(state.offset, state.stops[3].start);
  }
  await page.locator('#memory summary').click();
  await page.waitForTimeout(450);
  assert.equal((await snapshot(page)).index, 3);
  await page.locator('#memory summary').click();
  await page.waitForTimeout(450);
  const state = await snapshot(page);
  assert.equal(state.index, 3);
  close(state.offset, state.stops[3].start);
  const steady = await page.evaluate(() => ({ transform:window.testScene.active.page.style.transform, offset:scrollY }));
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => ({ transform:window.testScene.active.page.style.transform, offset:scrollY })), steady, 'layout did not come to rest');
  await context.close();
});

test('stopping anywhere in a transition returns to a full-size page instead of floating', async () => {
  const { context, page } = await open({ viewport:{ width:1823, height:1033 } });
  const { stops } = await snapshot(page);
  for (const fraction of [.1, .35, .49, .51, .65, .9]) {
    await navigate(page, 0);
    await page.mouse.wheel(0, stops[1].start * fraction);
    await page.waitForTimeout(1200);
    const expectedIndex = fraction < .5 ? 0 : 1;
    close((await snapshot(page)).offset, stops[expectedIndex].start);
    assert.equal((await snapshot(page)).index, expectedIndex);
    const scale = await page.evaluate(() => {
      const scene = window.testScene;
      return scene.active.page.getBoundingClientRect().width / scene.active.width;
    });
    assert.ok(Math.abs(scale - 1) < .001, `the page rested at scale ${scale}`);
    if (fraction === .65 && process.env.SCROLL_PREVIEW_PATH) {
      await page.screenshot({ path:process.env.SCROLL_PREVIEW_PATH });
    }
  }
  await context.close();
});

test('fractional input accumulates within tall content instead of being rounded away', async () => {
  const { context, page } = await open({ viewport:{ width:390, height:844 } });
  const { stops } = await snapshot(page);
  const index = stops.findIndex(stop => stop.end - stop.start > 200);
  assert.ok(index > 0);
  await navigate(page, index, 100);
  const topBefore = await page.evaluate(() => window.testScene.active.page.getBoundingClientRect().top);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, .25);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(1100);
  const topAfter = await page.evaluate(() => window.testScene.active.page.getBoundingClientRect().top);
  assert.ok(topBefore - topAfter > 1.5, `eight quarter-pixel inputs moved content by ${topBefore - topAfter}px`);
  assert.equal((await snapshot(page)).index, index);
  await context.close();
});

test('quick flings remain one continuous page transition', async () => {
  const { context, page } = await open();
  const { stops } = await snapshot(page);
  await trace(page);
  for (const delta of [5000, 2000, 1000, 500, 100, 30, 5]) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(600);
  close((await snapshot(page)).offset, stops[1].start);
  assert.equal((await snapshot(page)).index, 1);
  const frames = await page.evaluate(() => window.motionFrames);
  const moving = frames.filter((frame, index) => index && Math.abs(frame.camera - frames[index - 1].camera) > .1);
  const gaps = moving.slice(1).map((frame, index) => frame.time - moving[index].time);
  assert.ok(Math.max(...gaps) < 100, `motion stopped for ${Math.max(...gaps)}ms during the transition`);
  assert.ok(frames.every((frame, index) => !index || frame.camera >= frames[index - 1].camera - .1), 'the fling snapped backward');
  await context.close();
});

test('approaching a page coasts into its reading position with a continuous pull', async () => {
  const { context, page } = await open();
  const { stops } = await snapshot(page);
  await navigate(page, 2);
  await trace(page);
  const destination = stops[3].start;
  await page.mouse.wheel(0, destination - stops[2].start - 250);
  await page.waitForTimeout(1200);
  close((await snapshot(page)).offset, destination);
  assert.equal((await snapshot(page)).index, 3);
  const frames = await page.evaluate(() => window.motionFrames);
  const moving = frames.filter((frame, index) => index && Math.abs(frame.camera - frames[index - 1].camera) > .1);
  const gaps = moving.slice(1).map((frame, index) => frame.time - moving[index].time);
  assert.ok(Math.max(...gaps) < 100, 'the pull introduced a stop before alignment');
  assert.ok(frames.every((frame, index) => !index || frame.camera >= frames[index - 1].camera - .1));
  await context.close();
});

test('reversal interrupts the transition and returns smoothly to the original page', async () => {
  const { context, page } = await open();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100);
  const forward = (await snapshot(page)).offset;
  assert.ok(forward > 100);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(100);
  assert.ok((await snapshot(page)).offset < forward);
  await page.waitForTimeout(1000);
  close((await snapshot(page)).offset, 0);
  await context.close();
});

test('backward flings, tall reading boundaries, and page controls remain functional', async () => {
  const { context, page } = await open();
  const { stops } = await snapshot(page);
  await navigate(page, 2);
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(1100);
  close((await snapshot(page)).offset, stops[1].end);
  const tallIndex = stops.findIndex(stop => stop.end - stop.start > 60);
  await navigate(page, tallIndex);
  await page.mouse.wheel(0, 5000);
  await page.waitForTimeout(1100);
  close((await snapshot(page)).offset, stops[tallIndex].end);
  assert.equal((await snapshot(page)).index, tallIndex);
  await page.mouse.wheel(0, 5000);
  await page.waitForTimeout(1100);
  close((await snapshot(page)).offset, stops[tallIndex + 1].start);
  await page.locator('.journey-next').click();
  await page.waitForTimeout(1100);
  close((await snapshot(page)).offset, stops[tallIndex + 2].start);
  await page.locator('.journey-chapters:visible a[href="#contact"]').first().click();
  await page.waitForTimeout(1100);
  close((await snapshot(page)).offset, stops.at(-1).start);
  await context.close();
});

test('latent-space controls preserve correspondence while changing position and projection', async () => {
  const { context, page } = await open();
  await page.evaluate(() => window.testScene.navigate('#latent-spaces'));
  await page.waitForTimeout(450);
  const index = (await snapshot(page)).index;
  const views = () => page.locator('.latent-plot').evaluateAll(elements => elements.map(svg => ({
    drawing:svg.innerHTML,
    neighbors:[...svg.querySelectorAll('[data-neighbor="true"]')].map(point => point.dataset.sample).sort(),
    marker:[...svg.querySelectorAll('.latent-selection')].map(point => [Number(point.getAttribute('cx')), Number(point.getAttribute('cy'))])
  })));
  const initial = await views();
  assert.ok(initial[0].neighbors.length > 0);
  assert.deepEqual(initial[0].neighbors, initial[1].neighbors);
  const position = page.getByRole('slider', { name:'Trace a path' });
  await position.focus();
  await position.press('End');
  await page.waitForFunction(() => document.querySelector('.latent-position-value').textContent === 'z = (1.00, 0.50)');
  const end = await views();
  assert.notDeepEqual(end[0].neighbors, initial[0].neighbors);
  assert.deepEqual(end[0].neighbors, end[1].neighbors);
  assert.notDeepEqual(end[0].marker, initial[0].marker);
  assert.notDeepEqual(end[1].marker, initial[1].marker);
  const angle = page.getByRole('slider', { name:'Rotate the surface' });
  await angle.focus();
  await angle.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.latent-angle-value').textContent === '-109°');
  const rotated = await views();
  assert.notEqual(rotated[0].drawing, end[0].drawing);
  assert.equal(rotated[1].drawing, end[1].drawing);
  assert.deepEqual(rotated[0].neighbors, end[0].neighbors);
  await position.focus();
  await position.press('Home');
  await page.waitForFunction(() => document.querySelector('.latent-position-value').textContent === 'z = (0.00, 0.50)');
  const start = await views();
  assert.deepEqual(start[0].neighbors, start[1].neighbors);
  assert.equal((await snapshot(page)).index, index, 'using sliders changed the reading spread');
  await context.close();
});

test('latent-space controls fit mobile and work with reduced motion', async () => {
  const { context, page } = await open({ viewport:{ width:390, height:844 }, reducedMotion:'reduce' });
  const position = page.getByRole('slider', { name:'Trace a path' });
  await position.focus();
  await position.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.latent-position-value').textContent.startsWith('z = (0.43,'));
  const layout = await page.locator('.latent-controls').evaluate(element => ({
    width:innerWidth,
    bounds:[...element.querySelectorAll('label, input, output')].map(control => {
      const { left, right, height } = control.getBoundingClientRect();
      return { left, right, height };
    })
  }));
  assert.ok(layout.bounds.every(bounds => bounds.left >= 0 && bounds.right <= layout.width), 'a latent-space control overflows mobile');
  assert.ok(layout.bounds.filter((_, index) => index === 1 || index === 4).every(bounds => bounds.height >= 44), 'sliders need usable touch targets');
  assert.equal(await page.locator('.thought-stage').isVisible(), false);
  await context.close();
});

test('mind and cognition use the wordmark cipher throughout the notebook', async () => {
  const { context, page } = await open();
  const coverage = await page.evaluate(() => {
    const terms = [...document.querySelectorAll('.cipher-term')];
    const walker = document.createTreeWalker(document.getElementById('portfolio'), NodeFilter.SHOW_TEXT);
    const missed = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement.closest('script, style, .cipher-term, [aria-hidden="true"]') && /\b(mind|cognition)\b/i.test(node.textContent)) missed.push(node.textContent);
    }
    return { count:terms.length, missed, tabStops:terms.filter(term => term.hasAttribute('tabindex')).length };
  });
  assert.ok(coverage.count >= 9, 'mentions in headings, captions, and diagrams need the cipher');
  assert.deepEqual(coverage.missed, []);
  assert.equal(coverage.tabStops, 0, 'decorative words must not add keyboard stops');
  const word = page.locator('.thought-opening h2 .cipher-term');
  await page.waitForFunction(() => document.querySelector('.thought-opening h2 .cipher-term').dataset.cipherState === 'resolved');
  const bounds = await word.boundingBox();
  const accessible = await page.locator('.thought-opening h2').ariaSnapshot();
  assert.match(accessible, /How does a mind emerge\?/);
  await word.hover();
  await page.waitForFunction(() => document.querySelector('.thought-opening h2 .cipher-pending'));
  const decoding = await word.boundingBox();
  assert.ok(Math.abs(bounds.width - decoding.width) < .01, 'HTML text shifted while decoding');
  assert.equal(await page.locator('.thought-opening h2').ariaSnapshot(), accessible, 'screen readers received scrambled text');
  await page.waitForFunction(() => document.querySelector('.thought-opening h2 .cipher-term').dataset.cipherState === 'resolved');
  await context.close();
});

test('later spreads decode on arrival and SVG labels retain their text advance', async () => {
  const { context, page } = await open();
  const label = page.locator('.method-brain svg .cipher-term');
  assert.equal(await label.getAttribute('data-cipher-state'), null, 'a hidden diagram decoded before its page arrived');
  await navigate(page, 2);
  assert.equal(await label.getAttribute('data-cipher-state'), 'decoding');
  await page.waitForFunction(() => document.querySelector('.method-brain svg .cipher-term').dataset.cipherState === 'resolved');
  const width = await label.evaluate(element => element.getComputedTextLength());
  assert.equal(await label.textContent(), 'mind');
  await label.hover();
  await page.waitForFunction(() => document.querySelector('.method-brain svg .cipher-pending'));
  const decodingWidth = await label.evaluate(element => element.getComputedTextLength());
  assert.ok(Math.abs(width - decodingWidth) < .01, 'SVG labels shifted while decoding');
  await page.waitForFunction(() => document.querySelector('.method-brain svg .cipher-term').dataset.cipherState === 'resolved');
  assert.equal(await label.textContent(), 'mind');
  await navigate(page, 4);
  await page.waitForFunction(() => document.querySelector('#environment h2 .cipher-term').dataset.cipherState === 'resolved');
  await page.locator('#environment summary').focus();
  await page.waitForFunction(() => document.querySelector('#environment h2 .cipher-term').dataset.cipherState === 'decoding');
  assert.equal(await page.locator('#environment').getAttribute('open'), '', 'replaying the cipher changed the disclosure');
  await context.close();
});

test('mobile taps replay the cipher and reduced motion keeps the original words', async () => {
  const { context, page } = await open({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  const word = page.locator('.thought-opening h2 .cipher-term');
  await page.waitForFunction(() => document.querySelector('.thought-opening h2 .cipher-term').dataset.cipherState === 'resolved');
  await word.tap();
  await page.waitForFunction(() => document.querySelector('.thought-opening h2 .cipher-pending'));
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.waitForFunction(() => !document.querySelector('.cipher-pending'));
  assert.match(await page.locator('.thought-opening h2').ariaSnapshot(), /How does a mind emerge\?/);
  await context.close();
  const reduced = await open({ reducedMotion:'reduce' });
  assert.equal(await reduced.page.locator('.cipher-term, .cipher-char, .cipher-svg-char').count(), 0);
  assert.equal(await reduced.page.locator('.about-statement h2').textContent(), 'Mind, brain,and models.');
  await reduced.context.close();
});

test('emerge starts as handwriting, reveals ants, and leaves a faint word without layout changes', async () => {
  const { context, page } = await open();
  await page.waitForFunction(() => window.testScene.emergence?.ants.length);
  const word = page.locator('.emergence-word');
  const original = await word.boundingBox();
  const accessible = await page.locator('.thought-opening h2').ariaSnapshot();
  assert.match(accessible, /How does a mind emerge\?/);
  const initial = await page.evaluate(() => {
    const colony = window.testScene.emergence;
    return { count:colony.ants.length, released:colony.ants.some(ant => ant.released), opacity:Number(colony.ink.style.opacity), elapsed:colony.elapsed };
  });
  assert.ok(initial.count > 100 && initial.count <= 420);
  assert.equal(initial.released, false);
  assert.equal(initial.opacity, 1);
  assert.ok(initial.elapsed < 1.9);
  await page.waitForFunction(() => document.querySelector('.emergence-word').dataset.emergenceState === 'wandering');
  const dispersed = await page.evaluate(() => {
    const colony = window.testScene.emergence;
    return {
      released:colony.ants.every(ant => ant.released),
      traveled:colony.ants.filter(ant => Math.hypot(ant.x - ant.startX, ant.y - ant.startY) > 20).length,
      opacity:Number(colony.ink.style.opacity),
      pixels:colony.canvas.width * colony.canvas.height,
      canvases:document.querySelectorAll('.emergence-colony').length,
      children:colony.word.childElementCount
    };
  });
  assert.equal(dispersed.released, true);
  assert.ok(dispersed.traveled > initial.count / 2, 'ants did not leave their letter strokes');
  assert.equal(dispersed.opacity, .14);
  assert.ok(dispersed.pixels <= 2_000_000);
  assert.equal(dispersed.canvases, 1);
  assert.equal(dispersed.children, 4, 'ants must not be individual DOM elements');
  const after = await word.boundingBox();
  assert.ok(Math.abs(original.width - after.width) < .01 && Math.abs(original.height - after.height) < .01);
  assert.equal(await page.locator('.thought-opening h2').ariaSnapshot(), accessible);
  assert.equal(await page.locator('.emergence-colony').evaluate(canvas => getComputedStyle(canvas).pointerEvents), 'none');
  await context.close();
});

test('the ant colony stops completely off the cover, resumes, and respects reduced motion', async () => {
  const { context, page } = await open({ viewport:{ width:390, height:844 }, deviceScaleFactor:3 });
  await page.waitForFunction(() => window.testScene.emergence?.ants.length);
  await navigate(page, 1);
  const state = () => page.evaluate(() => {
    const colony = window.testScene.emergence;
    return { running:colony.running, frame:colony.frame, elapsed:colony.elapsed, hidden:colony.canvas.hidden };
  });
  const paused = await state();
  assert.equal(paused.running, false);
  assert.equal(paused.frame, 0);
  assert.equal(paused.hidden, true);
  await page.waitForTimeout(250);
  assert.deepEqual(await state(), paused, 'the colony kept updating off-screen');
  await navigate(page, 0);
  assert.equal((await state()).running, true);
  assert.ok((await state()).elapsed > paused.elapsed);
  await page.setViewportSize({ width:2560, height:1440 });
  await page.waitForTimeout(450);
  const layout = await page.evaluate(() => {
    const colony = window.testScene.emergence;
    return { pixels:colony.canvas.width * colony.canvas.height, x:colony.ants[0].startX, word:colony.word.getBoundingClientRect().toJSON(), running:colony.running };
  });
  assert.ok(layout.pixels <= 2_000_000, 'large or high-DPI screens exceeded the canvas budget');
  assert.ok(layout.x >= layout.word.left - 10 && layout.x <= layout.word.right + 10, 'resizing detached the ants from their word');
  assert.equal(layout.running, true);
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.waitForFunction(() => !window.testScene.emergence.running);
  assert.equal(await page.locator('.emergence-ink').evaluate(element => Number(getComputedStyle(element).opacity)), 1);
  assert.equal(await page.locator('.emergence-colony').isVisible(), false);
  await context.close();
  const reduced = await open({ reducedMotion:'reduce' });
  assert.equal(await reduced.page.locator('.emergence-colony').count(), 0, 'reduced motion should not allocate an ant canvas');
  assert.equal(await reduced.page.locator('.emergence-ink').evaluate(element => Number(getComputedStyle(element).opacity)), 1);
  await reduced.context.close();
});

test('native mobile swipes and reduced-motion scrolling keep working', async () => {
  const { context, page } = await open({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  const { stops } = await snapshot(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:200, y:730 }] });
  for (let y = 650; y >= 130; y -= 80) {
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:200, y }] });
    await page.waitForTimeout(25);
  }
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await page.waitForTimeout(1300);
  close((await snapshot(page)).offset, stops[1].start);
  await context.close();
  const reduced = await open({ reducedMotion:'reduce' });
  assert.equal(await reduced.page.evaluate(() => window.testScene.enabled), false);
  await reduced.page.mouse.wheel(0, 5000);
  await reduced.page.waitForTimeout(300);
  assert.ok(await reduced.page.evaluate(() => scrollY > 1500));
  assert.equal(await reduced.page.locator('.thought-stage').isVisible(), false);
  await reduced.context.close();
  assert.deepEqual(errors, []);
});
