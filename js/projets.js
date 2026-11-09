import './errors.js';
import { h, clear, $, $$ } from './dom.js';
import { fail } from './errors.js';
import { bootSite, canRun, fillChrome } from './common.js';
import { projectCard, mountTabbar } from './cards.js';

async function main() {
  const { store, profile } = await bootSite();
  document.title = 'Projets · ' + (profile.name || 'Portfolio');
  const [cats, projects] = await Promise.all([store.listCategories(), store.listProjects({ all: false })]);
  fillChrome(profile);
  mountTabbar('projets');
  const live = projects.filter(canRun).length;
  $('#projets-count').textContent = projects.length + ' projet' + (projects.length > 1 ? 's' : '') + (live ? ' · ' + live + ' se lance' + (live > 1 ? 'nt' : '') + ' ici' : '');

  const state = { cat: 'all' };
  const grid = $('#grid');
  const filters = $('#filters');
  const render = () => {
    clear(grid);
    const list = projects.filter((p) => state.cat === 'all' || p.categoryId === state.cat);
    list.forEach((p) => grid.append(projectCard(p, projects.indexOf(p), cats)));
    const e = $('#empty');
    e.hidden = list.length > 0;
    if (!list.length) e.textContent = projects.length ? 'Aucun projet dans cette catégorie.' : 'Aucun projet publié pour le moment.';
    $$('button', filters).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
  };
  const used = cats.filter((c) => projects.some((p) => p.categoryId === c.id));
  [{ id: 'all', label: 'Tout' }, ...used].forEach((c) => {
    filters.append(h('button', { type: 'button', class: 'chip', 'data-cat': c.id, 'aria-pressed': String(c.id === 'all'), onClick: () => { state.cat = c.id; render(); } }, c.label));
  });
  if (used.length < 2) filters.closest('.sticky-chips').hidden = true;
  render();
}

main().catch((err) => {
  fail(err, 'Les projets n’ont pas pu charger');
  const m = $('#main');
  if (m) m.prepend(h('p', { class: 'wrap loading' }, 'Impossible de charger les données : voir le message d’erreur en bas de l’écran.'));
});
