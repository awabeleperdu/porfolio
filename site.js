import './errors.js';
import { h, clear, $, $$, safeUrl, playIcon } from './dom.js';
import { fail } from './errors.js';
import { bootSite, fillAvatar, projectHref, canRun } from './common.js';
import { themePicker, applyTheme } from './theme.js';
import { loadImage } from './render.js';
import { badgeRow } from './model.js';

async function main() {
  const { store, profile } = await bootSite();
  const [cats, projects] = await Promise.all([store.listCategories(), store.listProjects({ all: false })]);
  const show = { projets: true, apropos: true, contact: true, ...(profile.sections || {}) };

  /* en-tête, hero, carte */
  $('#brand-name').textContent = profile.name || 'Portfolio';
  $('#footer-name').textContent = '© ' + new Date().getFullYear() + ' ' + (profile.name || '');
  fillAvatar($('#avatar-s'), profile);
  $('#hero-role').textContent = profile.role || '';
  const title = $('#hero-title');
  const head = profile.headline || '';
  const hl = profile.highlight && head.includes(profile.highlight) ? profile.highlight : '';
  if (hl) {
    const [before, ...rest] = head.split(hl);
    title.append(document.createTextNode(before), h('span', { class: 'hl' }, hl), document.createTextNode(rest.join(hl)));
  } else title.textContent = head;
  $('#hero-intro').textContent = profile.intro || '';
  $('#card-name').textContent = profile.name || '';
  $('#card-sub').textContent = (profile.skills || []).slice(0, 3).map((s) => s.name).join(' · ');

  const rows = [
    ['email', profile.email, profile.email ? 'mailto:' + profile.email : ''],
    ['github', profile.github, profile.github],
    ['linkedin', profile.linkedin, profile.linkedin],
    ['tél.', profile.phone, profile.phone ? 'tel:' + profile.phone.replace(/\s+/g, '') : '']
  ].filter((r) => r[1]);
  $('#card-sign').textContent = profile.email || '—';
  $('#card-cvv').textContent = profile.cardCode || '';
  const back = $('#back-rows');
  if (!rows.length) back.append(h('span', { class: 'muted' }, 'Ajoute tes coordonnées dans Admin → Profil.'));
  rows.forEach(([k, v, href]) => {
    const safe = safeUrl(/^(github|linkedin)/.test(k) && !/^https?:/.test(href) ? 'https://' + href : href);
    back.append(h('span', { class: 'back-row' }, h('span', { class: 'muted' }, k), safe ? h('a', { href: safe, target: '_blank', rel: 'noopener noreferrer' }, v) : h('span', null, v)));
  });

  const flip = $('#flip-card');
  const flipBtn = $('#flip-btn');
  const toggle = () => {
    const on = flip.classList.toggle('flipped');
    flipBtn.setAttribute('aria-pressed', String(on));
    flipBtn.textContent = on ? 'Revenir au recto' : 'Retourner la carte';
  };
  flip.addEventListener('click', (e) => { if (!e.target.closest('a')) toggle(); });
  flipBtn.addEventListener('click', toggle);

  /* défilement des compétences */
  const words = (profile.skills || []).map((s) => s.name);
  const list = words.length ? words : ['Portfolio'];
  const track = $('#marquee');
  for (let i = 0; i < 4; i++) list.forEach((w) => track.append(h('span', null, w), h('i', { class: 'dot' })));

  /* sélecteur de thème visiteur */
  const picker = $('#theme-picker');
  if (profile.visitorThemes === false) picker.hidden = true;
  else {
    themePicker(picker, document.documentElement.getAttribute('data-theme'), (k) => {
      applyTheme(k);
      try { localStorage.setItem('pf:theme', k); } catch (e) { /* ignoré : le choix ne sera pas mémorisé */ }
    });
  }

  /* sections cachées */
  ['projets', 'apropos', 'contact'].forEach((s) => {
    if (!show[s]) {
      const sec = $('#' + s);
      if (sec) sec.hidden = true;
      $$('[data-nav="' + s + '"]').forEach((a) => (a.hidden = true));
    }
  });

  /* projets */
  const state = { cat: 'all' };
  const filters = $('#filters');
  const featured = $('#featured');
  const grid = $('#grid');
  const empty = $('#empty');
  const liveCount = projects.filter(canRun).length;
  $('#projets-count').textContent = '01 · ' + projects.length + ' projet' + (projects.length > 1 ? 's' : '') + ', ' + liveCount + ' exécutable' + (liveCount > 1 ? 's' : '');

  const card = (p, i, big) => {
    const thumb = h('div', { class: 'thumb', 'data-i': String((projects.indexOf(p)) % 6), 'aria-hidden': 'true' });
    if (p.cover) {
      const img = h('img', { alt: '', loading: 'lazy' });
      loadImage(img, p.cover);
      thumb.append(img);
    } else {
      thumb.append(h('span', { class: 'thumb-idx' }, String(projects.indexOf(p) + 1).padStart(2, '0')), h('span', { class: 'thumb-title' }, p.title));
    }
    const cat = cats.find((c) => c.id === p.categoryId);
    const run = canRun(p);
    const body = h('div', { class: 'card-body' },
      h('div', { class: 'card-meta' }, h('span', { class: 'eyebrow' }, big ? 'À la une · ' + (cat ? cat.label : '') : (cat ? cat.label : '')), run ? h('span', { class: 'badge' }, p.mode === 'py' ? 'python live' : 'live') : null),
      h('h3', { class: 'card-title' }, h('a', { href: projectHref(p) }, p.title)),
      h('p', { class: 'card-desc' }, p.desc || ''),
      badgeRow(p),
      h('div', { class: 'tags' }, (p.tags || []).map((t) => h('span', { class: 'tag' }, t))),
      h('div', { class: 'card-actions' },
        run ? h('a', { class: 'btn btn-primary', href: projectHref(p, '&run=1#essayer') }, playIcon(), 'Lancer') : null,
        h('a', { class: 'btn ' + (run ? 'btn-link' : 'btn-ghost'), href: projectHref(p) }, 'Voir le projet'))
    );
    return h('article', { class: 'card' + (big ? ' card-feat' : '') }, thumb, body);
  };

  const render = () => {
    const list = projects.filter((p) => state.cat === 'all' || p.categoryId === state.cat);
    clear(featured);
    clear(grid);
    let rest = list;
    if (state.cat === 'all') {
      const f = list.find((p) => p.featured);
      if (f) { featured.append(card(f, 0, true)); rest = list.filter((p) => p !== f); }
    }
    rest.forEach((p, i) => grid.append(card(p, i, false)));
    empty.hidden = list.length > 0;
    if (!list.length) empty.textContent = projects.length ? 'Aucun projet dans cette catégorie.' : 'Aucun projet publié pour le moment.';
    $$('button', filters).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
  };
  const usedCats = cats.filter((c) => projects.some((p) => p.categoryId === c.id));
  [{ id: 'all', label: 'Tout' }, ...usedCats].forEach((c) => {
    filters.append(h('button', { type: 'button', class: 'chip', 'data-cat': c.id, 'aria-pressed': String(c.id === 'all'), onClick: () => { state.cat = c.id; render(); } }, c.label));
  });
  if (usedCats.length < 2) filters.hidden = true;
  render();

  /* à propos */
  const portrait = $('#portrait');
  portrait.classList.add('avatar');
  fillAvatar(portrait, profile);
  $('#about-title').textContent = 'Salut, moi c’est ' + ((profile.name || '').split(' ')[0] || '…') + '.';
  $('#about-bio').textContent = profile.bio || '';
  const skills = $('#skills');
  (profile.skills || []).forEach((s) => {
    const lv = Math.max(0, Math.min(5, Number(s.level) || 0));
    skills.append(h('div', { class: 'skill' }, h('span', null, s.name), h('span', { class: 'dots', role: 'img', 'aria-label': 'Niveau ' + lv + ' sur 5' }, '●'.repeat(lv) + '○'.repeat(5 - lv))));
  });

  /* contact */
  const cl = $('#contact-links');
  rows.forEach(([k, v, href]) => {
    const safe = safeUrl(/^(github|linkedin)/.test(k) && !/^https?:/.test(href) ? 'https://' + href : href);
    cl.append(h('a', { class: 'btn btn-ghost btn-lg', href: safe || undefined, target: safe && safe.startsWith('http') ? '_blank' : undefined, rel: 'noopener noreferrer' }, k + ' · ' + v));
  });
  if (!rows.length) $('#contact').querySelector('.contact-links').append(h('p', { class: 'muted' }, 'Aucune coordonnée renseignée.'));
}

main().catch((err) => {
  fail(err, 'Le site n’a pas pu charger ses données');
  const m = $('#main');
  if (m) m.prepend(h('p', { class: 'wrap loading' }, 'Impossible de charger les données : voir le message d’erreur en bas de l’écran.'));
});
