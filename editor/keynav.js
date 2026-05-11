// editor/keynav.js — navegación por teclado global del editor.
//
// Aplica el patrón roving-tabindex a las listas/grids del editor (rooms,
// sprites, frames, room-cells, color-swatches). Un único listener global
// captura las flechas y mueve el focus al siguiente item del mismo
// contenedor; Enter/Space disparan el click del item (activarlo).
//
// Funciona sin tocar los paneles: un MutationObserver detecta items nuevos
// (recreados en cada re-render) y les asigna el tabindex apropiado.

const NAV_PATTERNS = [
  { container: '.list',      item: '.list-item',   direction: 'v' },
  { container: '.frames',    item: '.frame',       direction: 'h' },
  { container: '.room-grid', item: '.room-cell',   direction: 'grid' },
  { container: '.color-row', item: '.color-swatch', direction: 'h' },
];

function applyRoving(container, itemSel) {
  const items = container.querySelectorAll(itemSel);
  if (!items.length) return;
  // Si ya hay tabindex 0 en alguno, lo respetamos. Si no, el primer .active
  // (o el primero si ninguno) recibe 0, el resto -1.
  const hasFocused = [...items].some(el => el.tabIndex === 0);
  if (hasFocused) return;
  let activeIdx = [...items].findIndex(el => el.classList.contains('active'));
  if (activeIdx < 0) activeIdx = 0;
  items.forEach((el, i) => { el.tabIndex = i === activeIdx ? 0 : -1; });
}

function ensureRoving() {
  for (const p of NAV_PATTERNS) {
    for (const c of document.querySelectorAll(p.container)) {
      applyRoving(c, p.item);
    }
  }
}

function detectCols(container) {
  const tmpl = window.getComputedStyle(container).gridTemplateColumns || '';
  return tmpl.split(/\s+/).filter(Boolean).length || 1;
}

function handleKey(e) {
  const ae = document.activeElement;
  if (!ae) return;
  for (const p of NAV_PATTERNS) {
    if (!ae.matches?.(p.item)) continue;
    const container = ae.closest(p.container);
    if (!container) continue;
    const items = [...container.querySelectorAll(p.item)];
    const idx = items.indexOf(ae);
    if (idx < 0) continue;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ae.click();
      return;
    }

    let next = idx;
    if (p.direction === 'v') {
      if (e.key === 'ArrowDown') next = (idx + 1) % items.length;
      else if (e.key === 'ArrowUp') next = (idx - 1 + items.length) % items.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = items.length - 1;
    } else if (p.direction === 'h') {
      if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = items.length - 1;
    } else if (p.direction === 'grid') {
      const cols = detectCols(container);
      const r = Math.floor(idx / cols), c = idx % cols;
      const lastRow = Math.floor((items.length - 1) / cols);
      if (e.key === 'ArrowRight') next = idx + 1 < items.length ? idx + 1 : idx;
      else if (e.key === 'ArrowLeft') next = idx > 0 ? idx - 1 : idx;
      else if (e.key === 'ArrowDown') {
        const targetRow = Math.min(r + 1, lastRow);
        const target = targetRow * cols + c;
        next = target < items.length ? target : items.length - 1;
      } else if (e.key === 'ArrowUp') {
        if (r > 0) next = (r - 1) * cols + c;
      } else if (e.key === 'Home') next = r * cols;
      else if (e.key === 'End') next = Math.min(r * cols + cols - 1, items.length - 1);
    }

    if (next !== idx && items[next]) {
      e.preventDefault();
      // Update roving: el nuevo foco pasa a tabindex 0, el anterior a -1.
      items[idx].tabIndex = -1;
      items[next].tabIndex = 0;
      items[next].focus();
    }
    return;
  }
}

export function setupKeyNav() {
  document.addEventListener('keydown', handleKey);
  ensureRoving();
  // Re-scan cuando se añaden nodos (re-render de paneles).
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.addedNodes.length > 0) { ensureRoving(); return; }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
