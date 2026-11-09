import { uid, h } from './dom.js';

export function blankProject(over = {}) {
  const now = Date.now();
  return {
    id: uid() + uid().slice(0, 3),
    title: 'Nouveau projet',
    categoryId: '',
    desc: '',
    role: '',
    tags: [],
    mode: 'none', // none | py | html | embed
    code: '',
    inputs: '',
    html: '',
    url: '',
    sameOrigin: false,
    link: '',
    visible: false,
    featured: false,
    order: now,
    cover: '',
    badges: [],
    badgeText: '',
    blocks: [],
    createdAt: now,
    updatedAt: now,
    ...over
  };
}

export function makeBlock(type) {
  const id = uid();
  switch (type) {
    case 'title': return { id, type, text: 'Nouveau titre' };
    case 'text': return { id, type, text: 'Écris ton texte ici.' };
    case 'image': return { id, type, src: '', caption: '' };
    case 'video': return { id, type, url: '' };
    case 'code': return { id, type, lang: 'python', code: 'print("Bonjour")' };
    case 'run': return { id, type };
    case 'button': return { id, type, text: 'Voir le code', url: '' };
    default: return { id, type: 'divider' };
  }
}

export const MODE_LABELS = {
  none: 'Page seulement',
  py: 'Python · Pyodide',
  html: 'HTML · cadre isolé',
  embed: 'Embarqué · URL'
};

// Badges d'un projet : choisis dans l'éditeur (onglet Projet). Pour en ajouter, ajoute une ligne ici.
export const BADGES = [
  { k: 'vibe', label: 'Vibe codé', tone: 'a' },
  { k: 'hand', label: 'Codé à la main', tone: 'b' },
  { k: 'ia', label: 'Assisté par IA', tone: 'a' },
  { k: 'tested', label: 'Testé et fonctionnel', tone: 'ok' },
  { k: 'wip', label: 'En cours', tone: 'warn' },
  { k: 'school', label: 'Projet scolaire', tone: 'b' },
  { k: 'perso', label: 'Projet perso', tone: 'b' }
];

// Rangée de badges (null s'il n'y en a pas). Texte seulement, jamais de HTML.
export function badgeRow(p) {
  const out = [];
  (p.badges || []).forEach((k) => {
    const b = BADGES.find((x) => x.k === k);
    if (b) out.push(h('span', { class: 'pbadge tone-' + b.tone }, b.label));
  });
  const custom = String(p.badgeText || '').trim();
  if (custom) out.push(h('span', { class: 'pbadge tone-b' }, custom.slice(0, 40)));
  return out.length ? h('div', { class: 'pbadges' }, out) : null;
}
