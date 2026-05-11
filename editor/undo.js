// editor/undo.js — undo/redo global del editor.
// Snapshot deep-clone de state.game en cada editor:change, max 50 snapshots.
// El truco: guardar el snapshot ANTERIOR al cambio (lastSnap), no el actual,
// porque editor:change se emite DESPUÉS de mutar game.

import { emit, on } from './ui.js';

const MAX = 50;
const past = [];
const future = [];
let editorState = null;
let lastSnap = null;
let applying = false;

function clone() { return JSON.parse(JSON.stringify(editorState.game)); }
function apply(snap) {
  // Mutar in-place para no romper referencias que los panels guardan.
  for (const k of Object.keys(editorState.game)) delete editorState.game[k];
  Object.assign(editorState.game, snap);
}

function pushSnapshot() {
  if (applying || !editorState?.game) return;
  if (!lastSnap) { lastSnap = clone(); return; }
  past.push(lastSnap);
  if (past.length > MAX) past.shift();
  future.length = 0;
  lastSnap = clone();
}

function undo() {
  if (!past.length || !editorState?.game) return;
  applying = true;
  future.push(lastSnap);
  lastSnap = past.pop();
  apply(lastSnap);
  applying = false;
  emit('editor:rerender');
}

function redo() {
  if (!future.length || !editorState?.game) return;
  applying = true;
  past.push(lastSnap);
  lastSnap = future.pop();
  apply(lastSnap);
  applying = false;
  emit('editor:rerender');
}

export function clearHistory() {
  past.length = 0;
  future.length = 0;
  lastSnap = editorState?.game ? clone() : null;
}

export function setupUndo(state) {
  editorState = state;
  on('editor:change', pushSnapshot);
  on('editor:shortcut:undo', undo);
  on('editor:shortcut:redo', redo);
}
