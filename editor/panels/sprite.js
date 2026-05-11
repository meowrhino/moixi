// editor/panels/sprite.js — panel de sprites con editor pixel art.

import { el, uid, paintBitmap, emptyBitmap, emit, on } from '../ui.js';

let game;
let selected = null;        // sprite id seleccionado
let activeFrame = 0;
let activeColor = 1;        // índice en la paleta actual
let tool = 'pencil';        // 'pencil' | 'bucket' | 'eyedropper'
let onionSkin = false;
let currentRerender = null; // referencia para que los shortcuts puedan re-render

// Listeners de shortcuts (registrados una vez al cargar el módulo)
on('editor:shortcut:bucket', () => {
  tool = tool === 'bucket' ? 'pencil' : 'bucket';
  currentRerender?.();
});
on('editor:shortcut:eyedropper', () => {
  tool = tool === 'eyedropper' ? 'pencil' : 'eyedropper';
  currentRerender?.();
});
on('editor:shortcut:onion', () => {
  onionSkin = !onionSkin;
  currentRerender?.();
});

function render(state) {
  game = state.game;
  currentRerender = () => render(state);
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
    big.setAttribute('data-tool', tool);
    const grid = renderPaintCanvas(big, sp, activeFrame, game.tileSize, colors);
    editor.appendChild(big);

    // Indicador de herramienta + onion
    const toolLabel = tool === 'pencil' ? 'lápiz' : tool === 'bucket' ? 'cubo (B)' : 'cuentagotas (I)';
    editor.appendChild(el('div', { class: 'tool-indicator', 'aria-live': 'polite' },
      toolLabel + (onionSkin && sp.frames.length > 1 ? ' · onion (O)' : '')));

    // Color picker (solo del 0..colors.length-1, color 0 = transparente / fondo)
    const cRow = el('div', { class: 'color-row', role: 'radiogroup', 'aria-label': 'color activo' });
    cRow.appendChild(el('div', {
      class: 'color-swatch' + (activeColor === 0 ? ' active' : ''),
      style: { background:
        'repeating-conic-gradient(#888 0 25%, #ccc 0 50%) 50% / 8px 8px' },
      title: 'transparente',
      role: 'radio',
      tabindex: '0',
      'aria-checked': activeColor === 0 ? 'true' : 'false',
      'aria-label': 'color transparente',
      onclick: () => { activeColor = 0; render(state); },
    }));
    for (let i = 1; i < colors.length; i++) {
      cRow.appendChild(el('div', {
        class: 'color-swatch' + (activeColor === i ? ' active' : ''),
        style: { background: colors[i] },
        title: `color ${i}`,
        role: 'radio',
        tabindex: '0',
        'aria-checked': activeColor === i ? 'true' : 'false',
        'aria-label': `color ${i} (${colors[i]})`,
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
  const bitmap = sprite.frames[frameIdx];
  const colorIndex = sprite.colorIndex ?? 1;
  const draw = () => {
    ctx.fillStyle = colors[0] || '#000';
    ctx.fillRect(0, 0, tileSize, tileSize);
    // onion skin: frame previo en alpha 0.2 detrás del actual
    if (onionSkin && frameIdx > 0 && sprite.frames[frameIdx - 1]) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = colors[colorIndex] || '#fff';
      const prev = sprite.frames[frameIdx - 1];
      for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
          if (prev[y * tileSize + x]) ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = colors[colorIndex] || '#fff';
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        if (bitmap[y * tileSize + x]) ctx.fillRect(x, y, 1, 1);
      }
    }
  };
  draw();

  const eventXY = (e) => {
    const rect = big.getBoundingClientRect();
    return [
      Math.floor((e.clientX - rect.left) / rect.width * tileSize),
      Math.floor((e.clientY - rect.top) / rect.height * tileSize),
    ];
  };
  const inBounds = (x, y) => x >= 0 && x < tileSize && y >= 0 && y < tileSize;

  const setPixel = (x, y) => {
    if (!inBounds(x, y)) return;
    bitmap[y * tileSize + x] = activeColor;
    draw();
    emit('editor:change');
  };

  // flood fill BFS desde (sx, sy): reemplaza el color en el bitmap por activeColor.
  const floodFill = (sx, sy) => {
    if (!inBounds(sx, sy)) return;
    const target = bitmap[sy * tileSize + sx];
    if (target === activeColor) return;
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.shift();
      if (!inBounds(x, y)) continue;
      if (bitmap[y * tileSize + x] !== target) continue;
      bitmap[y * tileSize + x] = activeColor;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    draw();
    emit('editor:change');
  };

  const eyedrop = (x, y) => {
    if (!inBounds(x, y)) return;
    activeColor = bitmap[y * tileSize + x];
    tool = 'pencil';
    currentRerender?.();
  };

  let painting = false;
  big.addEventListener('pointerdown', e => {
    const [x, y] = eventXY(e);
    if (tool === 'bucket') { floodFill(x, y); return; }
    if (tool === 'eyedropper') { eyedrop(x, y); return; }
    painting = true;
    setPixel(x, y);
    big.setPointerCapture(e.pointerId);
  });
  big.addEventListener('pointermove', e => {
    if (!painting || tool !== 'pencil') return;
    setPixel(...eventXY(e));
  });
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
