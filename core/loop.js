// core/loop.js — game loop con requestAnimationFrame.
// Dispara hooks separados por fase para que los módulos se enchufen donde toca.
// Orden de fases por frame:
//   tick → render:bg → render:tiles → render:sprites → render:fg → render:ui → render:final

import { emit } from './bus.js';
import state from './state.js';

let running = false;
let last = 0;
let rafId = null;

function frame(t) {
  if (!running) return;
  const dt = Math.min(t - last, 100); // clamp para evitar saltos enormes al volver de tab
  last = t;

  if (!state.runtime.paused) {
    emit('tick', { dt, t });
  }

  emit('render:bg',     { dt, t });
  emit('render:tiles',  { dt, t });
  emit('render:sprites',{ dt, t });
  emit('render:fg',     { dt, t });
  emit('render:ui',     { dt, t });
  emit('render:final',  { dt, t });

  rafId = requestAnimationFrame(frame);
}

export function start() {
  if (running) return;
  running = true;
  last = performance.now();
  emit('gameStart');
  rafId = requestAnimationFrame(frame);
}

export function stop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  emit('gameStop');
}

export function isRunning() { return running; }
