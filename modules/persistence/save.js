// modules/persistence/save.js — guarda y carga estado de runtime.
// Soporta dos backends: localStorage y URL (state codificado en location.hash).

const KEY_RUNTIME = 'mosi:runtime';
const KEY_GAME = 'mosi:game';

let core = null;

function snapshot() {
  return {
    runtime: structuredClone(core.state.runtime),
    avatarSpriteId: core.state.game?.avatar,
    timestamp: Date.now(),
  };
}

function restore(snap) {
  if (!snap?.runtime) return;
  Object.assign(core.state.runtime, snap.runtime);
  core.state.runtime.currentRoom = core.state.game.rooms[core.state.runtime.currentRoomId];
  if (snap.avatarSpriteId) core.state.game.avatar = snap.avatarSpriteId;
}

// Compresión muy básica para URL (no es óptima pero evita una dep).
async function compress(str) {
  if (typeof CompressionStream === 'undefined') return btoa(unescape(encodeURIComponent(str)));
  const blob = new Blob([str]);
  const stream = blob.stream().pipeThrough(new CompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
async function decompress(b64) {
  if (typeof DecompressionStream === 'undefined') return decodeURIComponent(escape(atob(b64)));
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(stream).text();
}

export default {
  name: 'save',
  version: '1.0.0',
  deps: [],

  setup(c) { core = c; },

  api: {
    saveLocal() {
      try {
        localStorage.setItem(KEY_RUNTIME, JSON.stringify(snapshot()));
        localStorage.setItem(KEY_GAME, JSON.stringify(core.state.game));
        return true;
      } catch (e) { console.error(e); return false; }
    },
    loadLocal() {
      try {
        const game = localStorage.getItem(KEY_GAME);
        const snap = localStorage.getItem(KEY_RUNTIME);
        if (game) core.load(JSON.parse(game));
        if (snap) restore(JSON.parse(snap));
        return true;
      } catch (e) { console.error(e); return false; }
    },
    clearLocal() {
      localStorage.removeItem(KEY_RUNTIME);
      localStorage.removeItem(KEY_GAME);
    },
    async saveToURL() {
      const data = JSON.stringify(snapshot());
      const compressed = await compress(data);
      location.hash = '#save=' + compressed;
      return location.href;
    },
    async loadFromURL() {
      const m = location.hash.match(/save=([^&]+)/);
      if (!m) return false;
      const json = await decompress(m[1]);
      restore(JSON.parse(json));
      return true;
    },
  },
};
