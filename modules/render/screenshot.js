// modules/render/screenshot.js — captura el canvas a PNG y lo descarga.
// Sin dependencias. API: core.api.screenshot.png() descarga + devuelve dataURL;
// dataURL() solo devuelve sin descargar. ScriptFn {screenshot} dispara descarga.

let core = null;

function downloadDataURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 0);
}

function timestampedFilename(game) {
  const base = (game?.name || 'moixi').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const t = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${base}-${t}.png`;
}

export default {
  name: 'screenshot',
  version: '1.0.0',
  deps: ['canvas'],
  schema: {},

  setup(c) { core = c; },

  scriptFns: {
    'screenshot': () => {
      const url = core.api.canvas.el().toDataURL('image/png');
      downloadDataURL(url, timestampedFilename(core.state.game));
    },
  },

  api: {
    png() {
      const url = core.api.canvas.el().toDataURL('image/png');
      downloadDataURL(url, timestampedFilename(core.state.game));
      return url;
    },
    dataURL() {
      return core.api.canvas.el().toDataURL('image/png');
    },
  },
};
