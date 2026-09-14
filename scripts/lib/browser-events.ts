type Handler = (...args: unknown[]) => void;

export class EventEmitter {
  private readonly handlers = new Map<string, Set<Handler>>();
  on(event: string, fn: Handler) {
    const set = this.handlers.get(event) ?? new Set();
    set.add(fn);
    this.handlers.set(event, set);
    return this;
  }
  off(event: string, fn: Handler) {
    this.handlers.get(event)?.delete(fn);
    return this;
  }
  emit(event: string, ...args: unknown[]) {
    for (const fn of this.handlers.get(event) ?? []) fn(...args);
    return true;
  }
  removeListener(event: string, fn: Handler) {
    return this.off(event, fn);
  }
  addListener(event: string, fn: Handler) {
    return this.on(event, fn);
  }
}

export default { EventEmitter };
