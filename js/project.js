import './errors.js';
import { h, clear, $ } from './dom.js';
import { fail } from './errors.js';
import { bootSite, projectHref, canRun, fillChrome } from './common.js';
import { mountTabbar } from './cards.js';
import { renderBlocks, runnerSection, loadImage } from './render.js';
import { badgeRow } from './model.js';

async function main() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const preview = params.get('preview') === '1';
  const autostart = params.get('run') === '1';
  const { store, profile } = await bootSite();
  fillChrome(profile);
  mountTabbar('projets');

  const main = clear($('#main'));
  let p = null;
  if (id) p = await store.getProject(id);
  if (p && !p.visible && store.mode === 'local' && !preview) p = null;
  if (!p) {
    document.title = 'Projet introuvable';
    main.append(h('section', { class: 'wrap narrow' }, h('h1', { class: 'h-xl' }, 'Projet introuvable'), h('p', { class: 'lead' }, 'Ce projet n’existe pas ou n’est pas publié.'), h('p', null, h('a', { class: 'btn btn-primary', href: 'projets.html' }, 'Voir tous les projets'))));
    return;
  }
  document.title = p.title + ' · ' + (profile.name || 'Portfolio');

  const cats = await store.listCategories();
  const cat = cats.find((c) => c.id === p.categoryId);
  const links = h('div', { class: 'p-links' });
  if (p.link) links.append(h('a', { class: 'btn btn-ghost', href: p.link, target: '_blank', rel: 'noopener noreferrer' }, 'Voir le code'));
  const run = canRun(p);
  const hasRunBlock = (p.blocks || []).some((b) => b.type === 'run');

  const hero = h('header', { class: 'wrap p-hero' },
    h('p', { class: 'eyebrow' }, [cat ? cat.label : '', p.mode === 'py' ? 'Python dans le navigateur' : ''].filter(Boolean).join(' · ')),
    h('h1', { class: 'p-title' }, p.title),
    badgeRow(p),
    p.desc ? h('p', { class: 'lead' }, p.desc) : null,
    p.role ? h('div', { class: 'pc-role p-role' }, h('span', null, 'Ce que j’ai fait'), h('p', null, p.role)) : null,
    h('div', { class: 'tags' }, (p.tags || []).map((t) => h('span', { class: 'tag' }, t))),
    links);
  if (p.cover) {
    const img = h('img', { class: 'p-cover', alt: '' });
    loadImage(img, p.cover);
    hero.append(img);
  }

  const body = h('div', { class: 'wrap narrow' }, renderBlocks(p.blocks, { project: p, autostart }));
  if (run && !hasRunBlock) body.append(h('div', { class: 'block' }, runnerSection(p, { autostart })));
  if (!(p.blocks || []).length && !run) body.append(h('p', { class: 'muted' }, 'Cette page n’a pas encore de contenu.'));

  const all = (await store.listProjects({ all: false })).filter((x) => x.visible);
  const i = all.findIndex((x) => x.id === p.id);
  const nav = h('nav', { class: 'wrap narrow p-nav', 'aria-label': 'Projets voisins' });
  if (i > 0) nav.append(h('a', { class: 'p-nav-item', href: projectHref(all[i - 1]) }, h('span', { class: 'eyebrow' }, 'Précédent'), h('span', { class: 'p-nav-title' }, all[i - 1].title)));
  if (i > -1 && i < all.length - 1) nav.append(h('a', { class: 'p-nav-item next', href: projectHref(all[i + 1]) }, h('span', { class: 'eyebrow' }, 'Suivant'), h('span', { class: 'p-nav-title' }, all[i + 1].title)));

  main.append(hero, body, nav);
  if (autostart || location.hash === '#essayer') {
    const t = $('#essayer');
    if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }
}

main().catch((err) => {
  fail(err, 'La page du projet n’a pas pu charger');
  const m = $('#main');
  if (m) m.replaceChildren(h('p', { class: 'wrap loading' }, 'Impossible de charger ce projet : voir le message d’erreur en bas de l’écran.'));
});
