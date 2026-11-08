import { h } from './dom.js';

export const THEMES = {
  pro: { name: 'Pro', desc: 'Clair, sobre et professionnel. Bleu profond, ombres douces.', bg: '#f6f5f1', a: '#1d4ed8' },
  minuit: { name: 'Minuit', desc: 'Sombre et net, accent menthe.', bg: '#09090b', a: '#5eead4' },
  studio: { name: 'Studio', desc: 'Papier crème et serif éditorial, façon magazine.', bg: '#f4efe6', a: '#c2410c' },
  verre: { name: 'Verre', desc: 'Panneaux de verre flou sur un fond de lumières.', bg: '#0b1020', a: '#7dd3fc' },
  brut: { name: 'Brut', desc: 'Jaune, bordures épaisses, ombres dures.', bg: '#ffe14d', a: '#ff6fa5' },
  neon: { name: 'Néon', desc: 'Nuit violette, grille et lueurs fuchsia.', bg: '#07040f', a: '#e879f9' }
};

export function applyTheme(key, el = document.documentElement) {
  el.setAttribute('data-theme', THEMES[key] ? key : 'pro');
}

// Thème du site = celui choisi dans l'admin, sauf si le visiteur en a choisi un autre.
export function initTheme(profile) {
  let key = THEMES[profile.theme] ? profile.theme : 'pro';
  if (profile.visitorThemes !== false) {
    try {
      const v = localStorage.getItem('pf:theme');
      if (v && THEMES[v]) key = v;
    } catch (e) { /* stockage bloqué : on garde le thème du site */ }
  }
  applyTheme(key);
  return key;
}

export function themeDot(key, on) {
  const t = THEMES[key];
  return h('span', { class: 'tdot' + (on ? ' on' : ''), style: { background: 'linear-gradient(135deg, ' + t.bg + ' 50%, ' + t.a + ' 50%)' } });
}

// Pastilles de choix de thème. onPick(key) est appelé au clic.
export function themePicker(container, current, onPick) {
  container.replaceChildren();
  Object.keys(THEMES).forEach((k) => {
    const b = h('button', { type: 'button', class: 'tbtn', 'aria-pressed': String(k === current), 'aria-label': 'Thème ' + THEMES[k].name, title: THEMES[k].name }, themeDot(k, k === current));
    b.addEventListener('click', () => {
      onPick(k);
      themePicker(container, k, onPick);
    });
    container.append(b);
  });
}
