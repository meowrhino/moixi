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
  const [
    coreMod, canvasMod, palettes, sprites, keyboard, touch, mover,
    walls, interactable, dialog, inventory, world, script, stdlib, vars, audio, save,
  ] = await Promise.all([
    import('../../core/index.js?t=' + Date.now()),
    import('../../modules/render/canvas.js?t=' + Date.now()),
    import('../../modules/render/palettes.js?t=' + Date.now()),
    import('../../modules/render/sprites.js?t=' + Date.now()),
    import('../../modules/input/keyboard.js?t=' + Date.now()),
    import('../../modules/input/touch.js?t=' + Date.now()),
    import('../../modules/input/mover.js?t=' + Date.now()),
    import('../../modules/gameplay/walls.js?t=' + Date.now()),
    import('../../modules/gameplay/interactable.js?t=' + Date.now()),
    import('../../modules/gameplay/dialog.js?t=' + Date.now()),
    import('../../modules/gameplay/inventory.js?t=' + Date.now()),
    import('../../modules/gameplay/world.js?t=' + Date.now()),
    import('../../modules/script/mosi.js?t=' + Date.now()),
    import('../../modules/script/stdlib.js?t=' + Date.now()),
    import('../../modules/script/vars.js?t=' + Date.now()),
    import('../../modules/audio/beeps.js?t=' + Date.now()),
    import('../../modules/persistence/save.js?t=' + Date.now()),
  ]);

  const c = coreMod.default;
  // clonar el game data para no mutar el del editor
  const gameClone = JSON.parse(JSON.stringify(state.game));
  c.load(gameClone);

  c.use(canvasMod.default).use(palettes.default).use(sprites.default)
    .use(keyboard.default).use(touch.default).use(mover.default)
    .use(walls.default).use(interactable.default).use(script.default).use(stdlib.default).use(vars.default)
    .use(dialog.default).use(inventory.default).use(world.default)
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
};
