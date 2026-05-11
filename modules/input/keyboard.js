// modules/input/keyboard.js — captura teclado y emite eventos genéricos input:*

let core = null;
const handler = (e) => {
  const map = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ' ': 'action', Enter: 'action', z: 'action', Z: 'action',
    Escape: 'cancel',
  };
  const dir = map[e.key];
  if (!dir) return;
  e.preventDefault();
  core.bus.emit(`input:${dir}`, { source: 'keyboard' });
};

export default {
  name: 'input-keyboard',
  version: '1.0.0',
  deps: [],
  setup(c) {
    core = c;
    window.addEventListener('keydown', handler);
  },
  teardown() {
    window.removeEventListener('keydown', handler);
  },
};
