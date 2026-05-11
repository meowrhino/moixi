// core/bus.js — pub/sub event bus, el sistema nervioso del engine
// Soporta prioridades (mayor = corre antes) y cancelación de eventos.

const listeners = new Map();

export function on(event, fn, { priority = 0 } = {}) {
  if (!listeners.has(event)) listeners.set(event, []);
  const list = listeners.get(event);
  list.push({ fn, priority });
  list.sort((a, b) => b.priority - a.priority);
  return () => off(event, fn);
}

export function off(event, fn) {
  const list = listeners.get(event);
  if (!list) return;
  const i = list.findIndex(l => l.fn === fn);
  if (i >= 0) list.splice(i, 1);
}

export function emit(event, payload = {}) {
  const ctx = { ...payload, cancel: false };
  const list = listeners.get(event);
  if (!list) return ctx;
  for (const { fn } of list) {
    try { fn(ctx); } catch (err) { console.error(`[bus:${event}]`, err); }
    if (ctx.cancel) break;
  }
  return ctx;
}

export function clear() { listeners.clear(); }
