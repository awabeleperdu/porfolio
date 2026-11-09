import { getStore } from './store.js';
import { initTheme, themePicker, applyTheme } from './theme.js';
import { initials, $ } from './dom.js';
import { resolveSrc } from './media.js';
import { fail } from './errors.js';

export async function bootSite() {
  const store = await getStore();
  const profile = await store.getProfile();
  initTheme(profile);
  document.title = (profile.name || 'Portfolio') + ' · Portfolio';
  return { store, profile };
}

// Remplit un rond/rectangle avec la photo, ou avec les initiales si pas de photo.
export async function fillAvatar(el, profile) {
  el.textContent = initials(profile.name);
  if (!profile.photo) return;
  try {
    const url = await resolveSrc(profile.photo);
    if (url) {
      el.style.backgroundImage = 'url("' + url + '")';
      el.classList.add('has-photo');
      el.textContent = '';
    }
  } catch (e) {
    fail(e, 'Photo introuvable');
  }
}

export const projectHref = (p, extra = '') => 'projet.html?id=' + encodeURIComponent(p.id) + extra;

export function canRun(p) {
  return (p.mode === 'py' && !!p.code) || (p.mode === 'html' && !!p.html) || (p.mode === 'embed' && !!p.url);
}

// En-tête et pied de page communs : nom, avatar, sélecteur de thème visiteur.
export function fillChrome(profile) {
  const set = (sel, fn) => { const el = $(sel); if (el) fn(el); };
  set('#brand-name', (el) => { el.textContent = profile.name || 'Portfolio'; });
  set('#footer-name', (el) => { el.textContent = '© ' + new Date().getFullYear() + ' ' + (profile.name || ''); });
  set('#avatar-s', (el) => fillAvatar(el, profile));
  set('#theme-picker', (picker) => {
    if (profile.visitorThemes === false) { picker.hidden = true; return; }
    themePicker(picker, document.documentElement.getAttribute('data-theme'), (k) => {
      applyTheme(k);
      try { localStorage.setItem('pf:theme', k); } catch (e) { /* ignoré : le choix ne sera pas mémorisé */ }
    });
  });
}
