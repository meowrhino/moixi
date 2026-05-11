// modules/gameplay/walls.js — sprites con isWall=true bloquean el paso.

let core = null;

export default {
  name: 'walls',
  version: '1.0.0',
  deps: ['sprites'],
  setup(c) { core = c; },
  hooks: {
    'beforeMove': (ev) => {
      const target = core.api.sprites?.spriteAt(ev.x, ev.y);
      if (target?.isWall) ev.cancel = true;
    },
  },
};
