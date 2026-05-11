// modules/gameplay/transitions.js — fade negro al cambiar de room.
// Tipos: 'fade' (default), 'instant' (sin transición), 'wipe' (cortina horizontal).
// Se configura en `game.transition` global o `room.transition` por room.

let core = null;
let transitionEndsAt = 0;
let transitionType = 'fade';
const DURATION = 420;

export default {
  name: 'transitions',
  version: '1.0.0',
  deps: ['canvas'],

  schema: {
    'game.transition': "'fade' | 'instant' | 'wipe' — default 'fade'",
    'room.transition': "override por room",
  },

  setup(c) {
    core = c;
    c.bus.on('roomEnter', () => {
      const room = c.state.runtime.currentRoom;
      transitionType = room?.transition || c.state.game?.transition || 'fade';
      if (transitionType === 'instant') {
        transitionEndsAt = 0;
        return;
      }
      transitionEndsAt = performance.now() + DURATION;
    });
  },

  hooks: {
    // render:final corre al final del frame, encima de todo.
    'render:final': () => {
      const now = performance.now();
      if (now >= transitionEndsAt) return;

      const t = (transitionEndsAt - now) / DURATION; // 1 → 0
      const ctx = core.api.canvas.ctx();
      const { w, h } = core.api.canvas.size();

      ctx.save();
      if (transitionType === 'wipe') {
        // Cortina vertical que se retira: ancho = t * w (cubre desde la izquierda).
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, t * w, h);
      } else {
        // 'fade' (default): rectángulo negro con alpha = t.
        ctx.fillStyle = `rgba(0, 0, 0, ${t})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    },
  },
};
