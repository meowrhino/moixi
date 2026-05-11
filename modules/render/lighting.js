// modules/render/lighting.js — capa de oscuridad ambient + halos de luz en sprites.
// Hook render:fg: pinta room.ambient (rgba) sobre el room, luego "agujerea" la
// oscuridad con radial-gradients y aplica un tinte coloreado por cada luz,
// con blend mode y falloff configurables.

let core = null;
let enabled = true;

function lightsInRoom(game, room, tileSize) {
  const out = [];
  const avatar = game.sprites?.[game.avatar];
  if (avatar?.light) {
    const a = core.state.runtime.avatar;
    out.push({
      x: (a.x + 0.5) * tileSize,
      y: (a.y + 0.5) * tileSize,
      radius: (avatar.light.radius ?? 3) * tileSize,
      color: avatar.light.color,
      blend: avatar.light.blend || 'screen',
      falloff: avatar.light.falloff || 'soft',
    });
  }
  const tiles = room?.tiles || [];
  for (let y = 0; y < tiles.length; y++) {
    const row = tiles[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const id = row[x];
      if (!id) continue;
      const sp = game.sprites[id];
      if (!sp?.light) continue;
      out.push({
        x: (x + 0.5) * tileSize,
        y: (y + 0.5) * tileSize,
        radius: (sp.light.radius ?? 3) * tileSize,
        color: sp.light.color,
        blend: sp.light.blend || 'screen',
        falloff: sp.light.falloff || 'soft',
      });
    }
  }
  return out;
}

// Define los color stops del gradient según falloff. Devuelve un array de
// [pos, factor] donde factor es 0..1 (1 = alpha máximo, 0 = transparente).
function falloffStops(falloff) {
  switch (falloff) {
    case 'linear': return [[0, 1], [1, 0]];
    case 'step':   return [[0, 1], [0.95, 1], [0.96, 0], [1, 0]];
    case 'sharp':  return [[0, 1], [0.4, 0.95], [1, 0]];
    case 'soft':
    default:       return [[0, 1], [0.6, 0.6], [1, 0]];
  }
}

function paintHole(ctx, l) {
  const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
  for (const [t, a] of falloffStops(l.falloff)) {
    g.addColorStop(t, `rgba(0,0,0,${a})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(l.x - l.radius, l.y - l.radius, l.radius * 2, l.radius * 2);
}

function paintTint(ctx, l) {
  if (!l.color) return;
  const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
  // En el tinte sólo importan los stops "on" (factor>0). Resto transparent.
  for (const [t, a] of falloffStops(l.falloff)) {
    g.addColorStop(t, a > 0 ? l.color : 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(l.x - l.radius, l.y - l.radius, l.radius * 2, l.radius * 2);
}

export default {
  name: 'lighting',
  version: '1.1.0',
  deps: ['canvas', 'sprites'],
  schema: {
    'sprite.light': '{ radius, color, blend?, falloff? } — halo de luz',
    'sprite.light.blend': 'screen (default) | multiply | overlay | lighter | hard-light | darken | lighten',
    'sprite.light.falloff': 'soft (default) | linear | sharp | step',
    'room.ambient': 'string rgba — capa de oscuridad sobre el room (ej. "rgba(0,0,0,0.6)")',
  },

  setup(c) { core = c; },

  hooks: {
    'render:fg': () => {
      if (!enabled) return;
      const ctx = core.api.canvas?.ctx();
      if (!ctx) return;
      const game = core.state.game;
      const room = core.state.runtime.currentRoom;
      if (!room?.ambient) return;

      const tileSize = game.tileSize ?? 8;
      const { w, h } = core.api.canvas.size();

      // Capa de oscuridad ambient
      ctx.save();
      ctx.fillStyle = room.ambient;
      ctx.fillRect(0, 0, w, h);

      const lights = lightsInRoom(game, room, tileSize);
      if (lights.length) {
        // Pasada 1: agujerea la oscuridad (destination-out fijo)
        ctx.globalCompositeOperation = 'destination-out';
        for (const l of lights) paintHole(ctx, l);
        ctx.restore();

        // Pasada 2: tinte coloreado, blend mode per-light
        ctx.save();
        for (const l of lights) {
          ctx.globalCompositeOperation = l.blend;
          paintTint(ctx, l);
        }
      }
      ctx.restore();
    },
  },

  scriptFns: {
    'light-off': () => { enabled = false; },
    'light-on': () => { enabled = true; },
    'set-ambient': (c, ...rgbaArgs) => {
      const room = c.state.runtime.currentRoom;
      if (room) room.ambient = rgbaArgs.join(' ');
    },
  },

  api: {
    toggle() { enabled = !enabled; return enabled; },
    isOn() { return enabled; },
    setAmbient(rgba) {
      const room = core.state.runtime.currentRoom;
      if (room) room.ambient = rgba;
    },
  },
};
