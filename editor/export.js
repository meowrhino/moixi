// editor/export.js — exporta el juego como JSON o como HTML standalone.

// Para el HTML standalone necesitamos meter TODO el código del runtime inline.
// La forma más limpia: bundle de todos los módulos en un solo string.
// Aquí lo hacemos con fetches de los mismos archivos del proyecto.

const RUNTIME_FILES = [
  'core/bus.js',
  'core/state.js',
  'core/loop.js',
  'core/loader.js',
  'core/index.js',
  'modules/render/canvas.js',
  'modules/render/palettes.js',
  'modules/render/sprites.js',
  'modules/render/camera.js',
  'modules/render/lighting.js',
  'modules/render/layers.js',
  'modules/render/particles.js',
  'modules/render/screenshot.js',
  'modules/input/keyboard.js',
  'modules/input/touch.js',
  'modules/input/mover.js',
  'modules/gameplay/walls.js',
  'modules/gameplay/interactable.js',
  'modules/gameplay/dialog.js',
  'modules/gameplay/inventory.js',
  'modules/gameplay/world.js',
  'modules/gameplay/transitions.js',
  'modules/script/mosi.js',
  'modules/script/stdlib.js',
  'modules/script/vars.js',
  'modules/audio/beeps.js',
  'modules/persistence/save.js',
];

export function downloadJSON(game) {
  const data = JSON.stringify(game, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(game.name || 'game').toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportHTML(game) {
  // Lee todos los archivos y los une como ES modules con import-map alias.
  // Más simple: usa el HTML de play.html con todos los módulos ya importados, y embebe el JSON.
  // Para que funcione standalone (file://), inlineamos todo y reescribimos los imports.

  const files = {};
  for (const path of RUNTIME_FILES) {
    files[path] = await fetch('./' + path).then(r => r.text());
  }
  const styleCSS = await fetch('./style.css').then(r => r.text());

  // Cada módulo se inlinea como data: URL (autocontenida: sobrevive a file://
  // y a cerrar el editor — un blob URL muere con el documento que lo creó).
  // Los imports internos se reescriben ANTES de codificar, así que hay que
  // procesar en orden de dependencias: RUNTIME_FILES ya lista el core primero
  // (bus/state/loop/loader/index) y los módulos —que no se importan entre sí—
  // después.
  const toDataURL = (code) =>
    'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(code)));

  const moduleURLs = {};

  // Re-escribir los imports relativos de un módulo a las data URLs ya generadas.
  function rewrite(code, currentPath) {
    return code.replace(/from\s+['"](\.\.?\/[^'"]+)['"]/g, (_, rel) => {
      const resolved = resolveRelative(currentPath, rel);
      const url = moduleURLs[resolved];
      if (!url) console.warn(`[export] no map for ${rel} from ${currentPath}`);
      return `from "${url || rel}"`;
    });
  }

  function resolveRelative(from, rel) {
    const fromParts = from.split('/').slice(0, -1);
    const relParts = rel.split('/');
    for (const p of relParts) {
      if (p === '..') fromParts.pop();
      else if (p !== '.') fromParts.push(p);
    }
    return fromParts.join('/');
  }

  // Codificar en orden de dependencias (ver arriba)
  for (const path of RUNTIME_FILES) {
    moduleURLs[path] = toDataURL(rewrite(files[path], path));
  }
  const finalURLs = moduleURLs;

  // El bootstrap script: importa de los blobs
  const bootstrapCode = `
    import core from "${finalURLs['core/index.js']}";
    import canvasMod from "${finalURLs['modules/render/canvas.js']}";
    import palettes from "${finalURLs['modules/render/palettes.js']}";
    import sprites from "${finalURLs['modules/render/sprites.js']}";
    import camera from "${finalURLs['modules/render/camera.js']}";
    import lighting from "${finalURLs['modules/render/lighting.js']}";
    import layers from "${finalURLs['modules/render/layers.js']}";
    import particles from "${finalURLs['modules/render/particles.js']}";
    import screenshot from "${finalURLs['modules/render/screenshot.js']}";
    import keyboard from "${finalURLs['modules/input/keyboard.js']}";
    import touch from "${finalURLs['modules/input/touch.js']}";
    import mover from "${finalURLs['modules/input/mover.js']}";
    import walls from "${finalURLs['modules/gameplay/walls.js']}";
    import interactable from "${finalURLs['modules/gameplay/interactable.js']}";
    import dialog from "${finalURLs['modules/gameplay/dialog.js']}";
    import inventory from "${finalURLs['modules/gameplay/inventory.js']}";
    import world from "${finalURLs['modules/gameplay/world.js']}";
    import transitions from "${finalURLs['modules/gameplay/transitions.js']}";
    import script from "${finalURLs['modules/script/mosi.js']}";
    import stdlib from "${finalURLs['modules/script/stdlib.js']}";
    import vars from "${finalURLs['modules/script/vars.js']}";
    import audio from "${finalURLs['modules/audio/beeps.js']}";
    import save from "${finalURLs['modules/persistence/save.js']}";

    const game = ${JSON.stringify(game)};
    core.load(game);
    core.use(canvasMod).use(palettes).use(sprites).use(layers)
      .use(camera).use(lighting).use(particles).use(screenshot)
      .use(keyboard).use(touch).use(mover)
      .use(walls).use(interactable).use(script).use(stdlib).use(vars)
      .use(dialog).use(inventory).use(world).use(transitions)
      .use(audio).use(save);

    // igual que play.html: un frame estático de preview, y el juego arranca
    // de verdad (gameStart + roomEnter/música) con el primer input
    {
      const t0 = performance.now();
      for (const ev of ['render:bg', 'render:tiles', 'render:sprites', 'render:fg', 'render:ui', 'render:final']) {
        core.bus.emit(ev, { dt: 0, t: t0 });
      }
    }
    const overlay = document.getElementById('play-overlay');
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      overlay?.classList.add('hidden');
      document.querySelector('.canvas-wrap')?.classList.add('playing');
      window.removeEventListener('keydown', begin);
      overlay?.removeEventListener('click', begin);
      core.bus.emit('roomEnter', { roomId: game.startRoom });
      core.start();
    };
    window.addEventListener('keydown', begin);
    overlay?.addEventListener('click', begin);
    for (const ev of ['input:up', 'input:down', 'input:left', 'input:right', 'input:action']) {
      core.bus.on(ev, begin);
    }
  `;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHTML(game.name || 'mosi game')}</title>
<style>${styleCSS}</style>
<style>
  body { display: grid; place-items: center; min-height: 100vh; padding: 2vh; }
  .player { display: grid; gap: 1rem; width: min(100%, 640px); text-align: center; }
  [data-mosi-canvas] { width: 100%; }
</style>
</head>
<body>
<div class="player">
  <header style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:2px solid var(--ink); padding-bottom:0.4rem;">
    <h1>${escapeHTML(game.name || 'mosi')}</h1>
    <span style="font-size:0.75rem; opacity:0.6;">↑↓←→ + space</span>
  </header>
  <div class="canvas-wrap">
    <canvas data-mosi-canvas></canvas>
    <div class="play-overlay" id="play-overlay" role="button" tabindex="0" aria-label="empezar a jugar">
      <span class="overlay-text">click o teclas para jugar</span>
    </div>
  </div>
  <div style="font-size:0.75rem; opacity:0.5;">made with <a href="https://github.com/meowrhino/moixi" style="color:inherit">moixi</a> · inspirado en <a href="https://zenzoa.itch.io/mosi" style="color:inherit">mosi</a></div>
</div>
<script type="module">
${bootstrapCode}
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(game.name || 'game').toLowerCase().replace(/\s+/g, '-')}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function importJSON(onLoad) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    const text = await file.text();
    try { onLoad(JSON.parse(text)); }
    catch (e) { alert('JSON inválido: ' + e.message); }
  };
  inp.click();
}
