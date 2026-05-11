// modules/script/mosi.js — motor de scripting estilo Mosi.
// Sintaxis: {fn arg1 arg2 ...} con anidamiento. Args pueden ser:
//   - números, identificadores
//   - strings con comillas: "hola mundo"
//   - sub-expresiones: {avatar-x}
//
// Las funciones registradas viven en core.scriptFns (las añaden otros módulos).
// Este módulo solo registra el dispatcher y unas pocas funciones del flujo.

let core = null;

function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    if (s[i] === '"') {
      let j = i + 1; while (j < s.length && s[j] !== '"') j++;
      out.push({ type: 'str', value: s.slice(i + 1, j) });
      i = j + 1;
    } else if (s[i] === '{') {
      let depth = 1, j = i + 1;
      while (j < s.length && depth > 0) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') depth--;
        if (depth > 0) j++;
      }
      out.push({ type: 'expr', value: s.slice(i + 1, j) });
      i = j + 1;
    } else {
      let j = i; while (j < s.length && !/[\s}]/.test(s[j])) j++;
      const raw = s.slice(i, j);
      // num literal o identificador
      if (/^-?\d+(\.\d+)?$/.test(raw)) out.push({ type: 'num', value: parseFloat(raw) });
      else if (raw === 'true' || raw === 'false') out.push({ type: 'bool', value: raw === 'true' });
      else out.push({ type: 'id', value: raw });
      i = j;
    }
  }
  return out;
}

function evalExpr(exprStr) {
  const tokens = tokenize(exprStr);
  if (!tokens.length) return '';
  const head = tokens[0].value;
  const fn = core.scriptFns[head];
  if (!fn) {
    console.warn(`[script] unknown fn: ${head}`);
    return '';
  }
  const args = tokens.slice(1).map(t => t.type === 'expr' ? evalExpr(t.value) : t.value);
  try {
    return fn(core, ...args);
  } catch (e) {
    console.error(`[script] error in {${head}}`, e);
    return '';
  }
}

// Ejecuta un script completo (mezcla de texto + tags). El texto va al diálogo.
function runScript(src) {
  if (!src) return;
  // delegamos en el módulo de diálogo, que sabe parsear todo el DSL
  core.api.dialog?.run(src);
}

export default {
  name: 'script',
  version: '1.0.0',
  deps: [],

  setup(c) { core = c; },

  api: {
    eval: evalExpr,
    run: runScript,
  },
};
