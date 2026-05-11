// editor/panels/sprite.js — panel de sprites con editor pixel art.

import { el, uid, paintBitmap, emptyBitmap, emit, on } from '../ui.js';

let game;
let selected = null;        // sprite id seleccionado
let activeFrame = 0;
let activeColor = 1;        // índice en la paleta actual

function render(state) {
  game = state.game;
  const root = document.querySelector('[data-panel="sprite"]');
  if (!root) return;
  root.innerHTML = '';

  // Sub-panel izquierdo: lista
  const list = el('div');
  list.appendChild(el('h2', {}, 'sprites'));
  const listBox = el('div', { class: 'list' });

  const palId = state.runtime?.currentRoom?.palette || Object.keys(game.palettes)[0];
  const colors = game.palettes[palId].colors;

  for (const [id, sp] of Object.entries(game.sprites)) {
    const c = el('canvas');
    paintBitmap(c, sp.frames?.[0] || emptyBitmap(game.tileSize), game.tileSize, colors, sp.colorIndex ?? 1);
    c.style.imageRendering = 'pixelated';
    const item = el('div', {
      class: 'list-item' + (id === selected ? ' active' : ''),
      onclick: () => { selected = id; render(state); },
    }, [
      el('div', { class: 'preview' }, [c]),
      el('span', {}, sp.name || id),
      id === game.avatar ? el('span', { style: { color: 'var(--amber)' } }, '★') : null,
    ]);
    listBox.appendChild(item);
  }
  list.appendChild(listBox);
  list.appendChild(el('div', { class: 'actions' }, [
    el('button', { onclick: () => addSprite(state) }, '+ nuevo'),
    selected ? el('button', { class: 'danger', onclick: () => deleteSprite(state) }, '× borrar') : null,
    selected && selected !== game.avatar
      ? el('button', { onclick: () => { game.avatar = selected; emit('editor:change'); render(state); } }, 'avatar ★')
      : null,
  ]));
  root.appendChild(list);

  // Sub-panel central: editor pixel art
  const editor = el('div', { class: 'paint' });
  if (selected) {
    const sp = game.sprites[selected];
    if (!sp.frames) sp.frames = [emptyBitmap(game.tileSize)];
    if (activeFrame >= sp.frames.length) activeFrame = 0;

    editor.appendChild(el('h2', {}, sp.name || selected));

    // Canvas grande para pintar
    const big = el('canvas', { class: 'paint-canvas' });
    const grid = renderPaintCanvas(big, sp, activeFrame, game.tileSize, colors);
    editor.appendChild(big);

    // Color picker (solo del 0..colors.length-1, color 0 = transparente / fondo)
    const cRow = el('div', { class: 'color-row' });
    cRow.appendChild(el('div', {
      class: 'color-swatch' + (activeColor === 0 ? ' active' : ''),
      style: { background:
        'repeating-conic-gradient(#888 0 25%, #ccc 0 50%) 50% / 8px 8px' },
      title: 'transparente',
      onclick: () => { activeColor = 0; render(state); },
    }));
    for (let i = 1; i < colors.length; i++) {
      cRow.appendChild(el('div', {
        class: 'color-swatch' + (activeColor === i ? ' active' : ''),
        style: { background: colors[i] },
        title: `color ${i}`,
        onclick: () => { activeColor = i; render(state); },
      }));
    }
    editor.appendChild(cRow);

    // Frames
    editor.appendChild(el('h3', {}, 'frames'));
    const fRow = el('div', { class: 'frames' });
    sp.frames.forEach((f, i) => {
      const fc = el('canvas');
      paintBitmap(fc, f, game.tileSize, colors, sp.colorIndex ?? 1);
      const fr = el('div', {
        class: 'frame' + (i === activeFrame ? ' active' : ''),
        onclick: () => { activeFrame = i; render(state); },
      }, [fc]);
      fRow.appendChild(fr);
    });
    editor.appendChild(fRow);
    editor.appendChild(el('div', { class: 'actions' }, [
      el('button', {
        onclick: () => {
          sp.frames.push([...sp.frames[sp.frames.length - 1]]);
          activeFrame = sp.frames.length - 1;
          emit('editor:change');
          render(state);
        }
      }, '+ frame'),
      sp.frames.length > 1 ? el('button', {
        class: 'danger',
        onclick: () => {
          sp.frames.splice(activeFrame, 1);
          activeFrame = 0;
          emit('editor:change');
          render(state);
        }
      }, '× frame') : null,
    ]));
  } else {
    editor.appendChild(el('div', { class: 'empty' }, 'selecciona un sprite'));
  }
  document.querySelector('.panel.center').replaceChildren(editor);

  // Sub-panel derecho: properties
  const right = document.querySelector('[data-panel="sprite-props"]');
  right.innerHTML = '';
  if (selected) {
    const sp = game.sprites[selected];
    right.appendChild(el('h2', {}, 'propiedades'));

    addField(right, 'nombre', sp.name || '', v => { sp.name = v; emit('editor:change'); });
    addField(right, 'fps', sp.fps || 2, v => { sp.fps = parseFloat(v); emit('editor:change'); }, 'number');
    addField(right, 'colorIndex', sp.colorIndex ?? 1, v => { sp.colorIndex = parseInt(v, 10); emit('editor:change'); render(state); }, 'number');

    right.appendChild(el('div', { class: 'actions' }, [
      el('button', {
        'aria-pressed': !!sp.isWall,
        onclick: () => { sp.isWall = !sp.isWall; emit('editor:change'); render(state); }
      }, sp.isWall ? '✓ pared' : 'pared'),
      el('button', {
        'aria-pressed': !!sp.isItem,
        onclick: () => { sp.isItem = !sp.isItem; emit('editor:change'); render(state); }
      }, sp.isItem ? '✓ item' : 'item'),
    ]));

    right.appendChild(el('h3', {}, 'script'));
    const ta = el('textarea', {
      placeholder: 'hola{p}{wavy}qué tal{/wavy}',
      oninput: e => { sp.script = e.target.value; emit('editor:change'); },
    });
    ta.value = sp.script || '';
    right.appendChild(el('div', { class: 'field' }, [ta]));
    right.appendChild(el('div', { style: { fontSize: '0.7rem', opacity: 0.6 } },
      'tags: {b} {p} {wavy} {shaky} {color N} {position} {if} ...'));
  } else {
    right.appendChild(el('div', { class: 'empty' }, '—'));
  }
}

function renderPaintCanvas(big, sprite, frameIdx, tileSize, colors) {
  big.width = tileSize;
  big.height = tileSize;
  const ctx = big.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const draw = () => paintBitmap(big, sprite.frames[frameIdx], tileSize, colors, sprite.colorIndex ?? 1);
  draw();

  let painting = false;
  const setPixel = (e) => {
    const rect = big.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * tileSize);
    const y = Math.floor((e.clientY - rect.top) / rect.height * tileSize);
    if (x < 0 || x >= tileSize || y < 0 || y >= tileSize) return;
    sprite.frames[frameIdx][y * tileSize + x] = activeColor;
    draw();
    emit('editor:change');
  };

  big.addEventListener('pointerdown', e => { painting = true; setPixel(e); big.setPointerCapture(e.pointerId); });
  big.addEventListener('pointermove', e => { if (painting) setPixel(e); });
  big.addEventListener('pointerup',   e => { painting = false; big.releasePointerCapture(e.pointerId); });
  return draw;
}

function addField(parent, label, value, onChange, type = 'text') {
  const inp = el('input', { type, value, oninput: e => onChange(e.target.value) });
  parent.appendChild(el('div', { class: 'field' }, [
    el('label', {}, label),
    inp,
  ]));
}

function addSprite(state) {
  const id = uid('sp');
  game.sprites[id] = {
    name: 'nuevo',
    colorIndex: 1,
    fps: 2,
    frames: [emptyBitmap(game.tileSize)],
  };
  selected = id;
  emit('editor:change');
  render(state);
}

function deleteSprite(state) {
  if (!confirm(`¿borrar ${selected}?`)) return;
  delete game.sprites[selected];
  // limpiar referencias en rooms
  for (const room of Object.values(game.rooms)) {
    if (!room.tiles) continue;
    for (let y = 0; y < room.tiles.length; y++)
      for (let x = 0; x < room.tiles[y].length; x++)
        if (room.tiles[y][x] === selected) room.tiles[y][x] = null;
  }
  if (game.avatar === selected) game.avatar = Object.keys(game.sprites)[0];
  selected = null;
  emit('editor:change');
  render(state);
}

export default {
  name: 'sprite',
  label: 'sprites',
  render,
  layout: 'three-column',  // izq (lista) | centro (paint) | der (props)
  rightPanelSelector: 'sprite-props',
  onAdd: (state) => addSprite(state),
  onRemove: (state) => selected && deleteSprite(state),
};
