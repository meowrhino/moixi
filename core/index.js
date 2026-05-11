// core/index.js — fachada del engine.
// Esto es lo que importan los módulos (vía core.bus, core.state, core.api, etc.).

import * as bus from './bus.js';
import * as loader from './loader.js';
import * as loop from './loop.js';
import state, { load as loadState, reset as resetState } from './state.js';

const core = {
  bus,
  state,
  loop,
  // proxies para que los módulos puedan hacer core.api.X cómodamente
  get api() { return loader.getAPI(); },
  get scriptFns() { return loader.getScriptFns(); },
  // chainable
  use(mod) { loader.use(core, mod); return core; },
  unuse(name) { loader.unuse(core, name); return core; },
  list: loader.list,
  // ciclo de vida del juego
  load(gameData) { loadState(gameData); bus.emit('gameLoad', { game: gameData }); return core; },
  reset() { resetState(); bus.emit('gameReset'); return core; },
  start() { loop.start(); return core; },
  stop() { loop.stop(); return core; },
};

// Por conveniencia, exposición global en window para depurar desde la consola.
if (typeof window !== 'undefined') window.MOSI = core;

export default core;
