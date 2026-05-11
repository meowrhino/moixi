// arxiu/game.js — página individual de un juego del arxiu.
// Lee ?id=<gameId> de la URL y renderiza metadata + iframe del player (o link mock).

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
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    $('#game-page').innerHTML = `<div class="empty">falta el id del juego en la url.</div>`;
    return;
  }
  let data;
  try { data = await fetch(MOCK_URL).then(r => r.json()); }
  catch (e) {
    $('#game-page').innerHTML = `<div class="empty">no se pudo cargar (${escapeHTML(e.message)}).</div>`;
    return;
  }
  const g = data.games.find(x => x.id === id);
  if (!g) {
    $('#game-page').innerHTML = `<div class="empty">juego "<code>${escapeHTML(id)}</code>" no encontrado en el arxiu.</div>`;
    return;
  }
  document.title = `moixi · ${g.name}`;

  // Si el playUrl no es mock, lo embebimos. Si es mock, mostramos un placeholder con el thumb.
  const isPlayable = g.playUrl && g.playUrl !== '#mock';
  const playerHTML = isPlayable
    ? `<iframe class="game-iframe" src="${escapeHTML(g.playUrl)}" loading="lazy" allow="autoplay"></iframe>`
    : `<div class="game-placeholder" style="background: ${g.thumb};">
         <div class="placeholder-text">
           <strong>${escapeHTML(g.name)}</strong>
           <span>juego mock — todavía sin player real</span>
         </div>
       </div>`;

  // Genealogía
  const forks = data.games.filter(x => x.forkOf === g.id);
  const parent = g.forkOf ? data.games.find(x => x.id === g.forkOf) : null;

  const tagsHTML = g.tags.map(t => `<a class="tag" href="./?#${encodeURIComponent(t)}">${t}</a>`).join('');
  const featuresHTML = g.features.map(f => `<code>${f}</code>`).join(' · ');

  $('#game-page').innerHTML = `
    <div class="game-hero">
      <h1>${escapeHTML(g.name)}</h1>
      <div class="game-byline">
        por <a href="./u.html?handle=${encodeURIComponent(g.authorHandle)}" class="author-link">${escapeHTML(g.author)}</a>
        · publicado ${fmtDate(g.publishedAt)}
        ${g.updatedAt !== g.publishedAt ? `· actualizado ${fmtDate(g.updatedAt)}` : ''}
      </div>
      ${parent ? `<div class="fork-of">↳ fork de <a href="./game.html?id=${encodeURIComponent(parent.id)}">${escapeHTML(parent.name)}</a></div>` : ''}
    </div>

    <div class="game-layout">
      <div class="game-canvas">${playerHTML}</div>
      <aside class="game-sidebar">
        <div class="sidebar-block">
          <p class="game-summary">${escapeHTML(g.summary)}</p>
        </div>
        <div class="sidebar-block">
          <div class="meta-row"><span class="meta-k">rooms</span><span class="meta-v">${g.rooms}</span></div>
          <div class="meta-row"><span class="meta-k">sprites</span><span class="meta-v">${g.sprites}</span></div>
          <div class="meta-row"><span class="meta-k">paletas</span><span class="meta-v">${g.palettes}</span></div>
          <div class="meta-row"><span class="meta-k">plays</span><span class="meta-v">${g.plays}</span></div>
          <div class="meta-row"><span class="meta-k">forks</span><span class="meta-v">${g.forks}</span></div>
        </div>
        <div class="sidebar-block">
          <h3>tags</h3>
          <div class="card-tags">${tagsHTML}</div>
        </div>
        <div class="sidebar-block">
          <h3>features</h3>
          <div class="features">${featuresHTML}</div>
        </div>
        <div class="sidebar-block actions">
          <button class="primary" disabled title="próximamente: F10b">fork (próximamente)</button>
          <button disabled title="próximamente: F10b">editar (próximamente)</button>
          <button class="ghost" onclick="navigator.share ? navigator.share({title:document.title, url:location.href}) : navigator.clipboard.writeText(location.href)">compartir link</button>
        </div>
        ${forks.length ? `
          <div class="sidebar-block">
            <h3>forks (${forks.length})</h3>
            <ul class="fork-list">
              ${forks.map(f => `<li><a href="./game.html?id=${encodeURIComponent(f.id)}">${escapeHTML(f.name)}</a> · ${escapeHTML(f.author)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </aside>
    </div>
  `;
}

init();
