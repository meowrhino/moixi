// modules/gameplay/inventory.js — items recolectables. Cuando el avatar pisa un sprite
// con isItem=true, se incrementa su contador en runtime.inventory y se elimina del room.

let core = null;

export default {
  name: 'inventory',
  version: '1.0.0',
  deps: ['sprites', 'dialog'],

  setup(c) {
    core = c;
    c.bus.on('pickup', ({ sprite }) => {
      const inv = c.state.runtime.inventory;
      const key = sprite.name || sprite.id;
      inv[key] = (inv[key] || 0) + 1;
      // si tiene script, ejecutarlo (mensaje de pickup)
      if (sprite.script) c.api.dialog.run(sprite.script);
      // remover del grid
      c.state.runtime.currentRoom.tiles[sprite.y][sprite.x] = null;
    });
  },

  scriptFns: {
    'item-count': (c, name) => c.state.runtime.inventory[name] || 0,
    'set-item-count': (c, name, n) => { c.state.runtime.inventory[name] = parseInt(n, 10); return ''; },
    'inc-item-count': (c, name, n) => {
      c.state.runtime.inventory[name] = (c.state.runtime.inventory[name] || 0) + parseInt(n || '1', 10);
      return '';
    },
    'dec-item-count': (c, name, n) => {
      const cur = c.state.runtime.inventory[name] || 0;
      c.state.runtime.inventory[name] = Math.max(0, cur - parseInt(n || '1', 10));
      return '';
    },
  },
};
