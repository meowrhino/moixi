// editor/editor.js — controlador principal del editor.
// Gestiona tabs, carga del JSON, autosave en localStorage, comunicación con paneles.

import worldPanel from './panels/world.js';
import spritePanel from './panels/sprite.js';
import palettePanel from './panels/palette.js';
import playPanel from './panels/play.js';
import { downloadJSON, exportHTML, importJSON } from './export.js';
import { on as onEditorEv } from './ui.js';
import { setupShortcuts } from './shortcuts.js';
import { setupUndo, clearHistory } from './undo.js';

const PANELS = {
  world: worldPanel,
  sprite: spritePanel,
  palette: palettePanel,
  play: playPanel,
};

const AUTOSAVE_KEY = 'mosi:editor:game';

const state = {
  game: null,
  activeTab: 'world',
  fileName: 'untitled.json',
  dirty: false,
};

function $(sel) { return document.querySelector(sel); }

function setupLayout() {
  document.body.innerHTML = `
    <header class="toolbar">
      <span class="brand"><img class="mascot alive" src="./assets/mascot.svg" alt=""> moixi</span>
      <div class="tabs" id="tabs" role="tablist" aria-label="paneles del editor"></div>
      <span class="spacer"></span>
      <span class="file-name" id="file-name">${state.fileName}</span>
      <button id="btn-import" aria-label="cargar juego desde archivo">cargar</button>
      <button id="btn-export-json" aria-label="descargar como json">json</button>
      <button id="btn-export-html" class="primary" aria-label="exportar como html standalone">exportar html</button>
    </header>
    <div class="workspace">
      <aside class="panel left" id="panel-left"></aside>
      <main class="panel center" id="panel-center"></main>
      <aside class="panel right" id="panel-right"></aside>
    </div>
    <div class="statusbar">
      <span id="status-msg">listo</span>
      <span class="spacer" style="flex:1"></span>
      <span id="status-dirty"></span>
      <span style="opacity:0.5">▮ meowrhino studio · inspirado en <a href="https://zenzoa.itch.io/mosi" target="_blank" style="color:inherit">mosi</a></span>
    </div>
  `;

  // tabs
  const tabsEl = $('#tabs');
  for (const [id, p] of Object.entries(PANELS)) {
    const b = document.createElement('button');
    b.className = 'tab' + (id === state.activeTab ? ' active' : '');
    b.textContent = p.label || id;
    b.onclick = () => switchTab(id);
    b.dataset.tab = id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', id === state.activeTab ? 'true' : 'false');
    b.setAttribute('aria-label', `tab ${p.label || id} (tecla ${Object.keys(PANELS).indexOf(id) + 1})`);
    tabsEl.appendChild(b);
  }

  $('#btn-import').onclick = () => importJSON(g => loadGame(g, 'imported.json'));
  $('#btn-export-json').onclick = () => downloadJSON(state.game);
  $('#btn-export-html').onclick = async () => {
    setStatus('generando HTML…');
    await exportHTML(state.game);
    setStatus('html exportado ✓');
  };
}

function switchTab(id) {
  state.activeTab = id;
  for (const btn of document.querySelectorAll('.tab')) {
    const active = btn.dataset.tab === id;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }
  rerender();
}

function rerender() {
  const panel = PANELS[state.activeTab];
  if (!panel) return;
  // reset slots: cada panel necesita data-panel="<name>" y data-panel="<rightPanelSelector>"
  $('#panel-left').replaceChildren();
  $('#panel-left').setAttribute('data-panel', panel.name);
  $('#panel-right').replaceChildren();
  $('#panel-right').setAttribute('data-panel', panel.rightPanelSelector || panel.name);
  panel.render(state);
}

function loadGame(g, fileName = 'untitled.json') {
  state.game = g;
  state.fileName = fileName;
  state.dirty = false;
  $('#file-name').textContent = fileName;
  clearHistory();
  rerender();
}

function setStatus(msg) {
  const e = $('#status-msg');
  if (e) e.textContent = msg;
  setTimeout(() => { if (e && e.textContent === msg) e.textContent = 'listo'; }, 2500);
}

// Autosave: cada cambio del editor escribe el JSON en localStorage.
onEditorEv('editor:change', () => {
  state.dirty = true;
  $('#status-dirty').textContent = '● sin guardar';
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state.game));
  } catch {}
  // si estamos en world o sprite o palette, re-render para reflejar
  if (['world', 'sprite', 'palette'].includes(state.activeTab)) {
    // throttle implícito: el re-render es síncrono, evitamos hacerlo desde onChange
    // de un input para no romper el cursor. Solo reflejamos previews al hacer pointerup.
  }
});

// Aviso al cerrar pestaña si hay cambios sin exportar (el autosave puede fallar:
// modo incógnito, quota llena, otro origin). El prompt usa el texto nativo del browser.
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

function setupDragDrop() {
  let dragCounter = 0;
  let overlay = null;
  const show = () => {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'drop-overlay';
    overlay.textContent = 'soltar para cargar .json';
    document.body.appendChild(overlay);
  };
  const hide = () => { overlay?.remove(); overlay = null; };

  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragCounter++;
    if (dragCounter === 1) show();
  });
  window.addEventListener('dragleave', () => {
    if (--dragCounter <= 0) { dragCounter = 0; hide(); }
  });
  window.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0; hide();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.name.endsWith('.json')) {
      setStatus('arrastra un .json');
      return;
    }
    try {
      const text = await file.text();
      loadGame(JSON.parse(text), file.name);
      setStatus(`cargado ${file.name}`);
    } catch (err) {
      alert('JSON inválido: ' + err.message);
    }
  });
}

function showSplash() {
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="splash" id="splash" aria-hidden="true">
      <img class="mascot xl" src="./assets/mascot.svg" alt="">
      <h1 class="splash-name">moixi</h1>
      <div class="splash-tag">editor</div>
    </div>
  `);
  // Alinea con el fin de la CSS animation (0.5s delay + 0.45s = ~0.95s).
  setTimeout(() => document.getElementById('splash')?.remove(), 1000);
}

// Atajos teclado globales — el panel activo recibe add/remove via PANELS[active].onAdd/onRemove
onEditorEv('editor:shortcut:tab', (tab) => { if (PANELS[tab]) switchTab(tab); });
onEditorEv('editor:shortcut:add', () => {
  const p = PANELS[state.activeTab];
  if (p?.onAdd) p.onAdd(state);
});
onEditorEv('editor:shortcut:remove', () => {
  const p = PANELS[state.activeTab];
  if (p?.onRemove) p.onRemove(state);
});
onEditorEv('editor:shortcut:play', () => {
  if (state.activeTab !== 'play') switchTab('play');
  const p = PANELS.play;
  if (p?.onPlay) p.onPlay(state);
});

// Re-render externo (emitido por undo/redo tras aplicar snapshot)
onEditorEv('editor:rerender', () => {
  state.dirty = true;
  $('#status-dirty').textContent = '● sin guardar';
  try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state.game)); } catch {}
  rerender();
});

async function bootstrap() {
  setupLayout();
  setupDragDrop();
  setupShortcuts();
  setupUndo(state);
  showSplash();

  // Intentar restaurar autosave
  let game = null;
  const autosaved = localStorage.getItem(AUTOSAVE_KEY);
  if (autosaved) {
    try { game = JSON.parse(autosaved); } catch {}
  }
  if (!game) {
    game = await fetch('./examples/garden.json').then(r => r.json());
  }
  loadGame(game, autosaved ? 'autosaved.json' : 'garden.json');
}

bootstrap();
