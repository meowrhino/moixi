// modules/render/canvas.js — gestión del canvas y pintado pixel-perfect.
// Crea un canvas "lógico" pequeño (ej. 128x128) y lo escala al DOM con CSS.

let core = null;
let ctx = null;
let canvasEl = null;
let logicalW = 128;
let logicalH = 128;

export default {
  name: 'canvas',
  version: '1.0.0',
  deps: [],

  setup(c) {
    core = c;
    const game = core.state.game;
    const tileSize = game?.tileSize ?? 8;
    const [rw, rh] = game?.roomSize ?? [16, 16];
    logicalW = tileSize * rw;
    logicalH = tileSize * rh;

    canvasEl = document.querySelector('[data-mosi-canvas]')
      || (() => {
        const c = document.createElement('canvas');
        c.dataset.mosiCanvas = '';
        document.body.appendChild(c);
        return c;
      })();

    canvasEl.width = logicalW;
    canvasEl.height = logicalH;
    canvasEl.style.imageRendering = 'pixelated';
    canvasEl.style.width = '100%';
    canvasEl.style.maxWidth = 'min(100vmin, 640px)';
    canvasEl.style.aspectRatio = `${logicalW}/${logicalH}`;

    ctx = canvasEl.getContext('2d');
    ctx.imageSmoothingEnabled = false;
  },

  hooks: {
    'render:bg': () => {
      // Limpia con el color de fondo de la paleta actual si existe; si no, negro.
      const pal = core.api.palettes?.current?.();
      ctx.fillStyle = pal?.colors?.[0] ?? '#000';
      ctx.fillRect(0, 0, logicalW, logicalH);
    },
  },

  api: {
    ctx() { return ctx; },
    el() { return canvasEl; },
    size() { return { w: logicalW, h: logicalH }; },
    pixel(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    },
    fillRect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    },
  },
};
