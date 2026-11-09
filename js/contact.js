import './errors.js';
import { h, $ } from './dom.js';
import { fail } from './errors.js';
import { bootSite, fillChrome } from './common.js';
import { mountTabbar, contactRows, hasCv, setCvLink, svgIcon } from './cards.js';

async function main() {
  const { profile } = await bootSite();
  document.title = 'Contact · ' + (profile.name || 'Portfolio');
  fillChrome(profile);
  mountTabbar('contact');

  $('#card-name').textContent = profile.name || '';
  $('#card-sub').textContent = (profile.skills || []).slice(0, 3).map((s) => s.name).join(' · ');
  $('#card-sign').textContent = profile.name || profile.email || '—';
  $('#card-cvv').textContent = profile.cardCode || '';
  const rows = contactRows(profile);
  const back = $('#back-rows');
  if (!rows.length) back.append(h('span', { class: 'muted' }, 'Ajoute tes coordonnées dans Admin → Profil.'));
  rows.forEach(([, label, v, href]) => back.append(h('span', { class: 'back-row' }, h('span', { class: 'muted' }, label), href ? h('a', { href, target: href.startsWith('http') ? '_blank' : undefined, rel: 'noopener noreferrer' }, v) : h('span', null, v))));

  const flip = $('#flip-card');
  const flipBtn = $('#flip-btn');
  const toggle = () => {
    const on = flip.classList.toggle('flipped');
    flipBtn.setAttribute('aria-pressed', String(on));
    flipBtn.textContent = on ? 'Revenir au recto' : 'Retourner la carte';
  };
  flip.addEventListener('click', (e) => { if (!e.target.closest('a')) toggle(); });
  flipBtn.addEventListener('click', toggle);

  /* gros boutons : un email s'ouvre directement dans l'appli de messagerie */
  const actions = $('#contact-links');
  const labels = { email: 'Écrire un email', github: 'Voir mon GitHub', linkedin: 'Voir mon LinkedIn', tel: 'Appeler' };
  rows.forEach(([key, , , href, ic], i) => {
    if (!href) return;
    actions.append(h('a', { class: 'c-btn' + (i === 0 ? ' primary' : ''), href, target: href.startsWith('http') ? '_blank' : undefined, rel: 'noopener noreferrer' }, svgIcon(ic, 20), labels[key]));
  });
  if (hasCv(profile)) { const a = h('a', { class: 'c-btn' }, svgIcon('dl', 20), 'Télécharger mon CV'); actions.append(a); setCvLink(a, profile); }
  if (!actions.children.length) actions.append(h('p', { class: 'muted' }, 'Aucune coordonnée renseignée.'));
  const first = actions.querySelector('.c-btn');
  if (first && !actions.querySelector('.primary')) first.classList.add('primary');
}

main().catch((err) => fail(err, 'La page contact n’a pas pu charger'));
