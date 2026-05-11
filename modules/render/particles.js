// modules/render/particles.js — sistema simple de partículas.
//
// Cada partícula es { x, y, vx, vy, life, maxLife, color, size, gravity } en
// coordenadas de pixel (no de tile). Se decrementa life en tick y se elimina
// cuando llega a 0. Render como rect simple alfa-blended por life ratio.
//
// schema:
//   game.particleKinds = {
//     spark: { color, lifetime, speed, spread, size, gravity }
//   }
//
// API:
//   core.api.particles.emit(kind, px, py, count)
//   core.api.particles.count()
//   core.api.particles.clear()
//
// scriptFns (coords en TILE, se multiplican por tileSize):
//   {emit kind tx ty}
//   {emit-burst kind tx ty count?}

let core = null;
let particles = [];

const DEFAULTS = {
  color: '#fff',
  lifetime: 1000,  // ms
  speed: 30,       // px/sec base
  spread: 1,       // 1 = todas direcciones; 0.25 = un cuarto; 0 = recto
  size: 1,         // px
  gravity: 0,      // px/sec^2
};

function emit(kind, px, py, count = 1) {
  const def = { ...DEFAULTS, ...(core.state.game?.particleKinds?.[kind] || {}) };
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() - 0.5) * Math.PI * 2 * def.spread;
    const speed = def.speed * (0.5 + Math.random() * 0.5);
    particles.push({
      x: +px, y: +py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: def.lifetime,
      maxLife: def.lifetime,
      color: def.color,
      size: def.size,
      gravity: def.gravity,
    });
  }
}

export default {
  name: 'particles',
  version: '1.0.0',
  deps: ['canvas'],
  schema: {
    'game.particleKinds': '{ id: { color, lifetime, speed, spread, size, gravity } }',
  },

  setup(c) { core = c; },

  hooks: {
    'tick': ({ dt }) => {
      const dts = dt / 1000;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dts;
        p.y += p.vy * dts;
        p.vy += p.gravity * dts;
      }
    },
    'render:fg': () => {
      const ctx = core.api.canvas?.ctx();
      if (!ctx || !particles.length) return;
      ctx.save();
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      }
      ctx.restore();
    },
    'gameLoad': () => { particles = []; },
    'roomEnter': () => { particles = []; },
  },

  scriptFns: {
    'emit': (c, kind, tx, ty) => {
      const ts = c.state.game.tileSize ?? 8;
      emit(kind, parseFloat(tx) * ts + ts / 2, parseFloat(ty) * ts + ts / 2, 1);
    },
    'emit-burst': (c, kind, tx, ty, count) => {
      const ts = c.state.game.tileSize ?? 8;
      emit(kind, parseFloat(tx) * ts + ts / 2, parseFloat(ty) * ts + ts / 2,
        parseInt(count, 10) || 12);
    },
  },

  api: {
    emit,
    count: () => particles.length,
    clear() { particles = []; },
  },
};
