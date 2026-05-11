// editor/panels/palette.js — editor de paletas y colores.

import { el, uid, emit } from '../ui.js';

let game;
let selected = null;

function render(state) {
  game = state.game;
  if (!selected) selected = Object.keys(game.palettes)[0];

  // LEFT: lista
  const left = document.querySelector('[data-panel="palette"]');
  left.innerHTML = '';
  left.appendChild(el('h2', {}, 'palettes'));

  const list = el('div', { class: 'list' });
  for (const [id, pal] of Object.entries(game.palettes)) {
    const swatchRow = el('div', { style: { display: 'flex', gap: '2px' } });
    for (const c of pal.colors) {
      swatchRow.appendChild(el('div', {
        style: { width: '12px', height: '20px', background: c, border: '1px solid var(--ink)' },
      }));
    }
    list.appendChild(el('div', {
      class: 'list-item' + (id === selected ? ' active' : ''),
      onclick: () => { selected = id; render(state); },
    }, [
      el('span', {}, pal.name || id),
      swatchRow,
    ]));
  }
  left.appendChild(list);
  left.appendChild(el('div', { class: 'actions' }, [
    el('button', { onclick: () => addPalette(state) }, '+ paleta'),
    selected && Object.keys(game.palettes).length > 1
      ? el('button', { class: 'danger', onclick: () => removePalette(state) }, '× borrar')
      : null,
  ]));

  // CENTER: color editor grande
  const center = document.querySelector('.panel.center');
  center.innerHTML = '';
  if (selected && game.palettes[selected]) {
    const pal = game.palettes[selected];
    const editor = el('div', { class: 'paint' });
    editor.appendChild(el('h2', {}, pal.name || selected));

    addField(editor, 'nombre', pal.name || '', v => { pal.name = v; emit('editor:change'); render(state); });

    editor.appendChild(el('h3', {}, 'colores'));
    const row = el('div', { style: { display: 'grid', gap: '0.4rem' } });
    pal.colors.forEach((color, i) => {
      const swatch = el('div', { style: {
        width: '60px', height: '60px', background: color,
        border: '1.5px solid var(--ink)',
      } });
      const input = el('input', {
        type: 'color', value: color,
        oninput: e => { pal.colors[i] = e.target.value; swatch.style.background = e.target.value; emit('editor:change'); },
      });
      const label = el('span', {}, i === 0 ? 'fondo' : `color ${i}`);
      const rmBtn = pal.colors.length > 2 ? el('button', {
        class: 'danger',
        onclick: () => { pal.colors.splice(i, 1); emit('editor:change'); render(state); }
      }, '×') : null;
      row.appendChild(el('div', {
        style: { display: 'flex', gap: '0.6rem', alignItems: 'center' }
      }, [swatch, input, label, rmBtn]));
    });
    editor.appendChild(row);
    editor.appendChild(el('div', { class: 'actions' }, [
      el('button', {
        onclick: () => { pal.colors.push('#888888'); emit('editor:change'); render(state); }
      }, '+ color'),
    ]));
    center.appendChild(editor);
  }

  // RIGHT
  const right = document.querySelector('[data-panel="palette-props"]');
  right.innerHTML = '';
  right.appendChild(el('h2', {}, 'songs'));
  right.appendChild(el('div', { style: { fontSize: '0.75rem', opacity: 0.7 } },
    'edita en el JSON exportado (próximamente: tracker visual)'));
  for (const [id, song] of Object.entries(game.songs || {})) {
    right.appendChild(el('div', { class: 'list-item' }, [
      el('span', {}, song.name || id),
      el('span', { style: { fontSize: '0.7rem', opacity: 0.6 } }, `${song.notes?.length || 0} notas`),
    ]));
  }
}

function addField(parent, label, value, onChange) {
  parent.appendChild(el('div', { class: 'field' }, [
    el('label', {}, label),
    el('input', { type: 'text', value, oninput: e => onChange(e.target.value) }),
  ]));
}

function addPalette(state) {
  const id = uid('pal');
  game.palettes[id] = { name: 'nueva', colors: ['#000000', '#888888', '#ffffff'] };
  selected = id;
  emit('editor:change');
  render(state);
}

function removePalette(state) {
  if (!confirm(`¿borrar ${selected}?`)) return;
  delete game.palettes[selected];
  for (const room of Object.values(game.rooms)) {
    if (room.palette === selected) room.palette = Object.keys(game.palettes)[0];
  }
  selected = Object.keys(game.palettes)[0];
  emit('editor:change');
  render(state);
}

export default {
  name: 'palette',
  label: 'paletas',
  render,
  rightPanelSelector: 'palette-props',
};
