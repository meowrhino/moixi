// modules/script/stdlib.js — biblioteca estándar del lenguaje de scripting.
// Math: add, sub, mul, div, mod, random
// Logic: eq, gt, gte, lt, lte, not, all-true, any-true, none-true, if (placeholder)
// Flow: nada por ahora (delay y if los maneja el dialog parser)

const num = v => parseFloat(v);
const bool = v => v === true || v === 'true';

export default {
  name: 'script-stdlib',
  version: '1.0.0',
  deps: ['script'],

  scriptFns: {
    // Math
    'add': (c, a, b) => num(a) + num(b),
    'sub': (c, a, b) => num(a) - num(b),
    'mul': (c, a, b) => num(a) * num(b),
    'div': (c, a, b) => num(a) / num(b),
    'mod': (c, a, b) => num(a) % num(b),
    'random': (c, a, b) => {
      const lo = num(a), hi = num(b);
      return lo + Math.floor(Math.random() * (hi - lo + 1));
    },
    'min': (c, a, b) => Math.min(num(a), num(b)),
    'max': (c, a, b) => Math.max(num(a), num(b)),
    'abs': (c, a) => Math.abs(num(a)),
    'floor': (c, a) => Math.floor(num(a)),

    // Comparison
    'eq': (c, a, b) => String(a) === String(b),
    'gt': (c, a, b) => num(a) > num(b),
    'gte': (c, a, b) => num(a) >= num(b),
    'lt': (c, a, b) => num(a) < num(b),
    'lte': (c, a, b) => num(a) <= num(b),

    // Logic
    'not': (c, a) => !bool(a),
    'all-true': (c, ...args) => args.every(bool),
    'any-true': (c, ...args) => args.some(bool),
    'none-true': (c, ...args) => !args.some(bool),
  },
};
