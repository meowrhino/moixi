// editor/shortcuts.js — atajos teclado globales del editor.
// Emite eventos editor:shortcut:* via el bus de ui.js. Cada panel/módulo decide
// si responde según el tab activo.

import { emit, on } from './ui.js';

const TABS = ['world', 'sprite', 'palette', 'play'];

// Cada binding: { key, meta?, shift?, alt?, when?, event, payload? }
// when: 'always' (default) | 'no-input' (ignora si focus en input/textarea)
const bindings = [
  { key: '1', event: 'editor:shortcut:tab', payload: 'world' },
  { key: '2', event: 'editor:shortcut:tab', payload: 'sprite' },
  { key: '3', event: 'editor:shortcut:tab', payload: 'palette' },
  { key: '4', event: 'editor:shortcut:tab', payload: 'play' },
  { key: '+', event: 'editor:shortcut:add' },
  { key: '=', event: 'editor:shortcut:add' },
  { key: '-', event: 'editor:shortcut:remove' },
  { key: 'Backspace', event: 'editor:shortcut:remove' },
  { key: ' ', event: 'editor:shortcut:play' },
  { key: 'b', event: 'editor:shortcut:bucket' },
  { key: 'i', event: 'editor:shortcut:eyedropper' },
  { key: 'o', event: 'editor:shortcut:onion' },
  { key: 'z', meta: true, event: 'editor:shortcut:undo' },
  { key: 'z', meta: true, shift: true, event: 'editor:shortcut:redo' },
  { key: 'y', meta: true, event: 'editor:shortcut:redo' },
  { key: '?', event: 'editor:shortcut:help' },
];

const ROWS = [
  ['1 2 3 4', 'cambiar tab (world / sprite / palette / play)'],
  ['+', 'nuevo item (sprite, room, paleta…)'],
  ['- / ⌫', 'borrar item seleccionado'],
  ['espacio', 'play / restart preview'],
  ['B', 'bucket fill'],
  ['I', 'eyedropper'],
  ['O', 'onion skin (frame anterior)'],
  ['⌘Z / Ctrl+Z', 'undo'],
  ['⌘⇧Z / ⌘Y', 'redo'],
  ['?', 'este menú'],
];

function matches(e, b) {
  const t = e.target;
  // No interceptar teclas mientras escribes en un input/textarea/select.
  // Excepción: cmd+z/cmd+y deben funcionar incluso dentro de inputs (es behaviour estándar).
  if (t.matches?.('input, textarea, select')) {
    if (!b.meta) return false;
  }
  if (e.key !== b.key) return false;
  const wantMeta = !!b.meta;
  const hasMeta = e.metaKey || e.ctrlKey;
  if (wantMeta !== hasMeta) return false;
  const wantShift = !!b.shift;
  if (wantShift !== e.shiftKey) {
    // Permitir shift en teclas como '?' o '+' que requieren shift en algunos layouts.
    if (b.key !== '?' && b.key !== '+') return false;
  }
  return true;
}

let cheatsheetEl = null;
function toggleCheatsheet() {
  if (cheatsheetEl) { cheatsheetEl.remove(); cheatsheetEl = null; return; }
  cheatsheetEl = document.createElement('div');
  cheatsheetEl.className = 'cheatsheet';
  cheatsheetEl.innerHTML = `
    <div class="cheatsheet-head">
      <strong>atajos teclado</strong>
      <button class="cheatsheet-close" aria-label="cerrar">×</button>
    </div>
    <dl>${ROWS.map(([k, d]) => `<dt><kbd>${k}</kbd></dt><dd>${d}</dd>`).join('')}</dl>
  `;
  cheatsheetEl.querySelector('.cheatsheet-close').onclick = () => toggleCheatsheet();
  document.body.appendChild(cheatsheetEl);
}

export function setupShortcuts() {
  window.addEventListener('keydown', (e) => {
    for (const b of bindings) {
      if (matches(e, b)) {
        e.preventDefault();
        if (b.event === 'editor:shortcut:help') toggleCheatsheet();
        else emit(b.event, b.payload);
        return;
      }
    }
  });

  // Botón flotante "?" en esquina para discoverability del cheatsheet
  const btn = document.createElement('button');
  btn.className = 'shortcut-hint';
  btn.title = 'atajos teclado (?)';
  btn.textContent = '?';
  btn.onclick = toggleCheatsheet;
  document.body.appendChild(btn);

  // También cerrar con Escape
  on('editor:shortcut:cancel', () => cheatsheetEl && toggleCheatsheet());
}
