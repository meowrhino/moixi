// modules/render/sprites.js — renderiza sprites desde bitmaps + caché offscreen.
// Cada sprite es { name, frames: [[0,1,0,...]], colorIndex, isWall, isItem, layer, fps, script, idle?, idleFps? }.
// Cada frame es un array plano de tileSize*tileSize ints, donde 0=transparente, >0=índice de paleta.
// idle: frames opcionales que se usan en el avatar cuando lleva idleThresholdMs sin moverse.

let core = null;
let idleTime = 0;
const IDLE_THRESHOLD_MS = 2000;
const cache = new Map();  // key = `${spriteId}:${mode}:${frame}:${colorIndex}:${paletteId}` → canvas

function bitmapKey(id, mode, frame, colorIndex, palId) {
  return `${id}:${mode}:${frame}:${colorIndex}:${palId}`;
}

function rasterize(sprite, frameIdx, colorIndex, palette, tileSize, mode = 'frames') {
  const key = bitmapKey(sprite.id || sprite.name, mode, frameIdx, colorIndex, palette.id || 'pal');
  if (cache.has(key)) return cache.get(key);

  const off = document.createElement('canvas');
  off.width = tileSize;
  off.height = tileSize;
  const c = off.getContext('2d');
  const source = sprite[mode] || sprite.frames;
  const frame = source?.[frameIdx] || source?.[0] || [];
  const color = palette.colors[colorIndex] ?? '#fff';
  c.fillStyle = color;
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      if (frame[y * tileSize + x]) c.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, off);
  return off;
}

export function clearCache() { cache.clear(); }

export default {
  name: 'sprites',
  version: '1.0.0',
  deps: ['canvas', 'palettes'],
  schema: {
    sprites: '{ id: { name, frames, colorIndex, isWall, isItem, layer, fps, script } }',
  },

  setup(c) {
    core = c;
    // Idle: contador que crece en tick y se resetea con cualquier input/movimiento.
    c.bus.on('tick', ({ dt }) => { idleTime += dt; });
    c.bus.on('afterMove', () => { idleTime = 0; });
    for (const ev of ['input:up', 'input:down', 'input:left', 'input:right', 'input:action', 'input:cancel']) {
      c.bus.on(ev, () => { idleTime = 0; });
    }
  },

  hooks: {
    'render:sprites': ({ t }) => {
      const ctx = core.api.canvas.ctx();
      const game = core.state.game;
      const room = core.state.runtime.currentRoom;
      if (!room || !ctx) return;
      const tileSize = game.tileSize ?? 8;
      const palette = core.api.palettes.current();
      if (!palette) return;
      palette.id = palette.id || room.palette;

      // pintar tiles del room (sprites colocados en el grid)
      const tiles = room.tiles || [];
      for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < (tiles[y]?.length || 0); x++) {
          const ref = tiles[y][x];
          if (!ref) continue;
          const sprite = game.sprites[ref];
          if (!sprite) continue;
          sprite.id = ref;
          const fps = sprite.fps || 2;
          const frameCount = sprite.frames?.length || 1;
          const frame = frameCount > 1 ? Math.floor((t / (1000 / fps)) % frameCount) : 0;
          const bmp = rasterize(sprite, frame, sprite.colorIndex ?? 2, palette, tileSize);
          ctx.drawImage(bmp, x * tileSize, y * tileSize);
        }
      }

      // pintar avatar (con idle animation si lleva IDLE_THRESHOLD_MS sin moverse)
      const avatarRef = game.avatar;
      const avatarSprite = game.sprites[avatarRef];
      if (avatarSprite) {
        avatarSprite.id = avatarRef;
        const a = core.state.runtime.avatar;
        const isIdle = idleTime > IDLE_THRESHOLD_MS && avatarSprite.idle?.length;
        const mode = isIdle ? 'idle' : 'frames';
        const frames = isIdle ? avatarSprite.idle : (avatarSprite.frames || []);
        const fps = isIdle ? (avatarSprite.idleFps || 1.5) : (avatarSprite.fps || 2);
        const frameCount = frames.length || 1;
        const frame = frameCount > 1 ? Math.floor((t / (1000 / fps)) % frameCount) : 0;
        const bmp = rasterize(avatarSprite, frame, avatarSprite.colorIndex ?? 2, palette, tileSize, mode);
        ctx.drawImage(bmp, a.x * tileSize, a.y * tileSize);
      }
    },
  },

  scriptFns: {
    'sprite-name': (c) => c.state.runtime.currentSprite?.name ?? '',
    'sprite-x': (c) => c.state.runtime.currentSprite?.x ?? 0,
    'sprite-y': (c) => c.state.runtime.currentSprite?.y ?? 0,
    'sprite-room': (c) => c.state.runtime.currentRoomId ?? '',
    'sprite-wall': (c) => !!c.state.runtime.currentSprite?.isWall,
    'sprite-item': (c) => !!c.state.runtime.currentSprite?.isItem,

    'transform-sprite': (c, newName) => {
      const cur = c.state.runtime.currentSprite;
      if (!cur) return;
      const target = Object.entries(c.state.game.sprites).find(([id, s]) => s.name === newName || id === newName);
      if (!target) return;
      const [newId] = target;
      // reemplaza en el grid
      const room = c.state.runtime.currentRoom;
      if (cur.x != null && cur.y != null) room.tiles[cur.y][cur.x] = newId;
    },

    'remove-sprite': (c) => {
      const cur = c.state.runtime.currentSprite;
      if (!cur || cur.x == null) return;
      c.state.runtime.currentRoom.tiles[cur.y][cur.x] = null;
    },

    'place-sprite': (c, name, ...rest) => {
      // {place-sprite name x y}  o  {place-sprite name room x y}
      let roomId, x, y;
      if (rest.length === 2) { [x, y] = rest; roomId = c.state.runtime.currentRoomId; }
      else { [roomId, x, y] = rest; }
      const target = Object.entries(c.state.game.sprites).find(([id, s]) => s.name === name || id === name);
      if (!target) return;
      const room = c.state.game.rooms[roomId];
      if (!room.tiles[y]) room.tiles[y] = [];
      room.tiles[y][x] = target[0];
    },

    'move-sprite': (c, ...rest) => {
      const cur = c.state.runtime.currentSprite;
      if (!cur) return;
      let roomId, x, y;
      if (rest.length === 2) { [x, y] = rest; roomId = c.state.runtime.currentRoomId; }
      else { [roomId, x, y] = rest; }
      // quita de su posición actual
      if (cur.x != null) c.state.runtime.currentRoom.tiles[cur.y][cur.x] = null;
      const room = c.state.game.rooms[roomId];
      if (!room.tiles[y]) room.tiles[y] = [];
      room.tiles[y][x] = cur.id;
    },

    'set-sprite-color': (c, n) => {
      const cur = c.state.runtime.currentSprite;
      if (cur) cur.colorIndex = parseInt(n, 10);
      clearCache();
    },
    'set-sprite-wall': (c, b) => {
      const cur = c.state.runtime.currentSprite;
      if (cur) cur.isWall = b === true || b === 'true';
    },
    'set-sprite-item': (c, b) => {
      const cur = c.state.runtime.currentSprite;
      if (cur) cur.isItem = b === true || b === 'true';
    },

    // Selección masiva (tipo Mosi)
    'sprite-at': (c, x, y) => {
      const id = c.state.runtime.currentRoom?.tiles?.[y]?.[x];
      if (!id) return [];
      return [{ id, ...c.state.game.sprites[id], x, y }];
    },
    'sprites-in-room': (c) => {
      const room = c.state.runtime.currentRoom;
      const out = [];
      const tiles = room?.tiles || [];
      for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < (tiles[y]?.length || 0); x++) {
          const id = tiles[y][x];
          if (id) out.push({ id, ...c.state.game.sprites[id], x, y });
        }
      }
      return out;
    },
    'sprites-named': (c, name) => {
      const all = c.scriptFns['sprites-in-room'](c);
      return all.filter(s => s.name === name);
    },
    'neighbors': (c) => {
      const cur = c.state.runtime.currentSprite;
      if (!cur || cur.x == null) return [];
      const tiles = c.state.runtime.currentRoom?.tiles || [];
      const out = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        const id = tiles[ny]?.[nx];
        if (id) out.push({ id, ...c.state.game.sprites[id], x: nx, y: ny });
      }
      return out;
    },
  },

  api: {
    clearCache,
    // Devuelve una vista mutable del sprite en (x,y): lecturas y escrituras
    // van al sprite original (game.sprites[id]); id/x/y se "inyectan" como propiedades
    // de instancia. Sin esto, set-sprite-wall y demás mutarían una copia y se perderían.
    spriteAt(x, y) {
      const id = core.state.runtime.currentRoom?.tiles?.[y]?.[x];
      if (!id) return null;
      const og = core.state.game.sprites[id];
      return new Proxy(og, {
        get: (t, k) => k === 'id' ? id : k === 'x' ? x : k === 'y' ? y : t[k],
        set: (t, k, v) => { if (k === 'id' || k === 'x' || k === 'y') return true; t[k] = v; return true; },
        has: (t, k) => k === 'id' || k === 'x' || k === 'y' || k in t,
      });
    },
  },
};
