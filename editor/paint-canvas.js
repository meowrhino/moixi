// editor/paint-canvas.js — handlers de pintado para el canvas pixel-art del editor.
// Aislado de sprite.js para que cualquier panel (sprites, font editor futuro, etc.)
// pueda reusar la misma mecánica de pencil/bucket/eyedropper/onion skin sin duplicar lógica.
//
// El módulo no mantiene state propio: recibe getters/setters como opts y emite
// 'editor:change' tras cada mutación del bitmap. Eso lo deja libre de ser invocado
// desde cualquier panel con su propio estado.

import { emit } from './ui.js';

/**
 * Configura un <canvas> como editor de pixel-art.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @param {number[]} opts.bitmap            frame actual (array plano, mutado in-place)
 * @param {number[][]} opts.allFrames       todos los frames del sprite (para onion skin)
 * @param {number} opts.frameIdx            índice del frame actual
 * @param {number} opts.tileSize            ancho/alto del frame en píxeles
 * @param {string[]} opts.colors            paleta del room (CSS colors)
 * @param {number} opts.colorIndex          índice del color "encendido" del sprite
 * @param {() => 'pencil'|'bucket'|'eyedropper'} opts.getTool
 * @param {() => boolean} opts.getOnionSkin
 * @param {() => number} opts.getActiveColor
 * @param {(c: number) => void} opts.setActiveColor
 * @param {() => void} [opts.onToolChanged] llamado tras eyedrop (tool vuelve a pencil)
 * @returns {{ redraw: () => void }}
 */
export function attachPaintCanvas(canvas, opts) {
  const {
    bitmap, allFrames, frameIdx, tileSize, colors, colorIndex,
    getTool, getOnionSkin, getActiveColor, setActiveColor, onToolChanged,
  } = opts;

  canvas.width = tileSize;
  canvas.height = tileSize;
  canvas.setAttribute('data-tool', getTool());
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const draw = () => {
    ctx.fillStyle = colors[0] || '#000';
    ctx.fillRect(0, 0, tileSize, tileSize);
    // Onion skin: pinta el frame previo en alpha 0.2 antes del actual.
    if (getOnionSkin() && frameIdx > 0 && allFrames[frameIdx - 1]) {
      paintBits(ctx, allFrames[frameIdx - 1], tileSize, colors[colorIndex] || '#fff', 0.2);
    }
    paintBits(ctx, bitmap, tileSize, colors[colorIndex] || '#fff', 1);
  };
  draw();

  // Traduce un PointerEvent a coordenadas de tile (relativas al canvas, no al CSS).
  const eventXY = (e) => {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.floor((e.clientX - rect.left) / rect.width * tileSize),
      Math.floor((e.clientY - rect.top) / rect.height * tileSize),
    ];
  };
  const inBounds = (x, y) => x >= 0 && x < tileSize && y >= 0 && y < tileSize;

  // === herramientas ===

  const setPixel = (x, y) => {
    if (!inBounds(x, y)) return;
    const idx = y * tileSize + x;
    const c = getActiveColor();
    if (bitmap[idx] === c) return;     // no-op: evita emitir editor:change espurio
    bitmap[idx] = c;
    draw();
    emit('editor:change');
  };

  // Flood fill BFS desde (sx, sy). Reemplaza el color contiguo por activeColor.
  // 4-connected (no diagonal). Para tilesize 8 el peor caso es 64 nodos: trivial.
  const floodFill = (sx, sy) => {
    if (!inBounds(sx, sy)) return;
    const target = bitmap[sy * tileSize + sx];
    const c = getActiveColor();
    if (target === c) return;
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.shift();
      if (!inBounds(x, y) || bitmap[y * tileSize + x] !== target) continue;
      bitmap[y * tileSize + x] = c;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    draw();
    emit('editor:change');
  };

  // Eyedropper: lee el color del píxel y vuelve a pencil (UX estándar).
  const eyedrop = (x, y) => {
    if (!inBounds(x, y)) return;
    setActiveColor(bitmap[y * tileSize + x]);
    onToolChanged?.();
  };

  // === eventos ===

  let painting = false;
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = eventXY(e);
    const t = getTool();
    if (t === 'bucket') return floodFill(x, y);
    if (t === 'eyedropper') return eyedrop(x, y);
    painting = true;
    setPixel(x, y);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!painting || getTool() !== 'pencil') return;
    setPixel(...eventXY(e));
  });
  canvas.addEventListener('pointerup', (e) => {
    painting = false;
    canvas.releasePointerCapture?.(e.pointerId);
  });

  return { redraw: draw };
}

// Pinta los píxeles de un bitmap sobre ctx, con color y alpha dados.
// Estructura: array plano de tileSize*tileSize, 0=fondo, !=0=pintado.
function paintBits(ctx, bitmap, tileSize, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      if (bitmap[y * tileSize + x]) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}
