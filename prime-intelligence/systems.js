export function seededRandom(seed = 7) {
  return () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
}

export function makeFlock(count, width, height, random = Math.random) {
  const flock = new Float64Array(count * 4);
  for (let i = 0; i < flock.length; i += 4) {
    const angle = random() * Math.PI * 2;
    flock.set([random() * width, random() * height, Math.cos(angle) * 1.5, Math.sin(angle) * 1.5], i);
  }
  return flock;
}

export function stepFlock(flock, width, height, influence = .75, pointer = null, dt = 1) {
  const result = new Float64Array(flock.length);
  for (let i = 0; i < flock.length; i += 4) {
    const x = flock[i], y = flock[i + 1];
    let vx = flock[i + 2], vy = flock[i + 3], neighbors = 0;
    let alignX = 0, alignY = 0, centerX = 0, centerY = 0, separateX = 0, separateY = 0;
    for (let j = 0; j < flock.length; j += 4) {
      if (i === j) continue;
      let dx = flock[j] - x, dy = flock[j + 1] - y;
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
      const distance = dx * dx + dy * dy;
      if (distance < 65 ** 2) {
        neighbors++;
        alignX += flock[j + 2]; alignY += flock[j + 3];
        centerX += dx; centerY += dy;
        if (distance < 19 ** 2 && distance > .01) {
          separateX -= dx / distance;
          separateY -= dy / distance;
        }
      }
    }
    if (neighbors) {
      vx += ((alignX / neighbors - vx) * .035 + centerX / neighbors * .0018) * influence * dt;
      vy += ((alignY / neighbors - vy) * .035 + centerY / neighbors * .0018) * influence * dt;
    }
    vx += separateX * .85 * dt; vy += separateY * .85 * dt;
    if (pointer) {
      const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx, dy);
      if (distance < 85 && distance > 1) {
        vx += dx / distance * (1 - distance / 85) * .28 * dt;
        vy += dy / distance * (1 - distance / 85) * .28 * dt;
      }
    }
    const speed = Math.hypot(vx, vy) || 1;
    const limit = Math.max(1.05, Math.min(2.4, speed));
    vx *= limit / speed; vy *= limit / speed;
    result.set([((x + vx * dt) % width + width) % width, ((y + vy * dt) % height + height) % height, vx, vy], i);
  }
  return result;
}

export function scatterFlock(flock, random = Math.random) {
  const next = new Float64Array(flock);
  for (let i = 0; i < next.length; i += 4) {
    const angle = random() * Math.PI * 2;
    next[i + 2] = Math.cos(angle) * 2.4;
    next[i + 3] = Math.sin(angle) * 2.4;
  }
  return next;
}
