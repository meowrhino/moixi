// editor/ui.js — utilidades compartidas entre paneles del editor.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  }
  return node;
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

// Pinta un sprite frame en un canvas, dado el bitmap, el tileSize y los colores.
export function paintBitmap(canvas, bitmap, tileSize, colors, colorIndex = 1) {
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = colors[0] || '#000';
  ctx.fillRect(0, 0, tileSize, tileSize);
  ctx.fillStyle = colors[colorIndex] || '#fff';
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      if (bitmap[y * tileSize + x]) ctx.fillRect(x, y, 1, 1);
    }
  }
}

// Bus simple de eventos del editor (independiente del bus del runtime).
const editorListeners = new Map();
export function on(event, fn) {
  if (!editorListeners.has(event)) editorListeners.set(event, new Set());
  editorListeners.get(event).add(fn);
  return () => editorListeners.get(event)?.delete(fn);
}
export function emit(event, payload) {
  for (const fn of editorListeners.get(event) || []) fn(payload);
}

// Empty bitmap helper
export function emptyBitmap(tileSize) {
  return new Array(tileSize * tileSize).fill(0);
}

// Crea un dataURL pequeño con el sprite (para previews y favicons)
export function spriteToDataURL(sprite, tileSize, colors) {
  const c = document.createElement('canvas');
  paintBitmap(c, sprite.frames?.[0] || emptyBitmap(tileSize), tileSize, colors, sprite.colorIndex ?? 1);
  return c.toDataURL();
}
