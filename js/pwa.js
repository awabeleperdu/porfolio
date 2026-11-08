// Installation en application + service worker. Chargé par toutes les pages.
import { h } from './dom.js';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navigation privée */ } }
};

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker non enregistré :', e.message));
  });
}

const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let deferred = null;
let pill = null;

function show(label, onClick, hint) {
  if (standalone || store.get('pwa-dismissed') === '1' || pill) return;
  pill = h('div', { class: 'pwa-pill', role: 'region', 'aria-label': 'Installer l’application' },
    h('button', { type: 'button', class: 'pwa-go' }, label),
    hint ? h('span', { class: 'pwa-hint' }, hint) : null,
    h('button', { type: 'button', class: 'pwa-x', 'aria-label': 'Masquer' }, '×'));
  pill.querySelector('.pwa-go').addEventListener('click', onClick);
  pill.querySelector('.pwa-x').addEventListener('click', () => { store.set('pwa-dismissed', '1'); pill.remove(); });
  document.body.append(pill);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  show('Installer l’application', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    if (pill) pill.remove();
  });
});
window.addEventListener('appinstalled', () => { if (pill) pill.remove(); });

// iPhone / iPad (Safari) : pas de bouton automatique, on explique le geste.
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
if (ios && !standalone) {
  setTimeout(() => show('Ajouter à l’écran d’accueil', () => alert('Touche le bouton Partager (le carré avec la flèche), puis « Sur l’écran d’accueil ».'), null), 2500);
}
