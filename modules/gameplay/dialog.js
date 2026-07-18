// modules/gameplay/dialog.js — caja de diálogo con typewriter + tags inline.
// Soporta: {b} (line break), {p} (page break), {wavy}...{/wavy}, {shaky}...{/shaky},
//          {color N}...{/color}, {position top|center|bottom|fullscreen}...{/position},
//          {delay N}, {if ...}{/if}, expresiones {var name}, etc.
// Las funciones no-dialogo se dispatchan a core.scriptFns y se ejecutan cuando
// su página se muestra (no al parsear): el jugador lee la página que las contiene
// en el momento en que sus efectos ocurren.

let core = null;
let el = null;
let queue = [];      // páginas pendientes
let charBuffer = ''; // texto que se está escribiendo char a char
let bufferIdx = 0;
let lastCharTime = 0;
let charsPerSec = 40;
let position = 'bottom';

function ensureEl() {
  if (el) return;
  el = document.createElement('div');
  el.dataset.mosiDialog = '';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-live', 'polite');
  // Se ancla al contenedor del canvas (la caja queda "dentro" del juego).
  // Si no hay canvas montado, fallback a body con position fixed.
  const canvasEl = core.api.canvas?.el?.();
  const host = canvasEl?.parentElement || document.body;
  if (host !== document.body && getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }
  Object.assign(el.style, {
    position: host === document.body ? 'fixed' : 'absolute',
    padding: '0.8em 1em', font: '15px ui-monospace, "JetBrains Mono", monospace',
    background: '#1a1a1a', color: '#f4ecd8',
    border: '2px solid #d4843e', boxShadow: '4px 4px 0 #d4843e',
    display: 'none', zIndex: 100, lineHeight: 1.4,
    whiteSpace: 'pre-wrap', wordWrap: 'break-word', boxSizing: 'border-box',
  });
  el.addEventListener('click', advance);
  host.appendChild(el);
  setPosition('bottom');
}

function setPosition(p) {
  position = p;
  if (!el) return;
  // reset completo: fullscreen deja left/right/transform tocados si no se limpia
  Object.assign(el.style, {
    top: '', bottom: '', height: '', maxHeight: '', right: '', overflow: '',
    left: '50%', transform: 'translateX(-50%)',
    width: 'calc(100% - 12px)', maxWidth: '540px',
  });
  if (p === 'top')         { el.style.top = '4%'; }
  else if (p === 'center') { el.style.top = '50%'; el.style.transform = 'translate(-50%, -50%)'; }
  else if (p === 'fullscreen') {
    Object.assign(el.style, { top: '4%', bottom: '4%', left: '4%', right: '4%',
      width: 'auto', transform: 'none', maxWidth: 'none', overflow: 'auto' });
  }
  else { el.style.bottom = '4%'; }
}

function open() {
  ensureEl();
  el.style.display = 'block';
  core.state.runtime.dialogActive = true;
  charBuffer = ''; bufferIdx = 0;
}
function close() {
  if (el) el.style.display = 'none';
  core.state.runtime.dialogActive = false;
  queue = []; charBuffer = ''; bufferIdx = 0;
  setPosition('bottom');
}
function advance() {
  if (bufferIdx < charBuffer.length) { bufferIdx = charBuffer.length; render(); return; }
  if (queue.length) { startNextPage(); return; }
  close();
}
// Convierte los segmentos de una página en texto final. AQUÍ (al mostrar la
// página, no al parsear) se ejecutan las funciones de script: {move-avatar},
// {set-music}, {inc-item-count}... corren cuando el jugador llega a su página,
// en orden con las interpolaciones de valor ({item-count flor}) del mismo texto.
function materializePage(page) {
  let text = '';
  for (const seg of page.segments) {
    if (typeof seg === 'string') { text += seg; continue; }
    try {
      const ret = evaluateExpr(seg.expr);
      if (ret !== undefined && ret !== null && typeof ret !== 'object') text += String(ret);
    } catch (e) { console.error(`[dialog] error en {${seg.expr}}`, e); }
  }
  return text;
}

function startNextPage() {
  const page = queue.shift();
  if (!page) { close(); return; }
  setPosition(page.position || 'bottom');
  // lastCharTime ANTES de los efectos: {delay N} lo empuja hacia delante
  // (antes se machacaba justo después y el delay no hacía nada)
  lastCharTime = performance.now();
  for (const sideEffect of page.effects || []) sideEffect();
  charBuffer = materializePage(page);
  bufferIdx = 0;
  // página sin texto (solo side effects): saltar a la siguiente o cerrar.
  // OJO: los efectos pueden haber encolado páginas nuevas (scripts reentrantes),
  // por eso se comprueba queue DESPUÉS de materializar.
  if (!charBuffer.length) {
    if (queue.length) { startNextPage(); return; }
    close();
    return;
  }
  render();
}

// Parser muy simple del DSL del diálogo. Devuelve un array de "páginas":
// { segments: [string | { expr }], position, effects }. Los strings son texto
// literal (con marcadores <<wavy>> etc.); los { expr } son llamadas de script
// que se evalúan al MOSTRAR la página (ver materializePage).
function appendText(pages, s) {
  const segs = pages[pages.length - 1].segments;
  if (typeof segs[segs.length - 1] === 'string') segs[segs.length - 1] += s;
  else segs.push(s);
}

function parseScript(src) {
  const pages = [{ segments: [], position: 'bottom', effects: [] }];
  let i = 0;
  const len = src.length;
  while (i < len) {
    if (src[i] === '{') {
      // encuentra el cierre balanceado
      let depth = 1, j = i + 1;
      while (j < len && depth > 0) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        if (depth > 0) j++;
      }
      const inner = src.slice(i + 1, j).trim();
      const result = handleTag(inner, pages);
      if (result?.appendText) appendText(pages, result.appendText);
      else if (result?.defer) pages[pages.length - 1].segments.push({ expr: result.defer });
      i = j + 1;
    } else {
      appendText(pages, src[i]);
      i++;
    }
  }
  return pages.filter(p =>
    p.effects.length > 0 ||
    p.segments.some(s => typeof s !== 'string' || s.length > 0));
}

// Parser de argumentos: tokens separados por espacios, strings con comillas, expresiones {x} anidadas.
function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    if (s[i] === '"') {
      let j = i + 1; while (j < s.length && s[j] !== '"') j++;
      out.push(s.slice(i + 1, j));
      i = j + 1;
    } else if (s[i] === '{') {
      let depth = 1, j = i + 1;
      while (j < s.length && depth > 0) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') depth--;
        if (depth > 0) j++;
      }
      out.push({ expr: s.slice(i + 1, j) });
      i = j + 1;
    } else {
      let j = i; while (j < s.length && !/\s/.test(s[j])) j++;
      out.push(s.slice(i, j));
      i = j;
    }
  }
  return out;
}

function evaluateExpr(exprStr) {
  // Evalúa una expresión recursivamente (puede ser otra llamada con args)
  const tokens = tokenize(exprStr);
  if (!tokens.length) return '';
  const head = tokens[0];
  const fn = core.scriptFns[head];
  if (!fn) return '';
  const args = tokens.slice(1).map(t => typeof t === 'object' && t.expr ? evaluateExpr(t.expr) : t);
  return fn(core, ...args);
}

function handleTag(inner, pages) {
  // Tags inline de formato: se convierten en marcadores que el render interpreta
  if (inner === 'b') return { appendText: '\n' };
  if (inner === 'p') { pages.push({ segments: [], position: pages[pages.length - 1].position, effects: [] }); return; }
  if (inner === 'wavy' || inner === 'shaky') return { appendText: `<<${inner}>>` };
  if (inner === '/wavy') return { appendText: '<</wavy>>' };
  if (inner === '/shaky') return { appendText: '<</shaky>>' };
  if (inner.startsWith('color ')) return { appendText: `<<color:${inner.slice(6).trim()}>>` };
  if (inner === '/color') return { appendText: '<</color>>' };

  // Tags estructurales (no inline)
  const tokens = tokenize(inner);
  const head = tokens[0];

  if (head === 'position') {
    const p = tokens[1] || 'bottom';
    pages[pages.length - 1].position = p;
    return;
  }
  if (head === 'delay') {
    const n = parseInt(tokens[1] || '5', 10);
    pages[pages.length - 1].effects.push(() => { lastCharTime = performance.now() + n * 16; });
    return;
  }
  if (head === 'if') {
    // condicional simple inline: {if {expr}}texto{else}texto{/if}
    // resolvemos la condición ahora (el dialog vive en runtime)
    const condExpr = (tokens[1] && tokens[1].expr) ? tokens[1].expr : tokens[1];
    const cond = condExpr ? evaluateExpr(condExpr) : false;
    // contenido se trataría en un parser más complejo; aquí dejamos como side effect simple
    return;
  }

  // Función registrada del lenguaje: se DIFIERE — se ejecutará al mostrar la
  // página (materializePage). Si devuelve algo visible, se interpola en el texto.
  if (core.scriptFns[head]) return { defer: inner };
  return;
}

// Renderizado con efectos inline (wavy/shaky/color)
function render() {
  if (!el) return;
  const visible = charBuffer.slice(0, bufferIdx);
  el.innerHTML = renderEffects(visible);
}

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderEffects(text) {
  // Sustituye marcadores <<tag>> por spans HTML con clases
  let out = '';
  let i = 0;
  let active = []; // pila de clases activas
  while (i < text.length) {
    if (text.slice(i, i + 2) === '<<') {
      const end = text.indexOf('>>', i);
      if (end < 0) { out += escapeHTML(text[i]); i++; continue; }
      const tag = text.slice(i + 2, end);
      if (tag.startsWith('/')) {
        // cerrar
        const t = tag.slice(1);
        // cerrar el último que matchee
        for (let k = active.length - 1; k >= 0; k--) {
          if (active[k].name === t) { active.splice(k, 1); out += '</span>'; break; }
        }
      } else if (tag.startsWith('color:')) {
        const idx = parseInt(tag.slice(6), 10);
        const color = core.api.palettes?.color?.(idx) ?? 'inherit';
        out += `<span style="color:${color}">`;
        active.push({ name: 'color' });
      } else {
        out += `<span class="mosi-fx-${tag}">`;
        active.push({ name: tag });
      }
      i = end + 2;
    } else {
      out += escapeHTML(text[i]);
      i++;
    }
  }
  while (active.length) { out += '</span>'; active.pop(); }
  return out;
}

function tick({ t }) {
  if (!core.state.runtime.dialogActive) return;
  if (bufferIdx < charBuffer.length) {
    const elapsed = t - lastCharTime;
    const charsToAdd = Math.floor(elapsed * charsPerSec / 1000);
    if (charsToAdd > 0) {
      bufferIdx = Math.min(bufferIdx + charsToAdd, charBuffer.length);
      lastCharTime = t;
      render();
    }
  }
}

// Pre-procesa {if cond}then{else}else{/if} respetando anidamiento, evalúa cond y
// devuelve el script con solo la rama elegida (o vacío si no había rama). Lo necesita
// el parser principal porque parseScript es secuencial y no entiende bloques.
function resolveIfElse(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src.slice(i, i + 4) === '{if ') {
      // encuentra el } que cierra el if-tag (respetando llaves de la condición)
      let d = 1, j = i + 1;
      while (j < src.length && d > 0) {
        if (src[j] === '{') d++;
        else if (src[j] === '}') d--;
        if (d > 0) j++;
      }
      const condRaw = src.slice(i + 4, j).trim();
      const condInner = (condRaw.startsWith('{') && condRaw.endsWith('}'))
        ? condRaw.slice(1, -1) : condRaw;
      const condValue = evaluateExpr(condInner);

      // busca {else} y {/if} al mismo nivel
      let bodyStart = j + 1, nest = 1, elsePos = -1, endIfPos = -1, k = bodyStart;
      while (k < src.length) {
        if (src.slice(k, k + 4) === '{if ') {
          nest++;
          let d2 = 1, m = k + 1;
          while (m < src.length && d2 > 0) {
            if (src[m] === '{') d2++;
            else if (src[m] === '}') d2--;
            if (d2 > 0) m++;
          }
          k = m + 1;
        } else if (src.slice(k, k + 5) === '{/if}') {
          nest--;
          if (nest === 0) { endIfPos = k; break; }
          k += 5;
        } else if (nest === 1 && src.slice(k, k + 6) === '{else}') {
          elsePos = k; k += 6;
        } else {
          k++;
        }
      }
      if (endIfPos < 0) { out += src.slice(i); return out; }
      const thenBody = src.slice(bodyStart, elsePos >= 0 ? elsePos : endIfPos);
      const elseBody = elsePos >= 0 ? src.slice(elsePos + 6, endIfPos) : '';
      out += condValue ? resolveIfElse(thenBody) : resolveIfElse(elseBody);
      i = endIfPos + 5;
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

// Los scripts pueden disparar otros scripts mientras se parsean (p.ej. {move-avatar}
// emite roomEnter y el room tiene enterScript). Si pisáramos `queue` se perderían
// páginas: los scripts reentrantes se apuntan en `pendingScripts` y se encolan
// DETRÁS de las páginas del script que los provocó.
let parsing = false;
let pendingScripts = [];

function parsePages(src) {
  parsing = true;
  try { return parseScript(resolveIfElse(src)); }
  finally { parsing = false; }
}

function drainPending() {
  while (pendingScripts.length) {
    queue.push(...parsePages(pendingScripts.shift()));
  }
}

export function runScript(src) {
  if (!src) return;
  if (parsing) { pendingScripts.push(src); return; }
  if (core.state.runtime.dialogActive) {
    // ya hay un diálogo en pantalla: encolamos detrás sin resetear lo visible
    queue.push(...parsePages(src));
    drainPending();
    return;
  }
  open();
  queue = parsePages(src);
  startNextPage();
  drainPending();
}

export default {
  name: 'dialog',
  version: '1.0.0',
  deps: ['sprites', 'mover'],

  setup(c) {
    core = c;
    ensureEl();

    c.bus.on('bump:sprite', ({ sprite }) => {
      c.state.runtime.currentSprite = sprite;
      if (sprite.script) runScript(sprite.script);
    });
    c.bus.on('pickup', ({ sprite }) => {
      c.state.runtime.currentSprite = sprite;
      // sumar al inventario; el módulo inventory lo gestiona
    });
    c.bus.on('roomEnter', ({ roomId }) => {
      const room = c.state.game.rooms[roomId];
      if (room?.enterScript) runScript(room.enterScript);
    });
    c.bus.on('gameStart', () => {
      const intro = c.state.game.introScript;
      if (intro) runScript(intro);
    });
    c.bus.on('input:action', () => {
      if (c.state.runtime.dialogActive) advance();
    });

    // CSS para los efectos de texto
    const style = document.createElement('style');
    style.textContent = `
      @keyframes mosi-wave { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
      @keyframes mosi-shake { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-1px,1px); } 75% { transform: translate(1px,-1px); } }
      .mosi-fx-wavy { display: inline-block; animation: mosi-wave 0.4s infinite; }
      .mosi-fx-shaky { display: inline-block; animation: mosi-shake 0.1s infinite; }
    `;
    document.head.appendChild(style);
  },

  hooks: { 'tick': tick },

  scriptFns: {
    // los inline (wavy/shaky/color/position/delay/b/p) los procesa el parser arriba
  },

  api: { run: runScript, close, isOpen: () => core.state.runtime.dialogActive },
};
