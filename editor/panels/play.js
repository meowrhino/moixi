// editor/panels/play.js — preview en vivo del juego dentro del editor.
// Carga el motor en un canvas pequeño y permite testar.

import { el, emit } from '../ui.js';

let runningCore = null;

async function startPreview(state) {
  if (runningCore) {
    runningCore.stop();
    // limpiar listeners y reset
    runningCore.bus.clear();
  }

  // imports dinámicos para reset
  const T = Date.now();
  const im = (p) => import(`${p}?t=${T}`);
  const [
    coreMod, canvasMod, palettes, sprites, camera, lighting, layers, particles, screenshot,
    keyboard, touch, mover,
    walls, interactable, dialog, inventory, world, transitions,
    script, stdlib, vars, audio, save,
  ] = await Promise.all([
    im('../../core/index.js'),
    im('../../modules/render/canvas.js'),
    im('../../modules/render/palettes.js'),
    im('../../modules/render/sprites.js'),
    im('../../modules/render/camera.js'),
    im('../../modules/render/lighting.js'),
    im('../../modules/render/layers.js'),
    im('../../modules/render/particles.js'),
    im('../../modules/render/screenshot.js'),
    im('../../modules/input/keyboard.js'),
    im('../../modules/input/touch.js'),
    im('../../modules/input/mover.js'),
    im('../../modules/gameplay/walls.js'),
    im('../../modules/gameplay/interactable.js'),
    im('../../modules/gameplay/dialog.js'),
    im('../../modules/gameplay/inventory.js'),
    im('../../modules/gameplay/world.js'),
    im('../../modules/gameplay/transitions.js'),
    im('../../modules/script/mosi.js'),
    im('../../modules/script/stdlib.js'),
    im('../../modules/script/vars.js'),
    im('../../modules/audio/beeps.js'),
    im('../../modules/persistence/save.js'),
  ]);

  const c = coreMod.default;
  // clonar el game data para no mutar el del editor
  const gameClone = JSON.parse(JSON.stringify(state.game));
  c.load(gameClone);

  c.use(canvasMod.default).use(palettes.default).use(sprites.default).use(layers.default)
    .use(camera.default).use(lighting.default).use(particles.default).use(screenshot.default)
    .use(keyboard.default).use(touch.default).use(mover.default)
    .use(walls.default).use(interactable.default).use(script.default).use(stdlib.default).use(vars.default)
    .use(dialog.default).use(inventory.default).use(world.default).use(transitions.default)
    .use(audio.default).use(save.default);

  c.bus.emit('roomEnter', { roomId: gameClone.startRoom });
  c.start();
  runningCore = c;
}

function render(state) {
  const center = document.querySelector('.panel.center');
  center.innerHTML = '';
  const wrapper = el('div', { style: { display: 'grid', gap: '1rem', placeItems: 'center', width: '100%' } });

  const canvasHost = el('div');
  canvasHost.innerHTML = '<canvas data-mosi-canvas></canvas>';
  wrapper.appendChild(canvasHost);

  wrapper.appendChild(el('div', { class: 'actions' }, [
    el('button', { class: 'primary', onclick: () => startPreview(state) }, '▶ play / restart'),
    el('button', { onclick: () => { if (runningCore) { runningCore.stop(); runningCore = null; } } }, '■ stop'),
  ]));

  wrapper.appendChild(el('div', { style: { fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' } },
    '↑↓←→ moverse · espacio interactuar · esc cancelar'));

  center.appendChild(wrapper);

  // limpiar paneles laterales
  const left = document.querySelector('[data-panel="play"]');
  left.innerHTML = '<h2>play</h2><div style="font-size:0.8rem; opacity:0.7">prueba el juego en vivo. los cambios del editor se reflejan al pulsar play.</div>';
  const right = document.querySelector('[data-panel="play-props"]');
  right.innerHTML = '<h2>vars & inventory</h2><div style="font-size:0.75rem; opacity:0.6" id="debug-state">—</div>';

  // actualizar debug cada segundo
  if (window._mosiDebugInterval) clearInterval(window._mosiDebugInterval);
  window._mosiDebugInterval = setInterval(() => {
    if (!runningCore) return;
    const dbg = document.getElementById('debug-state');
    if (dbg) {
      dbg.innerHTML = `
        <div><strong>room:</strong> ${runningCore.state.runtime.currentRoomId}</div>
        <div><strong>pos:</strong> (${runningCore.state.runtime.avatar.x}, ${runningCore.state.runtime.avatar.y})</div>
        <div><strong>vars:</strong> ${JSON.stringify(runningCore.state.runtime.variables)}</div>
        <div><strong>inv:</strong> ${JSON.stringify(runningCore.state.runtime.inventory)}</div>
      `;
    }
  }, 500);
}

export default {
  name: 'play',
  label: 'play',
  render,
  rightPanelSelector: 'play-props',
  onPlay: (state) => startPreview(state),
};
