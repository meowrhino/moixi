// modules/input/mover.js — traduce input:up/down/left/right a movimiento del avatar.
// Emite hooks 'beforeMove', 'afterMove', 'bump:sprite' que otros módulos pueden interceptar.

let core = null;

function tryMove(dx, dy) {
  if (core.state.runtime.dialogActive) return;
  if (core.state.runtime.paused) return;

  const a = core.state.runtime.avatar;
  const game = core.state.game;
  const [rw, rh] = game.roomSize ?? [16, 16];
  let nx = a.x + dx;
  let ny = a.y + dy;

  // wrap world (si está activo)
  if (game.wrapH) nx = (nx + rw) % rw;
  if (game.wrapV) ny = (ny + rh) % rh;
  if (nx < 0 || nx >= rw || ny < 0 || ny >= rh) {
    // Fuera de bounds, comprueba exits del room
    core.bus.emit('move:out-of-bounds', { dx, dy, from: { ...a } });
    return;
  }

  a.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';

  const ev = core.bus.emit('beforeMove', { x: nx, y: ny, dx, dy, from: { ...a } });
  if (ev.cancel) {
    // bump: el avatar chocó con algo. Si hay un sprite ahí, dispara su script.
    const target = core.api.sprites?.spriteAt(nx, ny);
    if (target) core.bus.emit('bump:sprite', { sprite: target });
    return;
  }

  a.x = nx;
  a.y = ny;
  core.bus.emit('afterMove', { x: nx, y: ny, dx, dy });

  // pickup automático de items
  const here = core.api.sprites?.spriteAt(nx, ny);
  if (here?.isItem) core.bus.emit('pickup', { sprite: here });
}

export default {
  name: 'mover',
  version: '1.0.0',
  deps: ['sprites'],

  setup(c) {
    core = c;
    c.bus.on('input:up',    () => tryMove(0, -1));
    c.bus.on('input:down',  () => tryMove(0,  1));
    c.bus.on('input:left',  () => tryMove(-1, 0));
    c.bus.on('input:right', () => tryMove(1,  0));
  },

  scriptFns: {
    'avatar-x': (c) => c.state.runtime.avatar.x,
    'avatar-y': (c) => c.state.runtime.avatar.y,
    'avatar-name': (c) => c.state.game.sprites?.[c.state.game.avatar]?.name ?? '',
    'move-avatar': (c, ...args) => {
      let roomId, x, y;
      if (args.length === 2) { [x, y] = args; }
      else { [roomId, x, y] = args; }
      if (roomId) {
        c.state.runtime.currentRoomId = roomId;
        c.state.runtime.currentRoom = c.state.game.rooms[roomId];
        c.bus.emit('roomEnter', { roomId });
      }
      c.state.runtime.avatar.x = parseInt(x, 10);
      c.state.runtime.avatar.y = parseInt(y, 10);
    },
    'transform-avatar': (c, name) => {
      const target = Object.entries(c.state.game.sprites).find(([id, s]) => s.name === name || id === name);
      if (target) c.state.game.avatar = target[0];
      core.api.sprites?.clearCache?.();
    },
  },
};
