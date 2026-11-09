import './errors.js';
import { h, clear, $ } from './dom.js';
import { fail } from './errors.js';
import { bootSite, fillAvatar, canRun, fillChrome } from './common.js';
import { projectCard, liveCard, mountTabbar, hasCv, setCvLink } from './cards.js';

async function main() {
  const { store, profile } = await bootSite();
  const [cats, projects] = await Promise.all([store.listCategories(), store.listProjects({ all: false })]);
  const show = { projets: true, apropos: true, contact: true, ...(profile.sections || {}) };
  fillChrome(profile);
  mountTabbar('accueil');

  /* accueil : titre, intro précise, puce « je cherche », boutons */
  $('#hero-role').textContent = profile.role || '';
  const title = $('#hero-title');
  const head = profile.headline || '';
  const hl = profile.highlight && head.includes(profile.highlight) ? profile.highlight : '';
  if (hl) {
    const [before, ...rest] = head.split(hl);
    title.append(document.createTextNode(before), h('span', { class: 'hl' }, hl), document.createTextNode(rest.join(hl)));
  } else title.textContent = head;
  $('#hero-intro').textContent = profile.intro || '';
  if (profile.seeking) { const s = $('#seeking'); s.textContent = 'Je cherche : ' + profile.seeking; s.hidden = false; }
  if (hasCv(profile)) { const b = $('#cv-btn'); b.hidden = false; setCvLink(b, profile); }

  /* démo en direct : le premier projet qui peut se lancer */
  const live = projects.find((p) => canRun(p) && p.mode === 'py') || projects.find(canRun);
  if (live) { const box = $('#hero-live'); box.append(liveCard(live)); box.hidden = false; }

  /* À voir d'abord : 3 projets (à la une en premier), le reste sur la page Projets */
  const ordered = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)];
  const top = ordered.slice(0, 3);
  const box = $('#top-projects');
  clear(box);
  top.forEach((p) => box.append(projectCard(p, projects.indexOf(p), cats)));
  const liveCount = projects.filter(canRun).length;
  $('#projets-count').textContent = projects.length + ' projet' + (projects.length > 1 ? 's' : '') + (liveCount ? ' · ' + liveCount + ' se lance' + (liveCount > 1 ? 'nt' : '') + ' ici' : '');
  if (projects.length > top.length) { const a = $('#see-all'); a.textContent = 'Tout voir (' + projects.length + ') →'; a.hidden = false; }
  if (!projects.length) { const e = $('#empty'); e.textContent = 'Aucun projet publié pour le moment.'; e.hidden = false; }

  /* à propos : court, avec les compétences en puces */
  fillAvatar($('#portrait'), profile);
  $('#about-title').textContent = 'Salut, moi c’est ' + ((profile.name || '').split(' ')[0] || '…') + '.';
  $('#about-bio').textContent = profile.bio || '';
  const skills = $('#skills');
  (profile.skills || []).forEach((s) => skills.append(h('span', { class: 'skill-chip' }, s.name)));

  /* sections cachées depuis l'admin */
  if (!show.projets) { $('#projets').hidden = true; document.querySelectorAll('[data-page="projets"]').forEach((a) => (a.hidden = true)); }
  if (!show.apropos) { $('#apropos').hidden = true; document.querySelectorAll('[data-page="apropos"]').forEach((a) => (a.hidden = true)); }
  if (!show.contact) document.querySelectorAll('[data-page="contact"]').forEach((a) => (a.hidden = true));
}

main().catch((err) => {
  fail(err, 'Le site n’a pas pu charger ses données');
  const m = $('#main');
  if (m) m.prepend(h('p', { class: 'wrap loading' }, 'Impossible de charger les données : voir le message d’erreur en bas de l’écran.'));
});
