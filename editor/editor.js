// editor/editor.js — controlador principal del editor.
// Gestiona tabs, carga del JSON, autosave en localStorage, comunicación con paneles.

import worldPanel from './panels/world.js';
import spritePanel from './panels/sprite.js';
import palettePanel from './panels/palette.js';
import playPanel from './panels/play.js';
import { downloadJSON, exportHTML, importJSON } from './export.js';
import { on as onEditorEv } from './ui.js';

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
      <div class="tabs" id="tabs"></div>
      <span class="spacer"></span>
      <span class="file-name" id="file-name">${state.fileName}</span>
      <button id="btn-import">cargar</button>
      <button id="btn-export-json">json</button>
      <button id="btn-export-html" class="primary">exportar html</button>
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
    btn.classList.toggle('active', btn.dataset.tab === id);
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

async function bootstrap() {
  setupLayout();

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
