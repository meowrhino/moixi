// arxiu/profile.js — página de perfil de un autor del arxiu.
// Lee ?handle=<userHandle>. Muestra bio, lista de juegos y genealogía.

const MOCK_URL = './examples/arxiu-mock.json';
const $ = (s) => document.querySelector(s);

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d,10)} ${months[parseInt(m,10)-1]} ${y}`;
}

async function init() {
  const handle = new URLSearchParams(location.search).get('handle');
  if (!handle) {
    $('#profile-page').innerHTML = `<div class="empty">falta el handle en la url.</div>`;
    return;
  }
  let data;
  try { data = await fetch(MOCK_URL).then(r => r.json()); }
  catch (e) {
    $('#profile-page').innerHTML = `<div class="empty">no se pudo cargar.</div>`;
    return;
  }
  const u = data.users?.[handle];
  if (!u) {
    $('#profile-page').innerHTML = `<div class="empty">no existe perfil "<code>${escapeHTML(handle)}</code>".</div>`;
    return;
  }
  document.title = `moixi · ${u.name}`;

  const myGames = data.games.filter(g => g.authorHandle === handle);
  const totalPlays = myGames.reduce((s, g) => s + g.plays, 0);
  const totalForks = myGames.reduce((s, g) => s + g.forks, 0);

  const gamesHTML = myGames.length ? myGames.map(g => `
    <a class="profile-game" href="./game.html?id=${encodeURIComponent(g.id)}">
      <div class="profile-game-thumb" style="background: ${g.thumb};"></div>
      <div class="profile-game-body">
        <div class="profile-game-title">${escapeHTML(g.name)}${g.forkOf ? ' <span class="fork-badge">↳ fork</span>' : ''}</div>
        <div class="profile-game-meta">${fmtDate(g.updatedAt)} · ▶ ${g.plays} · ↳ ${g.forks}</div>
      </div>
    </a>
  `).join('') : `<div class="empty">${escapeHTML(u.name)} todavía no ha publicado juegos.</div>`;

  $('#profile-page').innerHTML = `
    <div class="profile-hero">
      <img class="mascot alive lg" src="./assets/mascot.svg" alt="">
      <div class="profile-hero-info">
        <h1>${escapeHTML(u.name)}</h1>
        <div class="profile-handle">@${escapeHTML(u.handle)}</div>
        <p class="profile-bio">${escapeHTML(u.bio || '')}</p>
        ${u.url ? `<a href="${escapeHTML(u.url)}" class="profile-url" target="_blank" rel="noopener">${escapeHTML(u.url)}</a>` : ''}
        <div class="profile-stats">
          <span>${myGames.length} ${myGames.length === 1 ? 'juego' : 'juegos'}</span>
          <span>· ▶ ${totalPlays} plays</span>
          <span>· ↳ ${totalForks} forks</span>
          <span>· miembro desde ${fmtDate(u.joined)}</span>
        </div>
      </div>
    </div>

    <section class="profile-games">
      <h2>juegos de ${escapeHTML(u.name)}</h2>
      <div class="profile-game-grid">${gamesHTML}</div>
    </section>
  `;
}

init();
