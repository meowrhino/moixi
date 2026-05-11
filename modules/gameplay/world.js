// modules/gameplay/world.js — transiciones entre rooms y exits.
// Un exit es: { x, y, toRoom, toX, toY, condition? (script bool), script? (corre al cruzar) }
// Vive en room.exits[].

let core = null;

function checkExits() {
  const a = core.state.runtime.avatar;
  const room = core.state.runtime.currentRoom;
  if (!room?.exits) return false;

  for (const exit of room.exits) {
    if (exit.x === a.x && exit.y === a.y) {
      // condición opcional
      if (exit.condition) {
        // ejecuta como expresión booleana: solo si devuelve true cruza
        // (evaluación simplificada: usa el dispatcher de scripting si hay)
        const result = window.MOSI?.api?.script?.eval?.(exit.condition);
        if (!result) continue;
      }
      // cambio de room
      if (exit.toRoom) {
        core.state.runtime.currentRoomId = exit.toRoom;
        core.state.runtime.currentRoom = core.state.game.rooms[exit.toRoom];
      }
      if (exit.toX != null) a.x = exit.toX;
      if (exit.toY != null) a.y = exit.toY;
      core.bus.emit('roomEnter', { roomId: core.state.runtime.currentRoomId });
      if (exit.script) core.api.dialog?.run(exit.script);
      return true;
    }
  }
  return false;
}

export default {
  name: 'world',
  version: '1.0.0',
  deps: ['mover'],

  setup(c) {
    core = c;
    c.bus.on('afterMove', checkExits);
  },

  scriptFns: {
    'world-name': (c) => c.state.game.name || 'world',
    'room-name': (c) => c.state.runtime.currentRoom?.name || c.state.runtime.currentRoomId || '',
    'set-music': (c, ...args) => {
      const [a, b] = args;
      if (b) c.state.game.rooms[a].music = b;
      else c.state.runtime.currentRoom.music = a;
      c.bus.emit('music:change', { id: c.state.runtime.currentRoom.music });
    },
  },
};
