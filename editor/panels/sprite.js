// editor/panels/sprite.js — panel de sprites. lista + pixel-art editor + props.
//
// Layout three-column: lista de sprites (izq), canvas grande para pintar (centro),
// propiedades del sprite + script (der). Lógica de pintado delegada a
// editor/paint-canvas.js para mantener este archivo enfocado en la composición de UI.

import { el, uid, paintBitmap, emptyBitmap, emit, on } from '../ui.js';
import { attachPaintCanvas } from '../paint-canvas.js';

// === state del panel (module-level singleton) ===
let game;
let selected = null;        // sprite id seleccionado
let activeFrame = 0;
let activeColor = 1;        // índice en la paleta actual
let tool = 'pencil';        // 'pencil' | 'bucket' | 'eyedropper'
let onionSkin = false;
let previewPalette = null;  // id de palette que sobreescribe la default para preview;
                            // null = usar la default (no modifica el sprite, solo cómo se ve)
let currentRerender = null; // hook para que listeners externos puedan re-render

function getEffectivePalId(state) {
  if (previewPalette && game.palettes[previewPalette]) return previewPalette;
  return state.runtime?.currentRoom?.palette || Object.keys(game.palettes)[0];
}

// === shortcuts ===
// Registrados una sola vez al cargar el módulo; togglean state global y rerenderean.
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

// === render principal ===

function render(state) {
  game = state.game;
  currentRerender = () => render(state);
  const root = document.querySelector('[data-panel="sprite"]');
  if (!root) return;
  root.replaceChildren(renderList(state));
  document.querySelector('.panel.center').replaceChildren(renderEditor(state));
  document.querySelector('[data-panel="sprite-props"]').replaceChildren(...renderProps(state));
}

// Lista de sprites + acciones (nuevo, borrar, marcar avatar).
function renderList(state) {
  const list = el('div');
  list.appendChild(el('h2', {}, 'sprites'));
  const listBox = el('div', { class: 'list' });

  const palId = getEffectivePalId(state);
  const colors = game.palettes[palId].colors;

  for (const [id, sp] of Object.entries(game.sprites)) {
    const preview = el('canvas');
    paintBitmap(preview, sp.frames?.[0] || emptyBitmap(game.tileSize), game.tileSize, colors, sp.colorIndex ?? 1);
    preview.style.imageRendering = 'pixelated';
    listBox.appendChild(el('div', {
      class: 'list-item' + (id === selected ? ' active' : ''),
      onclick: () => { selected = id; render(state); },
    }, [
      el('div', { class: 'preview' }, [preview]),
      el('span', {}, sp.name || id),
      id === game.avatar ? el('span', { style: { color: 'var(--amber)' } }, '★') : null,
    ]));
  }
  list.appendChild(listBox);

  list.appendChild(el('div', { class: 'actions' }, [
    el('button', { onclick: () => addSprite(state) }, '+ nuevo'),
    selected ? el('button', { class: 'danger', onclick: () => deleteSprite(state) }, '× borrar') : null,
    selected && selected !== game.avatar
      ? el('button', { onclick: () => { game.avatar = selected; emit('editor:change'); render(state); } }, 'avatar ★')
      : null,
  ]));
  return list;
}

// Canvas grande + color picker + frames + acciones de frame.
function renderEditor(state) {
  const editor = el('div', { class: 'paint' });
  if (!selected) {
    const spriteCount = Object.keys(game.sprites || {}).length;
    const cta = el('div', { class: 'empty-cta' });
    if (spriteCount === 0) {
      cta.appendChild(el('p', {}, 'todavía no hay sprites'));
      cta.appendChild(el('button', { class: 'primary', onclick: () => addSprite(state) }, '+ crear el primero'));
    } else {
      cta.appendChild(el('p', {}, '👈 selecciona uno · o crea uno nuevo'));
      cta.appendChild(el('button', { class: 'primary', onclick: () => addSprite(state) }, '+ nuevo sprite'));
    }
    editor.appendChild(cta);
    return editor;
  }
  const sp = game.sprites[selected];
  if (!sp.frames) sp.frames = [emptyBitmap(game.tileSize)];
  if (activeFrame >= sp.frames.length) activeFrame = 0;

  const palId = getEffectivePalId(state);
  const colors = game.palettes[palId].colors;

  editor.appendChild(el('h2', {}, sp.name || selected));

  // Canvas grande: delega input handling a paint-canvas.js.
  const big = el('canvas', { class: 'paint-canvas' });
  attachPaintCanvas(big, {
    bitmap: sp.frames[activeFrame],
    allFrames: sp.frames,
    frameIdx: activeFrame,
    tileSize: game.tileSize,
    colors,
    colorIndex: sp.colorIndex ?? 1,
    getTool: () => tool,
    getOnionSkin: () => onionSkin,
    getActiveColor: () => activeColor,
    setActiveColor: (c) => { activeColor = c; },
    onToolChanged: () => { tool = 'pencil'; render(state); },
  });
  editor.appendChild(big);

  // Indicador de herramienta + onion (aria-live para screen readers).
  const toolLabel = tool === 'pencil' ? 'lápiz' : tool === 'bucket' ? 'cubo (B)' : 'cuentagotas (I)';
  editor.appendChild(el('div', { class: 'tool-indicator', 'aria-live': 'polite' },
    toolLabel + (onionSkin && sp.frames.length > 1 ? ' · onion (O)' : '')));

  editor.appendChild(renderColorRow(state, colors));
  editor.appendChild(renderPreviewPalette(state, palId));
  editor.appendChild(el('h3', {}, 'frames'));
  editor.appendChild(renderFramesRow(state, sp, colors));
  editor.appendChild(renderFrameActions(state, sp));
  return editor;
}

// Selector de paleta para preview: muestra todas las paletas como botones con
// swatches en miniatura. Click cambia cuál paleta se usa para renderizar el
// sprite (y la lista), sin tocar el JSON. Click en la activa la desactiva
// (vuelve a la paleta default de la room/primera).
function renderPreviewPalette(state, currentPalId) {
  const row = el('div', { class: 'preview-palette' });
  row.appendChild(el('span', { class: 'label' }, 'preview:'));
  for (const palId of Object.keys(game.palettes)) {
    const pal = game.palettes[palId];
    const mini = el('div', { class: 'palette-mini' });
    for (const c of pal.colors.slice(0, 5)) {
      mini.appendChild(el('span', { class: 'palette-mini-color', style: { background: c } }));
    }
    row.appendChild(el('button', {
      class: 'palette-btn' + (palId === currentPalId ? ' active' : ''),
      type: 'button',
      title: pal.name || palId,
      'aria-pressed': palId === currentPalId ? 'true' : 'false',
      onclick: () => {
        previewPalette = (palId === previewPalette) ? null : palId;
        render(state);
      },
    }, [mini, el('span', { class: 'palette-name' }, pal.name || palId)]));
  }
  return row;
}

// Selector de color activo (transparente + N colores de la paleta).
function renderColorRow(state, colors) {
  const row = el('div', { class: 'color-row', role: 'radiogroup', 'aria-label': 'color activo' });
  // Color 0 = transparente (checker pattern como background).
  row.appendChild(el('div', {
    class: 'color-swatch' + (activeColor === 0 ? ' active' : ''),
    style: { background: 'repeating-conic-gradient(#888 0 25%, #ccc 0 50%) 50% / 8px 8px' },
    title: 'transparente',
    role: 'radio',
    tabindex: '0',
    'aria-checked': activeColor === 0 ? 'true' : 'false',
    'aria-label': 'color transparente',
    onclick: () => { activeColor = 0; render(state); },
  }));
  for (let i = 1; i < colors.length; i++) {
    row.appendChild(el('div', {
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
  return row;
}

// Tira de frames clicables (lista horizontal con preview y selección).
function renderFramesRow(state, sp, colors) {
  const row = el('div', { class: 'frames' });
  sp.frames.forEach((f, i) => {
    const fc = el('canvas');
    paintBitmap(fc, f, game.tileSize, colors, sp.colorIndex ?? 1);
    row.appendChild(el('div', {
      class: 'frame' + (i === activeFrame ? ' active' : ''),
      onclick: () => { activeFrame = i; render(state); },
    }, [fc]));
  });
  return row;
}

// + frame (duplica el último) / × frame (borra el activo).
function renderFrameActions(state, sp) {
  return el('div', { class: 'actions' }, [
    el('button', {
      onclick: () => {
        sp.frames.push([...sp.frames[sp.frames.length - 1]]);
        activeFrame = sp.frames.length - 1;
        emit('editor:change');
        render(state);
      },
    }, '+ frame'),
    sp.frames.length > 1 ? el('button', {
      class: 'danger',
      onclick: () => {
        sp.frames.splice(activeFrame, 1);
        activeFrame = 0;
        emit('editor:change');
        render(state);
      },
    }, '× frame') : null,
  ]);
}

// Panel derecho: name/fps/colorIndex + toggles isWall/isItem + textarea script.
function renderProps(state) {
  if (!selected) return [el('div', { class: 'empty' }, 'propiedades del sprite seleccionado aparecen aquí')];
  const sp = game.sprites[selected];
  const out = [el('h2', {}, 'propiedades')];

  addField(out, 'nombre', sp.name || '', v => { sp.name = v; emit('editor:change'); });
  addField(out, 'fps', sp.fps || 2, v => { sp.fps = parseFloat(v); emit('editor:change'); }, 'number');
  addField(out, 'colorIndex', sp.colorIndex ?? 1, v => { sp.colorIndex = parseInt(v, 10); emit('editor:change'); render(state); }, 'number');

  out.push(el('div', { class: 'actions' }, [
    el('button', {
      'aria-pressed': !!sp.isWall,
      onclick: () => { sp.isWall = !sp.isWall; emit('editor:change'); render(state); },
    }, sp.isWall ? '✓ pared' : 'pared'),
    el('button', {
      'aria-pressed': !!sp.isItem,
      onclick: () => { sp.isItem = !sp.isItem; emit('editor:change'); render(state); },
    }, sp.isItem ? '✓ item' : 'item'),
  ]));

  out.push(el('h3', {}, 'script'));
  const ta = el('textarea', {
    placeholder: 'hola{p}{wavy}qué tal{/wavy}',
    oninput: e => { sp.script = e.target.value; emit('editor:change'); },
  });
  ta.value = sp.script || '';
  out.push(el('div', { class: 'field' }, [ta]));
  out.push(el('div', { style: { fontSize: '0.7rem', opacity: 0.6 } },
    'tags: {b} {p} {wavy} {shaky} {color N} {position} {if} ...'));
  return out;
}

// === helpers ===

function addField(parent, label, value, onChange, type = 'text') {
  const inp = el('input', { type, value, oninput: e => onChange(e.target.value) });
  const wrap = el('div', { class: 'field' }, [el('label', {}, label), inp]);
  // parent puede ser un Array (renderProps) o un Element (otros usos).
  if (Array.isArray(parent)) parent.push(wrap);
  else parent.appendChild(wrap);
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
  // Limpia referencias en rooms (evita tiles huérfanos apuntando al sprite borrado).
  for (const room of Object.values(game.rooms)) {
    if (!room.tiles) continue;
    for (let y = 0; y < room.tiles.length; y++) {
      for (let x = 0; x < room.tiles[y].length; x++) {
        if (room.tiles[y][x] === selected) room.tiles[y][x] = null;
      }
    }
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
