const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function settledScrollPosition(stops, offset, direction = 0) {
  let previousEnd = 0;
  for (const stop of stops) {
    const start = stop.start + stop.entrance;
    const end = start + stop.overflow;
    if (offset < start) {
      const previousDistance = offset - previousEnd;
      const nextDistance = start - offset;
      if (previousDistance === nextDistance) return direction < 0 ? previousEnd : start;
      return previousDistance < nextDistance ? previousEnd : start;
    }
    if (offset <= end) return offset;
    previousEnd = end;
  }
  return previousEnd;
}

export function scrollGestureBounds(stops, offset) {
  const position = settledScrollPosition(stops, offset);
  const index = stops.findIndex(stop => position >= stop.start + stop.entrance && position <= stop.start + stop.entrance + stop.overflow);
  const stop = stops[index];
  const start = stop.start + stop.entrance;
  const end = start + stop.overflow;
  const previous = stops[index - 1];
  const next = stops[index + 1];
  return {
    start, end,
    min:position <= start + 1 && previous ? previous.start + previous.entrance + previous.overflow : start,
    max:position >= end - 1 && next ? next.start + next.entrance : end
  };
}

export class ScrollGesture {
  constructor(stops, offset) {
    Object.assign(this, scrollGestureBounds(stops, offset));
    this.offset = clamp(offset, this.min, this.max);
    this.direction = 0;
  }

  move(delta, position) {
    const direction = Math.sign(delta);
    if (!direction) return this.offset;
    if (this.direction && this.direction !== direction) this.offset = position;
    this.direction = direction;
    this.offset = clamp(this.offset + delta, this.min, this.max);
    return this.offset;
  }
}

export class ScrollMotion {
  constructor(position = 0) { this.reset(position); }

  reset(position) {
    this.position = position;
    this.target = position;
    this.velocity = 0;
  }

  get moving() {
    return Math.abs(this.target - this.position) > .01 || Math.abs(this.velocity) > .1;
  }

  step(seconds) {
    const rate = 20;
    const distance = this.position - this.target;
    const impulse = this.velocity + rate * distance;
    const decay = Math.exp(-rate * seconds);
    // Exact critically damped spring integration preserves velocity on retargeting.
    this.position = this.target + (distance + impulse * seconds) * decay;
    this.velocity = (this.velocity - rate * impulse * seconds) * decay;
    if (!this.moving) this.reset(this.target);
    return this.position;
  }
}
