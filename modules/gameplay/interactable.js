// modules/gameplay/interactable.js — bloquea sprites con script (que no sean items).
// Sin esto, los NPC/objetos con diálogo serían atravesables y nunca dispararían su script.
// Los items (isItem=true) se siguen pisando para que pickup funcione.

let core = null;

export default {
  name: 'interactable',
  version: '1.0.0',
  deps: ['sprites'],
  setup(c) { core = c; },
  hooks: {
    'beforeMove': (ev) => {
      const target = core.api.sprites?.spriteAt(ev.x, ev.y);
      // Bloquea si tiene script y no es item, pero respeta isWall=false explícito
      // (permite "abrir" puertas con set-sprite-wall false sin tener que quitar el script).
      if (target?.script && !target?.isItem && target?.isWall !== false) ev.cancel = true;
    },
  },
};
