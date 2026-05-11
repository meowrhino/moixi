// modules/script/vars.js — variables persistentes durante la partida.

export default {
  name: 'vars',
  version: '1.0.0',
  deps: [],

  scriptFns: {
    'var': (c, name) => c.state.runtime.variables[name] ?? 0,
    'set-var': (c, name, value) => {
      // detecta tipo: número si parece, bool si "true"/"false", string si no
      let v = value;
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (/^-?\d+(\.\d+)?$/.test(v)) v = parseFloat(v);
      c.state.runtime.variables[name] = v;
      return '';
    },
    'inc-var': (c, name, by) => {
      const cur = c.state.runtime.variables[name] || 0;
      c.state.runtime.variables[name] = cur + parseFloat(by || '1');
      return '';
    },
    'dec-var': (c, name, by) => {
      const cur = c.state.runtime.variables[name] || 0;
      c.state.runtime.variables[name] = cur - parseFloat(by || '1');
      return '';
    },
  },
};
