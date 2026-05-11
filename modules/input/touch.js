// modules/input/touch.js — D-pad táctil para móviles. Inyecta un SVG flotante.

let core = null;
let dpadEl = null;

const SVG = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect data-dir="up"    x="40" y="0"  width="40" height="40" fill="currentColor" opacity="0.6"/>
  <rect data-dir="left"  x="0"  y="40" width="40" height="40" fill="currentColor" opacity="0.6"/>
  <rect data-dir="action" x="40" y="40" width="40" height="40" fill="currentColor" opacity="0.85"/>
  <rect data-dir="right" x="80" y="40" width="40" height="40" fill="currentColor" opacity="0.6"/>
  <rect data-dir="down"  x="40" y="80" width="40" height="40" fill="currentColor" opacity="0.6"/>
</svg>`;

function mount() {
  if (dpadEl) return;
  dpadEl = document.createElement('div');
  dpadEl.dataset.mosiDpad = '';
  dpadEl.innerHTML = SVG;
  Object.assign(dpadEl.style, {
    position: 'fixed', bottom: '1rem', right: '1rem',
    width: '120px', height: '120px',
    color: '#1a1a1a',
    pointerEvents: 'auto',
    userSelect: 'none', touchAction: 'none',
    zIndex: 50,
  });
  // Solo mostrar en pantallas táctiles
  if (!matchMedia('(pointer: coarse)').matches) dpadEl.style.display = 'none';

  dpadEl.addEventListener('pointerdown', e => {
    const dir = e.target?.dataset?.dir;
    if (dir) {
      e.preventDefault();
      core.bus.emit(`input:${dir}`, { source: 'touch' });
    }
  });
  document.body.appendChild(dpadEl);
}

export default {
  name: 'input-touch',
  version: '1.0.0',
  deps: [],
  setup(c) { core = c; mount(); },
  teardown() { dpadEl?.remove(); dpadEl = null; },
};
