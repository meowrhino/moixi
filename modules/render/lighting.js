// modules/render/lighting.js — capa de oscuridad ambient + halos de luz en sprites.
// Hook render:fg: pinta room.ambient (rgba) sobre el room, luego "agujerea" la
// oscuridad con radial-gradients en el avatar y sprites que declaran .light.

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
      });
    }
  }
  return out;
}

export default {
  name: 'lighting',
  version: '1.0.0',
  deps: ['canvas', 'sprites'],
  schema: {
    'sprite.light': '{ radius: 3, color: "rgba(255,200,100,0.4)" } — halo de luz si presente',
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

      // Agujeros de luz: destination-out con radial gradients
      const lights = lightsInRoom(game, room, tileSize);
      if (lights.length) {
        ctx.globalCompositeOperation = 'destination-out';
        for (const l of lights) {
          const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(0.6, 'rgba(0,0,0,0.6)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(l.x - l.radius, l.y - l.radius, l.radius * 2, l.radius * 2);
        }
        ctx.restore();
        // Tinte cálido sobre cada luz (color del sprite.light) en modo screen
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const l of lights) {
          if (!l.color) continue;
          const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
          g.addColorStop(0, l.color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(l.x - l.radius, l.y - l.radius, l.radius * 2, l.radius * 2);
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
