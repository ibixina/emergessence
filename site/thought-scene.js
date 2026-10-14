const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
function smooth(low, high, value) {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}

export function settledScrollPosition(stops, offset, direction, threshold) {
  let previousEnd = 0;
  for (const stop of stops) {
    const start = stop.start + stop.entrance;
    const end = start + stop.overflow;
    if (offset < start) {
      if (direction > 0) return offset - previousEnd >= threshold ? start : previousEnd;
      if (direction < 0) return start - offset >= threshold ? previousEnd : start;
      return offset - previousEnd < start - offset ? previousEnd : start;
    }
    if (offset <= end) return offset;
    previousEnd = end;
  }
  return previousEnd;
}

export function scrollGestureBounds(stops, offset) {
  const position = settledScrollPosition(stops, offset, 0, 0);
  const index = stops.findIndex(stop => position >= stop.start + stop.entrance && position <= stop.start + stop.entrance + stop.overflow);
  const stop = stops[index];
  const start = stop.start + stop.entrance;
  const end = start + stop.overflow;
  const previous = stops[index - 1];
  const next = stops[index + 1];
  return {
    min:offset <= start + 1 && previous ? previous.start + previous.entrance + previous.overflow : start,
    max:offset >= end - 1 && next ? next.start + next.entrance : end
  };
}

export class ThoughtScene {
  constructor(hero) {
    this.hero = hero;
    this.cover = hero.querySelector('.thought-cover-page');
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.frame = 0;
    this.resizeFrame = 0;
    this.camera = null;
    this.keyboardFocus = false;
    this.navigationTarget = null;
    this.snapTimer = 0;
    this.snapTarget = null;
    this.scrollBounds = null;
    this.wheelTimer = 0;
    this.wheelDirection = 0;
    this.pointerDown = false;
    this.touching = false;
    this.lastScroll = scrollY;
    this.scrollDirection = 0;
    this.onScroll = this.onScroll.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.refresh = this.refresh.bind(this);
    this.resize = this.resize.bind(this);
    this.scheduleResize = this.scheduleResize.bind(this);
    this.animate = this.animate.bind(this);
    this.stops = [{ source:hero, page:this.cover, anchor:'top', cover:true }, ...[...document.querySelectorAll('.thought-stop')].map((source, index) => {
      const page = source.querySelector('.thought-cluster');
      const anchor = page.querySelector('[id]')?.id || `thought-${index + 1}`;
      if (!page.querySelector('[id]')) page.id = anchor;
      return { source, page, anchor };
    })];
    this.fragments = new Map();
    this.stops.forEach(stop => {
      this.fragments.set(stop.anchor, stop);
      stop.page.querySelectorAll('[id]').forEach(element => this.fragments.set(element.id, stop));
    });
    this.fragments.set('first-connection', this.stops[1]);
    this.sections = [...document.querySelectorAll('.portfolio-section')];
    this.sections.forEach(section => {
      const stop = this.stops.find(entry => section.contains(entry.source));
      this.fragments.set(section.id, stop);
      stop.heading = section.querySelector('.section-heading');
      stop.section = section;
      stop.bridge = section.previousElementSibling?.classList.contains('thought-bridge') ? section.previousElementSibling : null;
    });
    this.navigation = document.querySelector('.primary-navigation');
    this.footer = document.querySelector('.site-footer');
    this.footerMarker = document.createComment('notebook footer');
    this.footer.before(this.footerMarker);
    this.thread = document.querySelector('.experiment-thread');
    this.threadMarker = document.createComment('experiment connections');
    this.thread.before(this.threadMarker);
    this.lastExperiment = this.stops.filter(stop => document.getElementById('projects').contains(stop.source)).at(-1);
    this.stops.filter(stop => !stop.cover).forEach(stop => {
      const links = document.createElement('nav');
      links.className = 'journey-chapters';
      links.setAttribute('aria-label', 'Notebook chapters');
      links.innerHTML = '<a href="#about">about</a><a href="#research">questions</a><a href="#projects">experiments</a><a href="#contact">say hello ↗</a>';
      stop.page.append(links);
    });
    this.stops.forEach(stop => {
      stop.drawing = stop.page.querySelector(stop.cover ? '.thought-cover-neurons .study-sketch' : '.working-study .study-sketch, .method-brain .study-sketch');
      stop.connections = [...stop.page.querySelectorAll('.notebook-connections')].map(svg => svg.parentElement);
    });
    this.stage = document.createElement('div');
    this.stage.className = 'thought-stage';
    this.stage.innerHTML = '<canvas class="thought-route" aria-hidden="true"></canvas><div class="thought-perspective"><div class="thought-world"></div></div><nav class="journey-pager" aria-label="Notebook pages" hidden><button type="button" class="journey-previous" aria-label="Previous page">←</button><span class="journey-page" role="status" aria-atomic="true"></span><button type="button" class="journey-next" aria-label="Next page">→</button></nav>';
    document.getElementById('portfolio').append(this.stage);
    this.world = this.stage.querySelector('.thought-world');
    this.perspective = this.stage.querySelector('.thought-perspective');
    this.canvas = this.stage.querySelector('canvas');
    this.context = this.canvas.getContext('2d');
    this.pager = this.stage.querySelector('.journey-pager');
    this.pageNumber = this.pager.querySelector('.journey-page');
    this.previousPage = this.pager.querySelector('.journey-previous');
    this.nextPage = this.pager.querySelector('.journey-next');
    this.previousPage.addEventListener('click', () => this.turnPage(-1));
    this.nextPage.addEventListener('click', () => this.turnPage(1));
    Object.assign(this.stage.dataset, { cameraX:'0', cameraY:'0', cameraYaw:'0', renderer:'perspective-notebook' });
    window.addEventListener('scroll', this.onScroll, { passive:true });
    window.addEventListener('wheel', this.onWheel, { passive:false });
    window.addEventListener('resize', this.scheduleResize, { passive:true });
    window.addEventListener('hashchange', () => this.navigate(location.hash));
    document.addEventListener('keydown', event => {
      if (event.key === 'Tab') this.keyboardFocus = true;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) this.cancelSnap();
    });
    document.addEventListener('pointerdown', () => {
      this.keyboardFocus = false;
      this.pointerDown = true;
      this.cancelSnap();
    }, { passive:true });
    const releasePointer = () => { this.pointerDown = false; this.scheduleSnap(); };
    document.addEventListener('pointerup', releasePointer, { passive:true });
    document.addEventListener('pointercancel', releasePointer, { passive:true });
    document.addEventListener('touchstart', event => {
      this.touching = true;
      this.cancelSnap();
      if (this.enabled && event.touches.length === 1) this.scrollBounds = scrollGestureBounds(this.stops, scrollY);
    }, { passive:true });
    const releaseTouch = event => { this.touching = event.touches.length > 0; this.scheduleSnap(); };
    document.addEventListener('touchend', releaseTouch, { passive:true });
    document.addEventListener('touchcancel', releaseTouch, { passive:true });
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!this.fragments.has(link.hash.slice(1))) return;
      event.preventDefault();
      history.pushState(null, '', link.hash);
      this.navigate(link.hash, 'smooth');
    });
    document.addEventListener('focusin', event => {
      if (!this.enabled || !this.keyboardFocus) return;
      const stop = this.stops.find(entry => entry.page.contains(event.target));
      if (!stop) return;
      if (Math.abs(stop.z - this.camera - this.focal) > this.focal * .25) this.navigate(`#${stop.anchor}`);
      requestAnimationFrame(() => {
        if (!this.enabled || document.activeElement !== event.target || this.active !== stop || (this.navigationTarget && this.navigationTarget !== stop)) return;
        const bounds = event.target.getBoundingClientRect();
        const padding = this.stage.getBoundingClientRect().top + 25;
        const shift = bounds.bottom > innerHeight - 25 ? bounds.bottom - innerHeight + 25 : bounds.top < padding ? bounds.top - padding : 0;
        if (!shift || !stop.overflow) return;
        const pan = clamp(scrollY - stop.start - stop.entrance + shift, 0, stop.overflow);
        window.scrollTo({ top:stop.start + stop.entrance + pan, behavior:'instant' });
      });
    });
    document.querySelectorAll('details').forEach(entry => entry.addEventListener('toggle', this.scheduleResize));
    this.reducedMotion.addEventListener('change', () => { this.mount(); this.resize(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pointerDown = false;
        this.touching = false;
        this.cancelSnap();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.lastTime = 0;
      } else this.refresh();
    });
    this.observer = new ResizeObserver(entries => {
      if (entries.some(entry => {
        const stop = this.stops.find(stop => stop.page === entry.target);
        const size = entry.borderBoxSize?.[0];
        return size && (Math.abs(size.inlineSize - stop.width) >= 1 || Math.abs(size.blockSize - stop.height) >= 1);
      })) this.scheduleResize();
    });
    this.stops.forEach(stop => this.observer.observe(stop.page, { box:'border-box' }));
    this.mount();
    this.resize();
  }

  mount() {
    this.cancelSnap();
    this.enabled = !this.reducedMotion.matches;
    document.documentElement.classList.toggle('thought-journey', this.enabled);
    this.stage.hidden = !this.enabled;
    this.navigation.hidden = this.enabled;
    for (const stop of this.stops) {
      if (this.enabled) {
        this.world.append(stop.page);
        stop.page.classList.add('thought-plane');
        if (stop.cover) stop.page.classList.add('thought-plane-cover');
        if (stop.heading) stop.page.prepend(stop.heading);
        if (stop.bridge) { stop.bridge.hidden = true; }
      } else {
        if (stop.cover) this.hero.querySelector('.thought-cover').append(stop.page);
        else stop.source.append(stop.page);
        stop.page.classList.remove('thought-plane');
        stop.page.removeAttribute('style');
        stop.page.inert = false;
        stop.visible = undefined;
        stop.transform = null;
        stop.opacity = null;
        stop.source.style.height = '';
        if (stop.heading) stop.section.prepend(stop.heading);
        if (stop.bridge) stop.bridge.hidden = false;
      }
    }
    if (this.enabled) {
      this.stops.at(-1).page.append(this.footer);
      this.lastExperiment.page.append(this.thread);
    } else {
      this.footerMarker.after(this.footer);
      this.threadMarker.after(this.thread);
    }
  }

  scheduleResize() {
    if (!this.enabled || this.resizeFrame) return;
    this.resizeFrame = requestAnimationFrame(this.resize);
  }

  resize() {
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
    if (!this.enabled) return;
    this.cancelSnap();
    const old = this.active;
    const previousWidth = this.width;
    const progress = old ? clamp((scrollY - old.start) / old.duration) : 0;
    const reading = old && scrollY >= old.start + old.entrance && scrollY <= old.start + old.entrance + old.reading;
    const pan = old ? clamp(scrollY - old.start - old.entrance, 0, old.overflow) : 0;
    const bounds = this.stage.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    this.focal = Math.max(460, Math.min(this.width * 1.1, this.height * 1.3));
    this.perspective.style.perspective = `${this.focal}px`;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const width = Math.round(this.width * dpr), height = Math.round(this.height * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Apply widths together so the subsequent measurements share one layout.
    this.stops.forEach(stop => {
      stop.page.style.width = `${stop.cover ? this.width : Math.min(1120, this.width - Math.min(100, this.width * .12))}px`;
      if (stop.cover) stop.page.style.height = `${this.height}px`;
    });
    this.stops.forEach((stop, index) => {
      stop.width = stop.page.offsetWidth;
      stop.height = stop.page.offsetHeight;
      stop.z = index * this.focal * 2.8;
      stop.top = stop.cover ? 0 : Math.max(45, (this.height - stop.height) / 2);
      stop.overflow = stop.cover ? 0 : Math.max(0, stop.top + stop.height - this.height + 90);
      stop.entrance = stop.cover ? 0 : this.height * .68;
      stop.reading = stop.overflow;
      stop.departure = index === this.stops.length - 1 ? 0 : this.height * .72;
      stop.duration = stop.entrance + stop.reading + stop.departure;
      stop.transform = null;
    });
    this.stops.forEach(stop => {
      stop.source.style.height = `${stop.duration}px`;
    });
    const last = this.stops.at(-1);
    last.source.style.height = `${last.entrance + last.reading + innerHeight}px`;
    this.stops.forEach(stop => { stop.start = stop.cover ? 0 : stop.source.getBoundingClientRect().top + scrollY; });
    const transform = this.world.style.transform;
    this.world.style.transform = 'translateZ(0px)';
    this.stops.forEach(stop => {
      const page = stop.page.getBoundingClientRect();
      const figure = stop.drawing?.getBoundingClientRect();
      const scale = page.width / stop.width;
      stop.node = figure && scale > 0 ? [
        (figure.left + figure.width / 2 - page.left) / scale - stop.width / 2,
        (figure.top + figure.height / 2 - page.top) / scale + stop.top - this.height * .44,
        stop.z
      ] : [0, 0, stop.z];
    });
    // Connections use native page coordinates; camera movement never changes them.
    this.stops.forEach(stop => stop.connections.forEach(container => container.dispatchEvent(new Event('notebook-layout'))));
    this.world.style.transform = transform;
    this.routes = this.stops.slice(0, -1).map((stop, index) => {
      const next = this.stops[index + 1];
      const points = [];
      for (let step = 0; step <= 70; step++) {
        const t = step / 70;
        const eased = t * t * (3 - 2 * t);
        points.push([
          stop.node[0] + (next.node[0] - stop.node[0]) * eased + Math.sin(t * Math.PI) * this.width * .25 * (index % 2 ? -1 : 1),
          stop.node[1] + (next.node[1] - stop.node[1]) * eased + Math.sin(t * Math.PI * 2) * this.height * .18,
          stop.z + (next.z - stop.z) * t
        ]);
      }
      return points;
    });
    if (old && (reading || previousWidth !== this.width)) {
      const top = reading ? old.start + old.entrance + Math.min(pan, old.overflow) : old.start + old.duration * progress;
      window.scrollTo({ top, behavior:'instant' });
    }
    this.camera = null;
    this.refresh();
  }

  navigate(hash, behavior = 'instant') {
    const stop = this.fragments.get(hash.replace(/^#/, ''));
    if (!stop) return;
    this.cancelSnap();
    if (!this.enabled) {
      document.getElementById(hash.replace(/^#/, ''))?.scrollIntoView({ behavior });
      return;
    }
    if (this.resizeFrame) this.resize();
    this.navigationTarget = stop;
    const offset = stop.start + stop.entrance - (stop.cover ? stop.start : 0);
    window.scrollTo({ top:Math.max(0, offset), behavior });
    if (behavior === 'instant') this.camera = null;
    this.refresh();
  }

  turnPage(direction) {
    const index = clamp((this.currentIndex ?? 0) + direction, 0, this.stops.length - 1);
    this.navigate(`#${this.stops[index].anchor}`, 'smooth');
  }

  cancelSnap(resetGesture = true) {
    clearTimeout(this.snapTimer);
    this.snapTimer = 0;
    if (resetGesture) {
      clearTimeout(this.wheelTimer);
      this.wheelTimer = 0;
      this.wheelDirection = 0;
      this.scrollBounds = null;
    }
    if (this.snapTarget !== null || this.navigationTarget) {
      this.snapTarget = null;
      this.navigationTarget = null;
      window.scrollTo({ top:scrollY, behavior:'instant' });
    }
  }

  onWheel(event) {
    if (!this.enabled || event.defaultPrevented || event.ctrlKey || !event.deltaY) return;
    event.preventDefault();
    const direction = Math.sign(event.deltaY);
    if (!this.wheelDirection) {
      this.cancelSnap();
      this.scrollBounds = scrollGestureBounds(this.stops, scrollY);
    } else if (direction !== this.wheelDirection) this.cancelSnap(false);
    this.wheelDirection = direction;
    clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      this.wheelTimer = 0;
      this.wheelDirection = 0;
      this.scrollBounds = null;
      if (this.snapTarget !== null) this.scheduleSnap();
      else this.settle();
    }, 240);
    // Momentum continues the existing turn instead of stopping its animation.
    if (this.snapTarget !== null) return;
    this.scrollDirection = direction;
    const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? this.height : 1;
    const offset = clamp(scrollY + event.deltaY * unit, this.scrollBounds.min, this.scrollBounds.max);
    const top = settledScrollPosition(this.stops, offset, direction, clamp(this.height * .08, 40, 80));
    const atEdge = offset === this.scrollBounds.min || offset === this.scrollBounds.max;
    if (direction * (top - scrollY) > 0 && (Math.abs(top - offset) >= 1 || atEdge)) {
      this.snapTarget = top;
      window.scrollTo({ top, behavior:'smooth' });
    } else window.scrollTo({ top:offset, behavior:'instant' });
  }

  onScroll() {
    if (this.scrollBounds) {
      const top = clamp(scrollY, this.scrollBounds.min, this.scrollBounds.max);
      if (Math.abs(top - scrollY) >= 1) window.scrollTo({ top, behavior:'instant' });
    }
    const movement = scrollY - this.lastScroll;
    if (movement && this.snapTarget === null) this.scrollDirection = Math.sign(movement);
    this.lastScroll = scrollY;
    this.refresh();
    this.scheduleSnap();
  }

  scheduleSnap() {
    clearTimeout(this.snapTimer);
    if (!this.enabled || this.pointerDown || this.touching || this.wheelDirection || document.hidden) return;
    this.snapTimer = setTimeout(() => this.settle(), this.scrollBounds ? 240 : 160);
  }

  settle() {
    this.snapTimer = 0;
    this.snapTarget = null;
    this.scrollBounds = null;
    if (!this.enabled || this.pointerDown || this.touching || document.hidden || this.navigationTarget) return;
    if (this.resizeFrame) this.resize();
    const top = settledScrollPosition(this.stops, scrollY, this.scrollDirection, clamp(this.height * .08, 40, 80));
    if (Math.abs(top - scrollY) < 1) return;
    this.snapTarget = top;
    window.scrollTo({ top, behavior:'smooth' });
  }

  refresh() {
    if (!this.enabled || document.hidden) return;
    const offset = scrollY;
    let index = 0;
    while (index < this.stops.length - 1 && offset >= this.stops[index + 1].start) index++;
    const stop = this.stops[index];
    this.active = stop;
    const local = Math.max(0, offset - stop.start);
    if (this.navigationTarget === stop && local >= stop.entrance - 1) this.navigationTarget = null;
    const read = stop.z - this.focal;
    if (local < stop.entrance) this.target = stop.z - this.focal * 2.4 + this.focal * 1.4 * clamp(local / stop.entrance);
    else if (local < stop.entrance + stop.reading || !stop.departure) this.target = read;
    else this.target = read + this.focal * 1.4 * clamp((local - stop.entrance - stop.reading) / stop.departure);
    this.camera ??= this.target;
    if (!this.frame) this.frame = requestAnimationFrame(this.animate);
  }

  animate(time) {
    this.frame = 0;
    if (!this.enabled || document.hidden) return;
    const elapsed = this.lastTime ? Math.min(50, time - this.lastTime) : 16;
    this.lastTime = time;
    this.camera += (this.target - this.camera) * (1 - Math.exp(-elapsed / 90));
    this.world.style.transform = `translateZ(${this.focal + this.camera}px)`;
    this.stage.dataset.cameraDepth = Math.round(this.camera);
    const index = clamp(Math.round((this.camera + this.focal) / (this.focal * 2.8)), 0, this.stops.length - 1);
    if (index !== this.currentIndex) {
      this.currentIndex = index;
      this.pager.hidden = index === 0;
      this.pageNumber.textContent = `${String(index + 1).padStart(2, '0')} / ${String(this.stops.length).padStart(2, '0')}`;
      this.pageNumber.setAttribute('aria-label', `Page ${index + 1} of ${this.stops.length}`);
      this.previousPage.disabled = index === 0;
      this.nextPage.disabled = index === this.stops.length - 1;
    }
    for (const stop of this.stops) {
      const depth = stop.z - this.camera;
      const opacity = smooth(this.focal * .3, this.focal * .72, depth) * (1 - smooth(this.focal * 1.7, this.focal * 3.6, depth));
      const visible = opacity >= .015;
      if (visible !== stop.visible) stop.page.style.visibility = visible ? 'visible' : 'hidden';
      stop.visible = visible;
      const inert = opacity < .25;
      if (inert !== stop.page.inert) stop.page.inert = inert;
      if (!visible) continue;
      const pan = clamp(scrollY - stop.start - stop.entrance, 0, stop.overflow);
      const y = stop.cover ? -this.height * .44 : stop.top - this.height * .44 - pan;
      const transform = `translate3d(${-stop.width / 2}px,${y}px,${-stop.z}px)`;
      if (transform !== stop.transform) stop.page.style.transform = stop.transform = transform;
      const alpha = opacity.toFixed(3);
      if (alpha !== stop.opacity) stop.page.style.opacity = stop.opacity = alpha;
      stop.page.dataset.depth = Math.round(depth);
    }
    this.drawRoutes();
    if (Math.abs(this.target - this.camera) > .1) this.frame = requestAnimationFrame(this.animate);
    else this.lastTime = 0;
  }

  drawRoutes() {
    if (!this.context) return;
    const ctx = this.context;
    if (this.routeVisible) ctx.clearRect(0, 0, this.width, this.height);
    const readDistance = Math.abs(this.active.z - this.focal - this.camera) / this.focal;
    const traveling = smooth(.05, .5, readDistance);
    this.routeVisible = traveling >= .01;
    if (!this.routeVisible) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#735986';
    for (const route of this.routes) {
      if (route.at(-1)[2] - this.camera < 100 || route[0][2] - this.camera > this.focal * 5) continue;
      let previousX, previousY;
      for (const [x,y,z] of route) {
        const depth = z - this.camera;
        if (depth < 100 || depth > this.focal * 5) { previousX = undefined; continue; }
        const pointX = this.width / 2 + x * this.focal / depth;
        const pointY = this.height * .44 + y * this.focal / depth;
        if (previousX !== undefined) {
          ctx.globalAlpha = traveling * .42 * smooth(100, 400, depth) * (1 - smooth(this.focal * 2, this.focal * 5, depth));
          ctx.lineWidth = clamp(this.focal / depth, .45, 1.1);
          ctx.beginPath();
          ctx.moveTo(previousX, previousY);
          ctx.lineTo(pointX, pointY);
          ctx.stroke();
        }
        previousX = pointX;
        previousY = pointY;
      }
    }
    ctx.globalAlpha = 1;
  }
}
