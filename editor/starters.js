// editor/starters.js — utilidades para arrancar juegos nuevos con personalidad.
//
// Cuando entras al editor con ?new, en lugar de cargar un JSON estático
// generamos uno aquí: avatar mascot, paleta random de un catálogo curado,
// nombre poético al azar, room con borde de wall ya pintado, intro tutorial.
// Mejor onboarding sin pasar por una pantalla en blanco.

// === Bitmap del mascot oficial (gato-rinoceronte), pixelizado del SVG 8×8.
// Frames 0 y 1 (caminar) y idle (ojos cerrados, patas juntas).
const MASCOT_FRAME_A = [
  0, 1, 0, 1, 1, 0, 1, 0,  // orejas + cuerno
  0, 1, 1, 1, 1, 1, 1, 0,  // cabeza top
  1, 1, 0, 1, 1, 0, 1, 1,  // cabeza con ojos (0 = agujeros, deja ver bg)
  1, 1, 1, 1, 1, 1, 1, 1,  // cabeza con nariz integrada
  0, 1, 1, 1, 1, 1, 1, 0,  // cabeza bottom
  0, 0, 1, 1, 1, 1, 0, 0,  // cuerpo
  0, 0, 1, 0, 0, 1, 0, 0,  // patas
  0, 0, 1, 0, 0, 1, 0, 0,
];
const MASCOT_FRAME_B = [
  0, 1, 0, 1, 1, 0, 1, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 1, 0,
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 1, 1, 0, 0, 1, 1, 0,
  1, 1, 0, 0, 0, 0, 1, 1,  // patas más abiertas: anima caminar
];
const MASCOT_IDLE_A = [
  0, 1, 0, 1, 1, 0, 1, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,  // ojos cerrados (todo ink en y=2)
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 1, 0,
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 0, 1, 0, 0, 1, 0, 0,
  0, 0, 1, 0, 0, 1, 0, 0,
];

// Wall con textura: reusa el del jardín.
const WALL_BITMAP = [
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 1, 1, 0, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 0, 1, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 1, 1, 1, 1, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 0, 1, 1, 0, 1, 1,
];

// === Catálogo curado de paletas. Cada una con 4-5 colores. El editor pickea
// una al azar al arrancar un juego nuevo. Todas tienen mínimo 3 colores para
// que avatar.colorIndex=2 funcione (índice válido).
export const PALETTE_CATALOG = [
  { id: 'studio',   name: 'studio',   colors: ['#f4ecd8', '#3d7068', '#1a1a1a', '#d4843e', '#a83e3e'] },
  { id: 'gameboy',  name: 'gameboy',  colors: ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'] },
  { id: 'dust',     name: 'duna',     colors: ['#e6c39c', '#a07452', '#3e2c1f', '#c4a570', '#1a1a1a'] },
  { id: 'neon',     name: 'neón',     colors: ['#0d0221', '#ff006e', '#ffd60a', '#06d6a0', '#1f0a3d'] },
  { id: 'sepia',    name: 'sepia',    colors: ['#f1e3c7', '#c8a880', '#3e2920', '#856644', '#1a1a1a'] },
  { id: 'dusk',     name: 'atardecer', colors: ['#2a1a2e', '#5d275d', '#f4ecd8', '#d4843e', '#ef7d57'] },
  { id: 'mar',      name: 'mar',      colors: ['#0a1e3a', '#1d4a7a', '#88c4d4', '#f4ecd8', '#ef7d57'] },
  { id: 'bosque',   name: 'bosque',   colors: ['#1a2918', '#2f5034', '#e6dfa0', '#88a957', '#a83e3e'] },
  { id: 'paper',    name: 'papel',    colors: ['#fffaf0', '#d4c5a0', '#3d2f1f', '#8b7355', '#a83e3e'] },
  { id: 'invierno', name: 'invierno', colors: ['#e8edf2', '#9ab0c4', '#1a2030', '#3a4f6a', '#d4843e'] },
  { id: 'rosa',     name: 'rosa',     colors: ['#fce4ec', '#f8bbd0', '#1a1a1a', '#ec407a', '#880e4f'] },
  { id: 'tierra',   name: 'tierra',   colors: ['#f5e6d3', '#d4a373', '#3e2a1f', '#8b5a3c', '#1a1a1a'] },
];

// === Pool de nombres poéticos para juegos sin título. Mezcla castellano/catalán.
const NAME_POOL = [
  'el jardín pequeño', 'una nit', 'el zorro y la luna', 'tres flores',
  'la mudanza pendiente', 'cartes oblidades', 'caminando hacia el sur',
  'la última habitación', 'el último mensaje', 'un día tranquilo',
  'el ritual sencillo', 'la luna sobre el mar', 'tres pasos',
  'el shrine olvidado', 'una conversación corta', 'el bosque al atardecer',
  'la casa vacía', 'una llamada', 'pequeños recuerdos',
  'el café de los miércoles', 'un nom inacabat', 'la flor que faltava',
  'el mapa del jardín', 'una passejada lenta',
];

export function pickRandomPalette() {
  return PALETTE_CATALOG[Math.floor(Math.random() * PALETTE_CATALOG.length)];
}

export function pickRandomName() {
  return NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
}

// Construye un juego mínimo pero vivo: paleta random, nombre random, mascot
// como avatar, wall en el borde del room, intro tutorial.
export function buildEmptyGame() {
  const palette = pickRandomPalette();
  const name = pickRandomName();
  const [rw, rh] = [16, 16];

  // Borde de wall (frame) — no completamente vacío, da algo con lo que jugar.
  const tiles = Array.from({ length: rh }, (_, y) =>
    Array.from({ length: rw }, (_, x) =>
      (x === 0 || x === rw - 1 || y === 0 || y === rh - 1) ? 'wall' : null
    )
  );

  return {
    name,
    version: 1,
    tileSize: 8,
    roomSize: [rw, rh],
    wrapH: false,
    wrapV: false,
    avatar: 'avatar',
    startRoom: 'room1',
    avatarStart: { x: 8, y: 8 },
    introScript: '{position center}qué pintamos hoy?{p}{position center}{wavy}muévete con las flechas{/wavy}',

    palettes: {
      [palette.id]: { name: palette.name, colors: palette.colors },
    },

    sprites: {
      avatar: {
        name: 'tu',
        colorIndex: 2,
        fps: 2,
        frames: [MASCOT_FRAME_A, MASCOT_FRAME_B],
        idleFps: 1.5,
        idle: [MASCOT_IDLE_A],
      },
      wall: {
        name: 'pared',
        colorIndex: 1,
        isWall: true,
        frames: [WALL_BITMAP],
      },
    },

    rooms: {
      room1: {
        name: 'room 1',
        palette: palette.id,
        tiles,
      },
    },
  };
}
