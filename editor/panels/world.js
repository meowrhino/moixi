// editor/panels/world.js — panel de mundo y rooms.
// Izquierda: lista de rooms y mundo settings. Centro: grid editor. Derecha: room props.

import { el, uid, paintBitmap, emptyBitmap, emit } from '../ui.js';

let game;
let selectedRoom = null;
let brushSpriteId = null;     // null = borrador
let painting = false;

function render(state) {
  game = state.game;
  if (!selectedRoom) selectedRoom = game.startRoom || Object.keys(game.rooms)[0];

  // LEFT: lista de rooms y settings del mundo
  const left = document.querySelector('[data-panel="world"]');
  left.innerHTML = '';

  left.appendChild(el('h2', {}, 'world'));
  addField(left, 'name', game.name || '', v => { game.name = v; emit('editor:change'); });
  addField(left, 'startRoom', game.startRoom || '', v => { game.startRoom = v; emit('editor:change'); });

  left.appendChild(el('div', { class: 'actions' }, [
    el('button', {
      'aria-pressed': !!game.wrapH,
      onclick: () => { game.wrapH = !game.wrapH; emit('editor:change'); render(state); }
    }, game.wrapH ? '✓ wrap H' : 'wrap H'),
    el('button', {
      'aria-pressed': !!game.wrapV,
      onclick: () => { game.wrapV = !game.wrapV; emit('editor:change'); render(state); }
    }, game.wrapV ? '✓ wrap V' : 'wrap V'),
  ]));

  left.appendChild(el('h3', {}, 'rooms'));
  const list = el('div', { class: 'list' });
  for (const id of Object.keys(game.rooms)) {
    list.appendChild(el('div', {
      class: 'list-item' + (id === selectedRoom ? ' active' : ''),
      onclick: () => { selectedRoom = id; render(state); },
    }, [
      el('span', {}, game.rooms[id].name || id),
      id === game.startRoom ? el('span', { style: { color: 'var(--amber)' } }, '★') : null,
    ]));
  }
  left.appendChild(list);
  left.appendChild(el('div', { class: 'actions' }, [
    el('button', { onclick: () => addRoom(state) }, '+ room'),
    selectedRoom ? el('button', { class: 'danger', onclick: () => removeRoom(state) }, '× borrar') : null,
  ]));

  // CENTER: grid editor
  const center = document.querySelector('.panel.center');
  center.innerHTML = '';
  if (!selectedRoom || !game.rooms[selectedRoom]) {
    center.appendChild(el('div', { class: 'empty' }, 'crea un room'));
  } else {
    const room = game.rooms[selectedRoom];
    const [rw, rh] = game.roomSize;
    if (!room.tiles) room.tiles = Array.from({ length: rh }, () => new Array(rw).fill(null));

    const grid = el('div', { class: 'room-grid' });
    grid.style.gridTemplateColumns = `repeat(${rw}, 1fr)`;

    const palId = room.palette || Object.keys(game.palettes)[0];
    const colors = game.palettes[palId].colors;

    const drawGrid = () => {
      grid.innerHTML = '';
      for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
          const cell = el('div', {
            class: 'room-cell' + (game.avatarStart?.x === x && game.avatarStart?.y === y && selectedRoom === game.startRoom ? ' avatar-here' : ''),
            data: { x, y },
          });
          const id = room.tiles[y]?.[x];
          if (id && game.sprites[id]) {
            const c = el('canvas');
            paintBitmap(c, game.sprites[id].frames?.[0] || emptyBitmap(game.tileSize),
              game.tileSize, colors, game.sprites[id].colorIndex ?? 1);
            cell.appendChild(c);
          }
          grid.appendChild(cell);
        }
      }
    };
    drawGrid();

    const paintAt = (x, y) => {
      if (x < 0 || x >= rw || y < 0 || y >= rh) return;
      if (!room.tiles[y]) room.tiles[y] = new Array(rw).fill(null);
      room.tiles[y][x] = brushSpriteId;
      drawGrid();
      emit('editor:change');
    };

    grid.addEventListener('pointerdown', e => {
      const cell = e.target.closest('.room-cell');
      if (!cell) return;
      painting = true;
      grid.setPointerCapture(e.pointerId);
      paintAt(+cell.dataset.x, +cell.dataset.y);
    });
    grid.addEventListener('pointermove', e => {
      if (!painting) return;
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.room-cell');
      if (cell) paintAt(+cell.dataset.x, +cell.dataset.y);
    });
    grid.addEventListener('pointerup', e => { painting = false; grid.releasePointerCapture?.(e.pointerId); });

    center.appendChild(grid);
  }

  // RIGHT: room props + brush picker
  const right = document.querySelector('[data-panel="world-props"]');
  right.innerHTML = '';
  if (selectedRoom && game.rooms[selectedRoom]) {
    const room = game.rooms[selectedRoom];
    right.appendChild(el('h2', {}, 'room'));
    addField(right, 'nombre', room.name || '', v => { room.name = v; emit('editor:change'); });
    addField(right, 'palette', room.palette || '', v => { room.palette = v; emit('editor:change'); render(state); }, 'select', Object.keys(game.palettes));
    addField(right, 'music', room.music || '', v => { room.music = v; emit('editor:change'); }, 'select', ['', ...Object.keys(game.songs || {})]);

    right.appendChild(el('h3', {}, 'enter script'));
    const ta = el('textarea', {
      placeholder: '{position center}entras al room',
      oninput: e => { room.enterScript = e.target.value; emit('editor:change'); },
    });
    ta.value = room.enterScript || '';
    right.appendChild(el('div', { class: 'field' }, [ta]));
  }

  // Brush picker (sprite a colocar)
  right.appendChild(el('h3', {}, 'pincel'));
  const brushRow = el('div', { class: 'list' });
  brushRow.appendChild(el('div', {
    class: 'list-item' + (brushSpriteId === null ? ' active' : ''),
    onclick: () => { brushSpriteId = null; render(state); },
  }, [el('span', {}, '— borrar —')]));

  const room = selectedRoom ? game.rooms[selectedRoom] : null;
  const palId = room?.palette || Object.keys(game.palettes)[0];
  const colors = game.palettes[palId].colors;

  for (const [id, sp] of Object.entries(game.sprites)) {
    if (id === game.avatar) continue;
    const c = el('canvas');
    paintBitmap(c, sp.frames?.[0] || emptyBitmap(game.tileSize),
      game.tileSize, colors, sp.colorIndex ?? 1);
    c.style.imageRendering = 'pixelated';
    brushRow.appendChild(el('div', {
      class: 'list-item' + (brushSpriteId === id ? ' active' : ''),
      onclick: () => { brushSpriteId = id; render(state); },
    }, [
      el('div', { class: 'preview' }, [c]),
      el('span', {}, sp.name || id),
    ]));
  }
  right.appendChild(brushRow);
}

function addRoom(state) {
  const id = uid('room');
  const [rw, rh] = game.roomSize;
  game.rooms[id] = {
    name: 'nuevo',
    palette: Object.keys(game.palettes)[0],
    tiles: Array.from({ length: rh }, () => new Array(rw).fill(null)),
  };
  selectedRoom = id;
  emit('editor:change');
  render(state);
}

function removeRoom(state) {
  if (!confirm(`¿borrar ${selectedRoom}?`)) return;
  delete game.rooms[selectedRoom];
  selectedRoom = Object.keys(game.rooms)[0];
  if (game.startRoom && !game.rooms[game.startRoom]) game.startRoom = selectedRoom;
  emit('editor:change');
  render(state);
}

function addField(parent, label, value, onChange, type = 'text', options = null) {
  let input;
  if (type === 'select') {
    input = el('select', { onchange: e => onChange(e.target.value) },
      options.map(o => el('option', { value: o, ...(o === value ? { selected: '' } : {}) }, o || '—')));
  } else {
    input = el('input', { type, value, oninput: e => onChange(e.target.value) });
  }
  parent.appendChild(el('div', { class: 'field' }, [
    el('label', {}, label),
    input,
  ]));
}

export default {
  name: 'world',
  label: 'world',
  render,
  rightPanelSelector: 'world-props',
  onAdd: (state) => addRoom(state),
  onRemove: (state) => selectedRoom && removeRoom(state),
};
