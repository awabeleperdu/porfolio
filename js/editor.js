// Éditeur de projet : on compose la page avec des blocs (glisser-déposer ou toucher).
import './errors.js';
import { h, clear, $, readText, slugify } from './dom.js';
import { fail } from './errors.js';
import { toast, switchEl } from './ui.js';
import { getStore } from './store.js';
import { THEMES, applyTheme, themePicker } from './theme.js';
import { blankProject, makeBlock, MODE_LABELS, BADGES } from './model.js';
import { BLOCK_TYPES, renderBlock } from './render.js';
import { initTheme } from './theme.js';

const app = $('#app');
let store = null;
let p = null;
let cats = [];
let selected = null; // id du bloc sélectionné
let itab = 'projet'; // onglet de l'inspecteur : bloc | projet
let device = 'pc';
let previewTheme = 'pro';
let dirty = false;
let saving = false;
let drag = null; // { kind: 'new'|'move', type?, id? }
let isNew = true;

const refs = {};

const TYPE_LABEL = Object.fromEntries(BLOCK_TYPES.map((b) => [b.t, b.label]));
const LANGS = ['python', 'javascript', 'html', 'css', 'bash', 'json', 'texte'];

async function start() {
  store = await getStore();
  store.onAuth(async (user) => {
    if (!user) { location.replace('admin.html'); return; }
    if (p) return;
    try { await load(); } catch (e) { fail(e, 'L’éditeur n’a pas pu démarrer'); }
  });
}

async function load() {
  const id = new URLSearchParams(location.search).get('id');
  const profile = await store.getProfile();
  previewTheme = THEMES[profile.theme] ? profile.theme : 'pro';
  initTheme({ theme: 'pro', visitorThemes: false });
  cats = await store.listCategories();
  if (id) {
    const found = await store.getProject(id);
    if (!found) throw new Error('Ce projet n’existe pas (id : ' + id + '). Retourne à l’admin.');
    p = found;
    p.blocks = p.blocks || [];
    p.tags = p.tags || [];
    isNew = false;
  } else {
    p = blankProject({ categoryId: cats[0] ? cats[0].id : '' });
  }
  build();
}

/* ───────────── squelette ───────────── */
function build() {
  clear(app);
  refs.title = h('input', { class: 'ed-title', value: p.title, 'aria-label': 'Titre du projet', placeholder: 'Titre du projet' });
  refs.title.addEventListener('input', () => { p.title = refs.title.value; touch(); });
  refs.themes = h('div', { class: 'theme-picker ed-themes', role: 'group', 'aria-label': 'Thème de l’aperçu' });
  refs.status = h('span', { class: 'ed-status', 'aria-live': 'polite' });
  refs.pc = h('button', { type: 'button', class: 'ibtn', 'aria-pressed': 'true', title: 'Vue ordinateur' }, 'PC');
  refs.mob = h('button', { type: 'button', class: 'ibtn', 'aria-pressed': 'false', title: 'Vue téléphone' }, 'Mobile');
  refs.pc.addEventListener('click', () => setDevice('pc'));
  refs.mob.addEventListener('click', () => setDevice('mobile'));
  refs.publish = h('button', { type: 'button', class: 'abtn ghost' });
  refs.publish.addEventListener('click', togglePublish);
  refs.save = h('button', { type: 'button', class: 'abtn primary' }, 'Enregistrer');
  refs.save.addEventListener('click', () => save());
  const preview = h('button', { type: 'button', class: 'abtn ghost' }, 'Aperçu');
  preview.addEventListener('click', openPreview);

  const top = h('header', { class: 'ed-top' },
    h('a', { class: 'abtn link', href: 'admin.html', id: 'ed-back' }, '← Admin'),
    refs.title, refs.themes,
    h('div', { class: 'ed-device' }, refs.pc, refs.mob),
    refs.status, preview, refs.publish, refs.save);

  // palette
  const pal = h('aside', { class: 'ed-palette', 'aria-label': 'Blocs à ajouter' }, h('h2', { class: 'ad-h2' }, 'Blocs'),
    h('p', { class: 'ad-sub' }, 'Glisse un bloc dans la page, ou touche-le pour l’ajouter à la fin.'));
  BLOCK_TYPES.forEach((b) => {
    const it = h('button', { type: 'button', class: 'pal-item', draggable: 'true', 'data-type': b.t }, h('span', { class: 'pal-badge' }, b.badge), h('span', null, b.label));
    it.addEventListener('dragstart', (e) => { drag = { kind: 'new', type: b.t }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', b.t); document.body.classList.add('dragging'); });
    it.addEventListener('dragend', endDrag);
    it.addEventListener('click', () => insertAt(p.blocks.length, makeBlock(b.t)));
    pal.append(it);
  });
  pal.append(h('p', { class: 'ad-sub' }, 'Tu peux aussi déposer des fichiers depuis ton ordinateur : image, .py, .js, .html, .css.'));

  refs.page = h('div', { class: 'ed-page', 'data-theme': previewTheme });
  refs.canvas = h('div', { class: 'ed-canvas' });
  refs.stage = h('main', { class: 'ed-stage' }, refs.page);
  refs.page.append(refs.canvas);
  refs.insp = h('aside', { class: 'ed-insp', 'aria-label': 'Réglages' });

  app.append(h('div', { class: 'ed' }, top, h('div', { class: 'ed-body' }, pal, refs.stage, refs.insp)));

  // fichiers déposés depuis le bureau n'importe où dans la scène
  refs.stage.addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); } });
  refs.stage.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    handleFiles([...e.dataTransfer.files], p.blocks.length).catch((x) => fail(x, 'Dépôt impossible'));
  });

  themePicker(refs.themes, previewTheme, (k) => { previewTheme = k; applyTheme(k, refs.page); });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  renderAll();
}

function setDevice(d) {
  device = d;
  refs.pc.setAttribute('aria-pressed', String(d === 'pc'));
  refs.mob.setAttribute('aria-pressed', String(d === 'mobile'));
  refs.canvas.classList.toggle('mobile', d === 'mobile');
}

function renderAll() { renderCanvas(); renderInspector(); renderChrome(); }

function renderChrome() {
  refs.publish.textContent = p.visible ? 'Dépublier' : 'Publier';
  refs.status.textContent = saving ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : isNew ? 'Nouveau projet' : 'Enregistré';
  refs.status.classList.toggle('dirty', dirty);
}

function touch() { dirty = true; renderChrome(); }

/* ───────────── blocs ───────────── */
function hasFiles(e) { return e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'); }
function endDrag() { drag = null; document.body.classList.remove('dragging'); $$gaps().forEach((g) => g.classList.remove('over')); }
function $$gaps() { return [...document.querySelectorAll('.ed-gap')]; }

function insertAt(i, block) {
  p.blocks.splice(i, 0, block);
  selected = block.id;
  itab = 'bloc';
  touch();
  renderAll();
  const el = refs.canvas.querySelector('[data-id="' + block.id + '"]');
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function moveTo(id, i) {
  const from = p.blocks.findIndex((b) => b.id === id);
  if (from < 0) return;
  const [b] = p.blocks.splice(from, 1);
  p.blocks.splice(i > from ? i - 1 : i, 0, b);
  touch();
  renderAll();
}

function step(id, d) {
  const i = p.blocks.findIndex((b) => b.id === id);
  const j = i + d;
  if (i < 0 || j < 0 || j >= p.blocks.length) return;
  [p.blocks[i], p.blocks[j]] = [p.blocks[j], p.blocks[i]];
  touch();
  renderAll();
}

function dup(id) {
  const i = p.blocks.findIndex((b) => b.id === id);
  if (i < 0) return;
  const c = JSON.parse(JSON.stringify(p.blocks[i]));
  c.id = makeBlock('divider').id;
  insertAt(i + 1, c);
}

function del(id) {
  p.blocks = p.blocks.filter((b) => b.id !== id);
  if (selected === id) selected = null;
  touch();
  renderAll();
}

function gap(i) {
  const g = h('div', { class: 'ed-gap', 'data-i': i }, h('span', null, 'Déposer ici'));
  g.addEventListener('dragover', (e) => { if (drag || hasFiles(e)) { e.preventDefault(); g.classList.add('over'); } });
  g.addEventListener('dragleave', () => g.classList.remove('over'));
  g.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    g.classList.remove('over');
    if (hasFiles(e)) { handleFiles([...e.dataTransfer.files], i).catch((x) => fail(x, 'Dépôt impossible')); return; }
    if (!drag) return;
    const d = drag;
    endDrag();
    if (d.kind === 'new') insertAt(i, makeBlock(d.type));
    else moveTo(d.id, i);
  });
  return g;
}

function renderCanvas() {
  clear(refs.canvas);
  refs.canvas.classList.toggle('mobile', device === 'mobile');
  if (!p.blocks.length) {
    refs.canvas.append(gap(0), h('div', { class: 'ed-empty' },
      h('strong', null, 'Page vide'),
      h('p', null, 'Glisse un bloc depuis la gauche, ou dépose directement une image ou un fichier .py.')));
    return;
  }
  p.blocks.forEach((b, i) => {
    refs.canvas.append(gap(i));
    refs.canvas.append(blockEl(b, i));
  });
  refs.canvas.append(gap(p.blocks.length));
}

function blockEl(b, i) {
  const wrap = h('div', {
    class: 'ed-block' + (b.id === selected ? ' sel' : ''), 'data-id': b.id, role: 'button', tabindex: '0',
    'aria-pressed': String(b.id === selected), 'aria-label': TYPE_LABEL[b.type] + ' ' + (i + 1), draggable: 'true'
  });
  const pick = () => { selected = b.id; itab = 'bloc'; renderCanvas(); renderInspector(); };
  wrap.addEventListener('click', pick);
  wrap.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === wrap) { e.preventDefault(); pick(); } });
  wrap.addEventListener('dragstart', (e) => { drag = { kind: 'move', id: b.id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); document.body.classList.add('dragging'); });
  wrap.addEventListener('dragend', endDrag);
  const tb = h('div', { class: 'ed-tools' },
    tool('↑', 'Monter', () => step(b.id, -1), i === 0),
    tool('↓', 'Descendre', () => step(b.id, 1), i === p.blocks.length - 1),
    tool('⧉', 'Dupliquer', () => dup(b.id)),
    tool('✕', 'Supprimer', () => del(b.id)));
  wrap.append(h('span', { class: 'ed-tag' }, TYPE_LABEL[b.type]), tb, h('div', { class: 'ed-content block' }, renderBlock(b, { editing: true, project: p })));
  return wrap;
}

function tool(label, title, fn, disabled) {
  const b = h('button', { type: 'button', class: 'ed-tool', title, 'aria-label': title, disabled: !!disabled }, label);
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

/* ───────────── fichiers déposés ───────────── */
async function handleFiles(files, at) {
  let i = at;
  for (const f of files) {
    const name = f.name || '';
    if (f.type && f.type.startsWith('image/')) {
      const b = makeBlock('image');
      b.src = 'm:' + (await store.saveMedia(f));
      b.caption = '';
      insertAt(i++, b);
    } else if (f.type && f.type.startsWith('video/')) {
      toast('Les vidéos ne sont pas stockées ici : mets-la sur YouTube et colle le lien dans un bloc Vidéo.', 'info');
    } else if (/\.(py|js|mjs|html|css|json|sh|txt)$/i.test(name)) {
      const code = await readText(f);
      const ext = name.split('.').pop().toLowerCase();
      const lang = { py: 'python', js: 'javascript', mjs: 'javascript', html: 'html', css: 'css', json: 'json', sh: 'bash', txt: 'texte' }[ext];
      const b = makeBlock('code');
      b.lang = lang;
      b.code = code;
      insertAt(i++, b);
    } else {
      toast('« ' + name + ' » : format non pris en charge (image, .py, .js, .html, .css).', 'info');
    }
  }
}

function pickFile(accept, cb) {
  const inp = h('input', { type: 'file', accept, hidden: true });
  inp.addEventListener('change', async () => {
    try { if (inp.files[0]) await cb(inp.files[0]); } catch (e) { fail(e, 'Fichier non pris en compte'); }
    inp.remove();
  });
  document.body.append(inp);
  inp.click();
}

/* ───────────── inspecteur ───────────── */
function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', null, label), input, hint ? h('small', null, hint) : null);
}
function textIn(value, onInput, attrs = {}) {
  const i = h('input', { type: 'text', value: value || '', ...attrs });
  i.addEventListener('input', () => onInput(i.value));
  return i;
}
function areaIn(value, onInput, rows = 5, cls = '') {
  const a = h('textarea', { rows, class: cls, spellcheck: 'false' });
  a.value = value || '';
  a.addEventListener('input', () => onInput(a.value));
  return a;
}

function renderInspector() {
  clear(refs.insp);
  const tabs = h('div', { class: 'ad-nav ed-tabs', role: 'tablist' },
    ...[['bloc', 'Bloc'], ['projet', 'Projet']].map(([k, l]) => {
      const t = h('button', { type: 'button', class: 'ad-tab', role: 'tab', 'aria-selected': String(itab === k), 'aria-current': itab === k ? 'page' : null }, l);
      t.addEventListener('click', () => { itab = k; renderInspector(); });
      return t;
    }));
  refs.insp.append(tabs);
  refs.insp.append(itab === 'bloc' ? blockPanel() : projectPanel());
}

function liveBlock(b) {
  // met à jour juste le bloc dans la page, sans toucher à l'inspecteur (garde le focus)
  touch();
  const old = refs.canvas.querySelector('[data-id="' + b.id + '"] .ed-content');
  if (old) old.replaceChildren(renderBlock(b, { editing: true, project: p }));
}

function blockPanel() {
  const b = p.blocks.find((x) => x.id === selected);
  const box = h('div', { class: 'ed-panel' });
  if (!b) {
    box.append(h('p', { class: 'ad-sub' }, 'Touche un bloc dans la page pour le modifier.'));
    return box;
  }
  box.append(h('h2', { class: 'ad-h2' }, TYPE_LABEL[b.type]));
  switch (b.type) {
    case 'title':
      box.append(field('Texte du titre', textIn(b.text, (v) => { b.text = v; liveBlock(b); })));
      break;
    case 'text':
      box.append(field('Texte', areaIn(b.text, (v) => { b.text = v; liveBlock(b); }, 8)));
      break;
    case 'image': {
      const up = h('button', { type: 'button', class: 'abtn primary block' }, b.src ? 'Remplacer l’image' : 'Choisir une image');
      up.addEventListener('click', () => pickFile('image/*', async (f) => {
        up.disabled = true;
        try { b.src = 'm:' + (await store.saveMedia(f)); touch(); renderAll(); toast('Image ajoutée'); } finally { up.disabled = false; }
      }));
      box.append(up,
        field('…ou une adresse d’image', textIn(b.src && !b.src.startsWith('m:') ? b.src : '', (v) => { b.src = v; liveBlock(b); }, { placeholder: 'https://…', type: 'url' }), 'Une URL https vers une image.'),
        field('Légende', textIn(b.caption, (v) => { b.caption = v; liveBlock(b); })));
      break;
    }
    case 'video':
      box.append(field('Lien de la vidéo', textIn(b.url, (v) => { b.url = v; liveBlock(b); }, { placeholder: 'https://youtu.be/…', type: 'url' }), 'YouTube, Vimeo ou un fichier .mp4 hébergé ailleurs.'));
      break;
    case 'code': {
      const sel = h('select', null, LANGS.map((l) => h('option', { value: l, selected: l === b.lang }, l)));
      sel.addEventListener('change', () => { b.lang = sel.value; liveBlock(b); });
      const load = h('button', { type: 'button', class: 'abtn ghost block' }, 'Charger un fichier…');
      load.addEventListener('click', () => pickFile('.py,.js,.mjs,.html,.css,.json,.sh,.txt', async (f) => {
        b.code = await readText(f);
        const ext = f.name.split('.').pop().toLowerCase();
        const m = { py: 'python', js: 'javascript', mjs: 'javascript', html: 'html', css: 'css', json: 'json', sh: 'bash' }[ext];
        if (m) b.lang = m;
        touch(); renderAll();
      }));
      box.append(field('Langage', sel), field('Code', areaIn(b.code, (v) => { b.code = v; liveBlock(b); }, 14, 'mono')), load);
      break;
    }
    case 'run':
      box.append(h('p', { class: 'ad-sub' }, 'Ce bloc affiche la console ou le cadre du projet, selon le mode d’exécution réglé dans l’onglet Projet. Sans bloc de ce type, il est ajouté automatiquement en bas de la page.'));
      break;
    case 'button':
      box.append(field('Texte du bouton', textIn(b.text, (v) => { b.text = v; liveBlock(b); })),
        field('Lien', textIn(b.url, (v) => { b.url = v; liveBlock(b); }, { placeholder: 'https://github.com/…', type: 'url' })));
      break;
    default:
      box.append(h('p', { class: 'ad-sub' }, 'Une simple ligne de séparation.'));
  }
  const row = h('div', { class: 'ad-row gap' },
    h('button', { type: 'button', class: 'abtn ghost', onClick: () => dup(b.id) }, 'Dupliquer'),
    h('button', { type: 'button', class: 'abtn danger', onClick: () => del(b.id) }, 'Supprimer'));
  box.append(row);
  return box;
}

function badgePicker() {
  p.badges = p.badges || [];
  const row = h('div', { class: 'chips' });
  BADGES.forEach((b) => {
    const c = h('button', { type: 'button', class: 'abtn ghost chipb', 'aria-pressed': String(p.badges.includes(b.k)) }, b.label);
    c.addEventListener('click', () => {
      p.badges = p.badges.includes(b.k) ? p.badges.filter((x) => x !== b.k) : [...p.badges, b.k];
      c.setAttribute('aria-pressed', String(p.badges.includes(b.k)));
      touch();
    });
    row.append(c);
  });
  return h('div', { class: 'field' }, h('span', null, 'Badges du projet'), row,
    field('Badge perso (optionnel)', textIn(p.badgeText, (v) => { p.badgeText = v; touch(); }, { placeholder: 'ex. Hackathon 2026', maxlength: '40' })));
}

function projectPanel() {
  const box = h('div', { class: 'ed-panel' });
  const cat = h('select', null, h('option', { value: '' }, '— aucune —'), cats.map((c) => h('option', { value: c.id, selected: c.id === p.categoryId }, c.label)));
  cat.addEventListener('change', () => { p.categoryId = cat.value; touch(); });
  const tags = textIn((p.tags || []).join(', '), (v) => { p.tags = v.split(',').map((t) => t.trim()).filter(Boolean); touch(); }, { placeholder: 'python, réseau, api' });

  // couverture
  const coverBtn = h('button', { type: 'button', class: 'abtn ghost' }, p.cover ? 'Changer la couverture' : 'Choisir une couverture');
  coverBtn.addEventListener('click', () => pickFile('image/*', async (f) => { p.cover = 'm:' + (await store.saveMedia(f)); touch(); renderInspector(); toast('Couverture ajoutée'); }));
  const coverRow = h('div', { class: 'ad-row gap' }, coverBtn,
    p.cover ? h('button', { type: 'button', class: 'abtn link', onClick: () => { p.cover = ''; touch(); renderInspector(); } }, 'Retirer') : null);

  box.append(
    h('h2', { class: 'ad-h2' }, 'Le projet'),
    field('Catégorie', cat),
    field('Description courte', areaIn(p.desc, (v) => { p.desc = v; touch(); }, 3), 'Affichée sur la carte et en haut de la page.'),
    field('Tags', tags, 'Séparés par des virgules.'),
    badgePicker(),
    h('div', { class: 'field' }, h('span', null, 'Image de couverture'), coverRow),
    h('div', { class: 'ad-inline' }, switchEl(p.featured, (v) => { p.featured = v; touch(); }, 'Mettre à la une'), h('span', null, 'Mettre à la une')),
    field('Lien du code (GitHub)', textIn(p.link, (v) => { p.link = v; touch(); }, { type: 'url', placeholder: 'https://github.com/…' })),
    h('h2', { class: 'ad-h2' }, 'Exécution dans le navigateur'));

  const mode = h('select', null, Object.entries(MODE_LABELS).map(([k, l]) => h('option', { value: k, selected: k === p.mode }, l)));
  mode.addEventListener('change', () => { p.mode = mode.value; touch(); renderInspector(); renderCanvas(); });
  box.append(field('Mode', mode));

  if (p.mode === 'py') {
    const load = h('button', { type: 'button', class: 'abtn ghost block' }, 'Charger un fichier .py…');
    load.addEventListener('click', () => pickFile('.py,text/x-python,text/plain', async (f) => { p.code = await readText(f); touch(); renderInspector(); toast('Fichier chargé'); }));
    box.append(field('Programme Python', areaIn(p.code, (v) => { p.code = v; touch(); }, 14, 'mono')), load,
      field('Entrées prédéfinies (une par ligne)', areaIn(p.inputs, (v) => { p.inputs = v; touch(); }, 3, 'mono'), 'Répond aux input() du programme. Le visiteur peut aussi en ajouter.'),
      h('p', { class: 'ad-sub' }, 'Python tourne dans le navigateur (Pyodide). Pas de clé d’API dans le code : elle serait visible de tous.'));
  } else if (p.mode === 'html') {
    const load = h('button', { type: 'button', class: 'abtn ghost block' }, 'Charger un fichier .html…');
    load.addEventListener('click', () => pickFile('.html,.htm,text/html', async (f) => { p.html = await readText(f); touch(); renderInspector(); toast('Fichier chargé'); }));
    box.append(field('Page HTML complète', areaIn(p.html, (v) => { p.html = v; touch(); }, 14, 'mono'), 'Un seul fichier : CSS et JS à l’intérieur de la page.'), load);
  } else if (p.mode === 'embed') {
    box.append(field('Adresse à embarquer', textIn(p.url, (v) => { p.url = v; touch(); }, { type: 'url', placeholder: 'https://…' }), 'Une page hébergée ailleurs (ton autre dépôt GitHub Pages, par exemple).'),
      h('div', { class: 'ad-inline' }, switchEl(p.sameOrigin, (v) => { p.sameOrigin = v; touch(); }, 'Autoriser le même domaine'), h('span', null, 'Page de confiance (même domaine autorisé)')));
  }
  return box;
}

/* ───────────── enregistrer / publier / aperçu ───────────── */
async function save(quiet) {
  if (saving) return false;
  saving = true;
  renderChrome();
  try {
    if (!p.title.trim()) p.title = 'Sans titre';
    await store.saveProject(p);
    dirty = false;
    if (isNew) {
      isNew = false;
      history.replaceState(null, '', 'editeur.html?id=' + encodeURIComponent(p.id));
    }
    if (!quiet) toast('Enregistré');
    return true;
  } catch (e) {
    fail(e, 'Enregistrement impossible');
    return false;
  } finally {
    saving = false;
    renderChrome();
  }
}

async function togglePublish() {
  p.visible = !p.visible;
  if (await save(true)) toast(p.visible ? 'Projet publié' : 'Projet dépublié');
  else p.visible = !p.visible;
  renderChrome();
}

async function openPreview() {
  const w = window.open('', '_blank'); // ouvert tout de suite pour éviter le blocage de popup
  if (await save(true)) {
    const url = 'projet.html?id=' + encodeURIComponent(p.id) + '&preview=1';
    if (w) w.location.href = url; else location.href = url;
  } else if (w) w.close();
}

start().catch((e) => fail(e, 'L’éditeur n’a pas pu démarrer'));
