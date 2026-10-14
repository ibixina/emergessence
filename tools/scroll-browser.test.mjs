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
    const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.ttf':'font/ttf' };
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
