// modules/render/palettes.js — paletas de color reasignables por room.

let core = null;

export default {
  name: 'palettes',
  version: '1.0.0',
  deps: ['canvas'],
  schema: {
    palettes: '{ id: { name, colors: [hex...] } }',
    'room.palette': 'id de paleta',
  },

  setup(c) { core = c; },

  scriptFns: {
    'set-palette': (c, ...args) => {
      // {set-palette palId} o {set-palette roomId palId}
      const [a, b] = args;
      const game = c.state.game;
      if (b) game.rooms[a].palette = b;
      else c.state.runtime.currentRoom.palette = a;
    },
  },

  api: {
    current() {
      const room = core.state.runtime.currentRoom;
      if (!room) return null;
      return core.state.game.palettes?.[room.palette] || null;
    },
    get(id) { return core.state.game.palettes?.[id] || null; },
    color(index) {
      const pal = this.current();
      if (!pal) return '#000';
      return pal.colors[index] ?? pal.colors[pal.colors.length - 1] ?? '#000';
    },
  },
};
