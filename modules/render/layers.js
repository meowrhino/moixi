// modules/render/layers.js — z-ordering por sprite.layer (0..3).
//
// 0 = background  (pintado en render:bg, encima del fill de paleta)
// 1 = default     (pintado en render:sprites por el módulo sprites)
// 2 = foreground  (pintado en render:fg)
// 3 = top         (pintado en render:final, encima de UI y lighting)
//
// Cargar este módulo activa el filtrado por capa en sprites.js. Sin él,
// sprites pinta todo en layer 1 ignorando el campo.

let core = null;

export default {
  name: 'layers',
  version: '1.0.0',
  deps: ['canvas', 'sprites'],
  schema: {
    'sprite.layer': '0|1|2|3 — 0=bg, 1=default, 2=fg, 3=top',
  },

  setup(c) {
    core = c;
    core.state.runtime.layersEnabled = true;
  },

  teardown() {
    if (core?.state?.runtime) core.state.runtime.layersEnabled = false;
  },

  hooks: {
    'render:bg':    ({ t }) => core.api.sprites?.paintLayer?.(0, t),
    'render:fg':    ({ t }) => core.api.sprites?.paintLayer?.(2, t),
    'render:final': ({ t }) => core.api.sprites?.paintLayer?.(3, t),
  },
};
