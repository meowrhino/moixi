// modules/render/camera.js — cámara del runtime. Modos: 'flip' (default, igual que mosi),
// 'follow' (snap al centro del avatar), 'smooth' (interpola).
// Por compat retro, sin `game.cameraMode` el comportamiento es 'flip' (no se nota).

let core = null;
let tx = 0, ty = 0;
let runtimeMode = null; // override en runtime via {set-camera}

function getMode() {
  return runtimeMode || core.state.game?.cameraMode || 'flip';
}

function applyClamp(target, viewport, world) {
  if (world <= viewport) return (viewport - world) / 2;
  return Math.max(viewport - world, Math.min(0, target));
}

export default {
  name: 'camera',
  version: '1.0.0',
  deps: ['canvas'],

  schema: {
    'game.cameraMode': "'flip' | 'follow' | 'smooth' — default 'flip'",
    'room.cameraMode': "override por room (igual valores)",
  },

  setup(c) {
    core = c;
    c.bus.on('roomEnter', () => { tx = 0; ty = 0; }); // reset al cambiar de room
  },

  hooks: {
    // Aplica translate DESPUÉS del bg de canvas (canvas se registra antes; el bg ya pintó).
    'render:bg': () => {
      const m = getMode();
      if (m === 'flip') { tx = 0; ty = 0; return; }

      const ctx = core.api.canvas.ctx();
      const { w, h } = core.api.canvas.size();
      const ts = core.state.game.tileSize ?? 8;
      const [rw, rh] = core.state.game.roomSize ?? [16, 16];
      const worldW = rw * ts;
      const worldH = rh * ts;
      const a = core.state.runtime.avatar;

      const targetX = -(a.x * ts + ts / 2 - w / 2);
      const targetY = -(a.y * ts + ts / 2 - h / 2);

      if (m === 'follow') {
        tx = targetX; ty = targetY;
      } else if (m === 'smooth') {
        const alpha = 0.18;
        tx += (targetX - tx) * alpha;
        ty += (targetY - ty) * alpha;
      }

      tx = applyClamp(tx, w, worldW);
      ty = applyClamp(ty, h, worldH);

      ctx.save();
      ctx.translate(Math.round(tx), Math.round(ty));
    },

    'render:final': () => {
      if (getMode() === 'flip') return;
      core.api.canvas.ctx().restore();
    },
  },

  scriptFns: {
    'set-camera': (c, m) => {
      if (m === 'flip' || m === 'follow' || m === 'smooth') {
        runtimeMode = m;
        c.state.game.cameraMode = m;
      }
      return '';
    },
  },

  api: {
    mode() { return getMode(); },
    offset() { return { x: tx, y: ty }; },
  },
};
