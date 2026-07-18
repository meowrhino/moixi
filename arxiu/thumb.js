// arxiu/thumb.js — miniaturas reales: rasteriza el room inicial de un juego en un canvas.
// No usa el engine: lee el JSON del juego y pinta tiles + avatar a mano (suficiente
// para una thumb; sin animación, sin lighting). El gradiente de la card queda de
// fallback si el JSON no carga.

const cache = new Map(); // url -> Promise<game|null>

function fetchGame(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null));
  }
  return cache.get(url);
}

function drawSprite(ctx, sprite, palette, tx, ty, tileSize) {
  const frame = sprite?.frames?.[0];
  if (!frame) return;
  ctx.fillStyle = palette?.colors?.[sprite.colorIndex] ?? '#1a1a1a';
  for (let py = 0; py < tileSize; py++) {
    for (let px = 0; px < tileSize; px++) {
      if (frame[py * tileSize + px]) {
        ctx.fillRect(tx * tileSize + px, ty * tileSize + py, 1, 1);
      }
    }
  }
}

export function renderThumb(game, canvas) {
  const tileSize = game.tileSize ?? 8;
  const [rw, rh] = game.roomSize ?? [16, 16];
  const room = game.rooms?.[game.startRoom];
  if (!room) return false;
  const palette = game.palettes?.[room.palette] ?? Object.values(game.palettes ?? {})[0];
  canvas.width = tileSize * rw;
  canvas.height = tileSize * rh;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = palette?.colors?.[0] ?? '#f4ecd8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  room.tiles?.forEach((row, y) => row.forEach((id, x) => {
    if (id) drawSprite(ctx, game.sprites?.[id], palette, x, y, tileSize);
  }));
  const avatar = game.sprites?.[game.avatar];
  if (avatar && game.avatarStart) {
    drawSprite(ctx, avatar, palette, game.avatarStart.x, game.avatarStart.y, tileSize);
  }
  return true;
}

// Hidrata todo [data-game-url] del root (cards de la landing, juegos del
// perfil...): canvas encima del gradiente cuando el JSON existe. Idempotente.
export async function hydrateThumbs(root = document) {
  const thumbs = [...root.querySelectorAll('[data-game-url]')];
  await Promise.all(thumbs.map(async (el) => {
    if (el.querySelector('canvas')) return;
    const game = await fetchGame(el.dataset.gameUrl);
    if (!game) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      objectFit: 'cover', imageRendering: 'pixelated',
    });
    if (renderThumb(game, canvas)) el.appendChild(canvas);
  }));
}
