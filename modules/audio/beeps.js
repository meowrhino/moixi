// modules/audio/beeps.js — síntesis de audio mínima con WebAudio.
// Soporta "songs" definidos como array de notas: [{note: 'C4', dur: 0.25}, ...]
// y SFX simples por nombre.

let core = null;
let actx = null;
let masterGain = null;
let currentLoop = null;
let volume = 0.18;
let muted = false;

const NOTE_FREQ = (() => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const out = {};
  for (let oct = 0; oct <= 8; oct++) {
    for (let i = 0; i < names.length; i++) {
      const n = names[i] + oct;
      const semis = (oct - 4) * 12 + (i - 9);  // A4 = 440
      out[n] = 440 * Math.pow(2, semis / 12);
    }
  }
  return out;
})();

function ensureContext() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = actx.createGain();
  masterGain.gain.value = muted ? 0 : volume;
  masterGain.connect(actx.destination);
}

function playNote(note, dur, when, type = 'square') {
  const freq = NOTE_FREQ[note];
  if (!freq) return;
  const osc = actx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const env = actx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(0.5, when + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(env).connect(masterGain);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

function playSong(song) {
  if (!actx || !song?.notes) return;
  let when = actx.currentTime + 0.05;
  for (const n of song.notes) {
    if (n.note) playNote(n.note, n.dur || 0.25, when, song.wave || 'square');
    when += n.dur || 0.25;
  }
  return when - actx.currentTime;
}

function stopAll() {
  if (currentLoop) clearTimeout(currentLoop);
  currentLoop = null;
}

function loopSong(songId) {
  stopAll();
  const song = core.state.game.songs?.[songId];
  if (!song) return;
  const total = playSong(song);
  if (song.loop !== false && total > 0) {
    currentLoop = setTimeout(() => loopSong(songId), total * 1000);
  }
}

export default {
  name: 'audio',
  version: '1.0.0',
  deps: [],

  setup(c) {
    core = c;
    // El contexto necesita un gesto del usuario para activarse; lo enganchamos al primer input.
    const init = () => { ensureContext(); window.removeEventListener('keydown', init); window.removeEventListener('pointerdown', init); };
    window.addEventListener('keydown', init);
    window.addEventListener('pointerdown', init);

    c.bus.on('roomEnter', () => {
      ensureContext();
      const m = c.state.runtime.currentRoom?.music;
      if (m) loopSong(m);
    });
    c.bus.on('music:change', ({ id }) => {
      ensureContext();
      if (id) loopSong(id);
    });
  },

  api: {
    playSong, stopAll,
    beep(note = 'C5', dur = 0.1) { ensureContext(); playNote(note, dur, actx.currentTime + 0.01); },
    mute() { muted = true; if (masterGain) masterGain.gain.value = 0; },
    unmute() { muted = false; if (masterGain) masterGain.gain.value = volume; },
    isMuted: () => muted,
    setVolume(v) {
      volume = Math.max(0, Math.min(1, Number(v) || 0));
      if (masterGain && !muted) masterGain.gain.value = volume;
    },
  },
};
