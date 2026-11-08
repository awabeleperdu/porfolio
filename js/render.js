// Transforme les blocs d'un projet en éléments DOM. Tout le texte passe par
// textContent : aucune injection HTML possible.
import { h, safeUrl } from './dom.js';
import { resolveSrc } from './media.js';
import { mountRunner } from './runner.js';
import { fail } from './errors.js';
import { canRun } from './common.js';

export const BLOCK_TYPES = [
  { t: 'title', label: 'Titre', badge: 'H' },
  { t: 'text', label: 'Texte', badge: 'Aa' },
  { t: 'image', label: 'Image', badge: 'IMG' },
  { t: 'video', label: 'Vidéo (lien)', badge: 'VID' },
  { t: 'code', label: 'Code', badge: '</>' },
  { t: 'run', label: 'Projet exécutable', badge: 'RUN' },
  { t: 'button', label: 'Bouton lien', badge: 'BTN' },
  { t: 'divider', label: 'Séparateur', badge: '—' }
];

/* ── coloration syntaxique très légère ── */
const KEYWORDS = {
  python: 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield',
  javascript: 'const let var function return if else for while break continue class new this import from export default async await try catch throw typeof instanceof null true false undefined of in switch case',
  css: ''
};
const ALIASES = { py: 'python', js: 'javascript', mjs: 'javascript', ts: 'javascript', typescript: 'javascript' };

export function highlight(code, lang) {
  const l = ALIASES[String(lang || '').toLowerCase()] || String(lang || '').toLowerCase();
  const frag = document.createDocumentFragment();
  if (!KEYWORDS[l] && l !== 'css') { frag.append(document.createTextNode(code)); return frag; }
  const kw = new Set((KEYWORDS[l] || '').split(' '));
  const comment = l === 'python' ? '#.*' : '\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/';
  const re = new RegExp('(' + comment + ')|("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)', 'gm');
  let last = 0;
  let m;
  const span = (cls, text) => frag.append(h('span', { class: cls }, text));
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) frag.append(document.createTextNode(code.slice(last, m.index)));
    if (m[1]) span('tok-c', m[0]);
    else if (m[2]) span('tok-s', m[0]);
    else if (m[3]) span('tok-n', m[0]);
    else if (kw.has(m[4])) span('tok-k', m[0]);
    else if (code[re.lastIndex] === '(') span('tok-f', m[0]);
    else frag.append(document.createTextNode(m[0]));
    last = re.lastIndex;
  }
  if (last < code.length) frag.append(document.createTextNode(code.slice(last)));
  return frag;
}

/* ── vidéo : YouTube, Vimeo ou fichier .mp4/.webm hébergé ── */
export function videoEmbed(url) {
  const u = safeUrl(url);
  if (!u) return h('p', { class: 'b-empty' }, 'Colle un lien de vidéo (YouTube, Vimeo ou fichier .mp4).');
  const yt = u.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (yt) return h('div', { class: 'b-video' }, h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + yt[1], title: 'Vidéo', loading: 'lazy', allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: true }));
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm) return h('div', { class: 'b-video' }, h('iframe', { src: 'https://player.vimeo.com/video/' + vm[1], title: 'Vidéo', loading: 'lazy', allowfullscreen: true }));
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return h('div', { class: 'b-video' }, h('video', { src: u, controls: true, preload: 'metadata' }));
  return h('p', { class: 'b-empty' }, 'Lien de vidéo non reconnu. Utilise YouTube, Vimeo ou un fichier .mp4.');
}

export function loadImage(img, src) {
  if (!src) return;
  resolveSrc(src).then((u) => { if (u) img.src = u; else fail(new Error('Image introuvable dans la base.'), 'Image manquante'); }).catch((e) => fail(e, 'Image introuvable'));
}

/* ── un bloc ── */
export function renderBlock(b, ctx = {}) {
  switch (b.type) {
    case 'title':
      return h('h2', { class: 'b-title' }, b.text || '');
    case 'text':
      return h('p', { class: 'b-text' }, b.text || '');
    case 'image': {
      if (!b.src) return h('div', { class: 'b-image-empty' }, 'Image : choisis un fichier dans le panneau de droite');
      const img = h('img', { class: 'b-img', alt: b.caption || '', loading: 'lazy' });
      loadImage(img, b.src);
      return h('figure', { class: 'b-figure' }, img, b.caption ? h('figcaption', null, b.caption) : null);
    }
    case 'video':
      return videoEmbed(b.url);
    case 'code': {
      const pre = h('pre', null, h('code', null, highlight(b.code || '', b.lang)));
      const copy = h('button', { type: 'button', class: 'code-copy' }, 'Copier');
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(b.code || ''); copy.textContent = 'Copié'; setTimeout(() => (copy.textContent = 'Copier'), 1500); }
        catch (e) { copy.textContent = 'Copie impossible'; }
      });
      return h('div', { class: 'b-code' }, h('div', { class: 'code-bar' }, h('span', null, b.lang || 'code'), copy), pre);
    }
    case 'run':
      if (ctx.editing) return h('div', { class: 'b-run-empty' }, 'Projet exécutable · la console ou le cadre s’affiche ici');
      return ctx.project && canRun(ctx.project) ? runnerSection(ctx.project, ctx) : h('p', { class: 'b-empty' }, 'Aucun programme à lancer : renseigne le mode d’exécution dans l’éditeur.');
    case 'button': {
      const href = safeUrl(b.url);
      return h('div', { class: 'b-button' }, h('a', { class: 'btn btn-primary', href: href || undefined, target: '_blank', rel: 'noopener noreferrer' }, b.text || 'Lien'));
    }
    case 'divider':
      return h('hr', { class: 'b-divider' });
    default:
      return h('div');
  }
}

export function runnerSection(project, ctx = {}) {
  return h('section', { class: 'b-runner', id: 'essayer' },
    h('h2', { class: 'b-title' }, 'Essaie-le ici'),
    mountRunner(project, { autostart: ctx.autostart }));
}

export function renderBlocks(blocks, ctx = {}) {
  const root = h('div', { class: 'blocks' });
  (blocks || []).forEach((b) => root.append(h('div', { class: 'block' }, renderBlock(b, ctx))));
  return root;
}
