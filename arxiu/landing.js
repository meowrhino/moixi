// arxiu/landing.js — render del grid de juegos del arxiu con filtros y búsqueda.
// Carga datos mockeados de examples/arxiu-mock.json hasta que F10b (Workers + R2) esté online.

const MOCK_URL = './examples/arxiu-mock.json';

const $ = (s) => document.querySelector(s);

let allGames = [];
let users = {};
const state = {
  query: '',
  tag: '',
  author: '',
  sort: 'recent',
};

function fmtDate(iso) {
  // 2026-05-11 → 11 may 2026
  const [y, m, d] = iso.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function applyFilters(games) {
  const q = state.query.trim().toLowerCase();
  let out = games.filter(g => {
    if (q) {
      const hay = `${g.name} ${g.author} ${g.tags.join(' ')} ${g.summary}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (state.tag && !g.tags.includes(state.tag)) return false;
    if (state.author && g.authorHandle !== state.author) return false;
    return true;
  });
  switch (state.sort) {
    case 'plays': out.sort((a, b) => b.plays - a.plays); break;
    case 'forks': out.sort((a, b) => b.forks - a.forks); break;
    case 'random': out = out.map(g => ({ g, k: Math.random() })).sort((a, b) => a.k - b.k).map(o => o.g); break;
    case 'recent':
    default:
      out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return out;
}

function gameCard(g) {
  const tagsHTML = g.tags.map(t => `<span class="tag">${t}</span>`).join('');
  const forkBadge = g.forkOf
    ? `<span class="fork-badge" title="fork de ${g.forkOf}">↳ fork</span>`
    : '';
  return `
    <article class="card" data-href="./game.html?id=${encodeURIComponent(g.id)}" tabindex="0" role="link" aria-label="${escapeHTML(g.name)} por ${escapeHTML(g.author)}">
      <div class="card-thumb" style="background: ${g.thumb};" aria-hidden="true"></div>
      <div class="card-body">
        <div class="card-title">${escapeHTML(g.name)}${forkBadge}</div>
        <div class="card-byline">
          <span class="by">por</span>
          <a href="./u.html?handle=${encodeURIComponent(g.authorHandle)}" class="author-link">${escapeHTML(g.author)}</a>
        </div>
        <p class="card-summary">${escapeHTML(g.summary)}</p>
        <div class="card-tags">${tagsHTML}</div>
        <div class="card-stats">
          <span title="plays">▶ ${g.plays}</span>
          <span title="forks">↳ ${g.forks}</span>
          <span title="rooms">⌂ ${g.rooms}</span>
          <span class="card-date">${fmtDate(g.updatedAt)}</span>
        </div>
      </div>
    </article>
  `;
}

function bindCardClicks() {
  document.querySelectorAll('.card[data-href]').forEach(card => {
    card.addEventListener('click', (e) => {
      // No interceptar clicks sobre sub-links (author, tag links).
      if (e.target.closest('a')) return;
      location.href = card.dataset.href;
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        location.href = card.dataset.href;
      }
    });
  });
}

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render() {
  const filtered = applyFilters(allGames);
  const grid = $('#grid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">nada coincide. <button class="ghost" id="reset-empty">limpiar filtros</button></div>`;
    $('#reset-empty')?.addEventListener('click', clearFilters);
  } else {
    grid.innerHTML = filtered.map(gameCard).join('');
    bindCardClicks();
  }
  $('#filter-results').textContent = `${filtered.length} ${filtered.length === 1 ? 'juego' : 'juegos'}`;
}

function populateFilters() {
  const allTags = [...new Set(allGames.flatMap(g => g.tags))].sort();
  const authors = [...new Set(allGames.map(g => g.authorHandle))].sort();
  const tagSel = $('#filter-tag');
  for (const t of allTags) tagSel.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`);
  const authorSel = $('#filter-author');
  for (const a of authors) authorSel.insertAdjacentHTML('beforeend', `<option value="${a}">${users[a]?.name ?? a}</option>`);
}

function clearFilters() {
  state.query = '';
  state.tag = '';
  state.author = '';
  state.sort = 'recent';
  $('#search').value = '';
  $('#filter-tag').value = '';
  $('#filter-author').value = '';
  $('#sort').value = 'recent';
  render();
}

function bind() {
  $('#search').addEventListener('input', e => { state.query = e.target.value; render(); });
  $('#filter-tag').addEventListener('change', e => { state.tag = e.target.value; render(); });
  $('#filter-author').addEventListener('change', e => { state.author = e.target.value; render(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#clear-filters').addEventListener('click', clearFilters);
}

async function init() {
  try {
    const data = await fetch(`${MOCK_URL}?t=${Date.now()}`).then(r => r.json());
    allGames = data.games || [];
    users = data.users || {};
  } catch (e) {
    $('#grid').innerHTML = `<div class="empty">no se pudo cargar el arxiu (${escapeHTML(e.message)}).</div>`;
    return;
  }
  populateFilters();
  bind();
  render();
}

init();
