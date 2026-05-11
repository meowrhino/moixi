// core/loader.js — registra módulos, resuelve dependencias, agrupa APIs públicas.
// Cada módulo es un objeto con la siguiente forma (todos los campos opcionales salvo `name`):
//
//   {
//     name: 'collision',
//     version: '1.0.0',
//     deps: ['rooms', 'sprites'],
//     schema: { /* campos que añade al JSON, solo informativo */ },
//     hooks: { 'beforeMove': fn, 'render:fg': fn, ... },
//     scriptFns: { 'is-empty': (core, x, y) => bool, ... },
//     api: { canMove(...) { ... }, ... },
//     setup(core) { ... },
//     teardown(core) { ... }
//   }

import { on, off } from './bus.js';

const loaded = new Map();         // name -> module
const api = {};                   // namespace por módulo: api.collision.canMove(...)
const scriptFns = {};             // dispatch table del lenguaje de scripting
const unbinders = new Map();      // name -> [fn, fn, ...] para teardown

export function use(core, mod) {
  if (!mod || !mod.name) throw new Error('module needs a name');
  if (loaded.has(mod.name)) {
    console.warn(`[loader] ${mod.name} already loaded`);
    return core;
  }
  for (const dep of mod.deps || []) {
    if (!loaded.has(dep)) throw new Error(`[loader] ${mod.name} needs ${dep} (load it first)`);
  }

  // 1. exponer API del módulo
  if (mod.api) api[mod.name] = mod.api;

  // 2. registrar script fns
  if (mod.scriptFns) {
    for (const [k, fn] of Object.entries(mod.scriptFns)) {
      if (scriptFns[k]) console.warn(`[loader] script fn ${k} overwritten by ${mod.name}`);
      scriptFns[k] = fn;
    }
  }

  // 3. enganchar hooks
  const offs = [];
  if (mod.hooks) {
    for (const [event, fn] of Object.entries(mod.hooks)) {
      offs.push(on(event, fn));
    }
  }
  unbinders.set(mod.name, offs);

  // 4. setup
  loaded.set(mod.name, mod);
  if (mod.setup) mod.setup(core);

  return core;
}

export function unuse(core, name) {
  const mod = loaded.get(name);
  if (!mod) return;
  if (mod.teardown) mod.teardown(core);
  (unbinders.get(name) || []).forEach(off => off());
  delete api[name];
  if (mod.scriptFns) for (const k of Object.keys(mod.scriptFns)) delete scriptFns[k];
  loaded.delete(name);
}

export function get(name) { return loaded.get(name); }
export function list() { return [...loaded.keys()]; }
export function getAPI() { return api; }
export function getScriptFns() { return scriptFns; }
