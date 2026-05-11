// core/state.js — estado global del engine.
// `game` = el JSON cargado, fuente de verdad estática (también sirve al editor).
// `runtime` = mutable durante la partida, se reconstruye al cargar.

const state = {
  game: null,
  runtime: {
    currentRoomId: null,
    avatar: { x: 0, y: 0, frame: 0, dir: 'down' },
    variables: {},
    inventory: {},
    flags: {},
    paused: false,
    dialogActive: false,
    currentSprite: null,  // contexto para script-fns que dependen del sprite
    currentRoom: null,    // shortcut a state.game.rooms[currentRoomId]
  },
  // history para undo/redo en editor
  history: { past: [], future: [] },
};

export default state;

// Helper: cargar un JSON de juego, validar mínimo, resetear runtime.
export function load(gameData) {
  state.game = gameData;
  state.runtime.currentRoomId = gameData.startRoom;
  state.runtime.currentRoom = gameData.rooms?.[gameData.startRoom] || null;
  state.runtime.avatar.x = gameData.avatarStart?.x ?? 0;
  state.runtime.avatar.y = gameData.avatarStart?.y ?? 0;
  state.runtime.variables = {};
  state.runtime.inventory = {};
  state.runtime.flags = {};
}

export function reset() {
  state.runtime = {
    currentRoomId: null,
    avatar: { x: 0, y: 0, frame: 0, dir: 'down' },
    variables: {},
    inventory: {},
    flags: {},
    paused: false,
    dialogActive: false,
    currentSprite: null,
    currentRoom: null,
  };
}
