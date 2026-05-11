// modules/gameplay/walls.js — sprites con isWall=true bloquean el paso.

export default {
  name: 'walls',
  version: '1.0.0',
  deps: ['sprites'],
  hooks: {
    'beforeMove': (ev) => {
      const target = window.MOSI?.api?.sprites?.spriteAt(ev.x, ev.y);
      if (target?.isWall) ev.cancel = true;
    },
  },
};
