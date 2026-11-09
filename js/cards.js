// Morceaux partagés par l'accueil, la page Projets, la page Contact et la page projet :
// barre du bas (téléphone), carte de projet, démo en direct, coordonnées.
import { h, safeUrl } from './dom.js';
import { projectHref, canRun } from './common.js';
import { loadImage } from './render.js';
import { badgeRow } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const icon = (paths, size = 22) => {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = paths;
  return s;
};
export const ICONS = {
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  github: '<path d="M9 19c-4 1.2-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.3 1.3a11.5 11.5 0 0 0-6 0C6.7 2.5 5.7 2.8 5.7 2.8a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.3 9.2c0 4.7 2.8 5.7 5.5 6A3 3 0 0 0 9 17.5V21"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'
};
export const svgIcon = (k, size) => icon(ICONS[k], size);

/* barre du bas : visible seulement sur téléphone (CSS) */
export function mountTabbar(active) {
  const items = [['home', 'Accueil', 'index.html', 'accueil', 'home'], ['projets', 'Projets', 'projets.html', 'projets', 'grid'], ['contact', 'Contact', 'contact.html', 'contact', 'mail']];
  const nav = h('nav', { class: 'tabbar', 'aria-label': 'Navigation' }, items.map(([, label, href, key, ic]) =>
    h('a', { href, class: key === active ? 'on' : '', 'aria-current': key === active ? 'page' : undefined }, svgIcon(ic), label)));
  document.body.append(nav);
}

/* carte de projet (toute la carte est un lien) */
export function projectCard(p, index, cats) {
  const cover = h('div', { class: 'pc-cover', 'data-i': String(index % 6) });
  if (p.cover) {
    const img = h('img', { alt: '', loading: 'lazy' });
    loadImage(img, p.cover);
    cover.append(img);
  }
  const run = canRun(p);
  cover.append(
    h('div', { class: 'pc-top' }, h('span', { class: 'pc-idx' }, String(index + 1).padStart(2, '0')), run ? h('span', { class: 'pc-live' }, h('i'), 'SE LANCE ICI') : null),
    h('div', { class: 'pc-title' }, p.title));
  const cat = (cats || []).find((c) => c.id === p.categoryId);
  return h('a', { class: 'pcard', href: projectHref(p) },
    cover,
    h('div', { class: 'pc-body' },
      badgeRow(p),
      p.desc ? h('p', { class: 'pc-desc' }, p.desc) : null,
      p.role ? h('div', { class: 'pc-role' }, h('span', null, 'Ce que j’ai fait'), h('p', null, p.role)) : null,
      h('div', { class: 'pc-foot' }, h('span', { class: 'pc-cat' }, cat ? cat.label : ''), h('span', { class: 'pc-cta' }, run ? '▸ Lancer la démo' : 'Voir le projet →'))));
}

/* carte « démo en direct » de l'accueil : aperçu du code + bouton Lancer */
export function liveCard(p) {
  const lines = (p.code || '').split('\n').filter((l) => l.trim()).slice(0, 5).join('\n');
  const kind = p.mode === 'py' ? 'LIVE · PYTHON' : 'LIVE · DANS LE NAVIGATEUR';
  return h('div', { class: 'live' },
    h('div', { class: 'live-bar' }, h('span', { class: 'live-k' }, h('i'), kind), h('span', { class: 'live-n' }, p.title)),
    lines ? h('pre', { class: 'live-code' }, lines) : (p.desc ? h('p', { class: 'live-desc' }, p.desc) : null),
    h('a', { class: 'live-go', href: projectHref(p, '&run=1#essayer') }, svgIcon('play', 16), 'Lancer'));
}
ICONS.play = '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>';

/* coordonnées : [clé, libellé, valeur, lien sûr ou '', icône] */
export function contactRows(profile) {
  const web = (u) => (u && !/^https?:/i.test(u) ? 'https://' + u : u);
  const rows = [
    ['email', 'Email', profile.email, profile.email ? 'mailto:' + profile.email : '', 'mail'],
    ['github', 'GitHub', (profile.github || '').replace(/^https?:\/\/(www\.)?github\.com\//i, ''), safeUrl(web(profile.github)), 'github'],
    ['linkedin', 'LinkedIn', (profile.linkedin || '').replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/)?/i, ''), safeUrl(web(profile.linkedin)), 'link'],
    ['tel', 'Téléphone', profile.phone, profile.phone ? 'tel:' + profile.phone.replace(/\s+/g, '') : '', 'phone']
  ];
  return rows.filter((r) => r[2]);
}
export const cvHref = (profile) => safeUrl(profile.cvUrl || '');
