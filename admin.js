import './errors.js';
import { h, clear, $, uid, slugify, downloadText } from './dom.js';
import { fail, explain } from './errors.js';
import { toast, switchEl } from './ui.js';
import { getStore } from './store.js';
import { THEMES } from './theme.js';
import { analyzeFile, MAX_DOC } from './analyze.js';
import { blankProject, makeBlock, MODE_LABELS } from './model.js';
import { fillAvatar } from './common.js';

const app = $('#app');
let store = null;
let currentUid = null;
const TABS = [
  { id: 'projets', label: 'Projets' },
  { id: 'cats', label: 'Catégories' },
  { id: 'themes', label: 'Thèmes' },
  { id: 'profil', label: 'Profil et site' },
  { id: 'aide', label: 'Aide et Python' }
];
let tab = (location.hash || '#projets').slice(1);
if (!TABS.some((t) => t.id === tab)) tab = 'projets';

async function start() {
  store = await getStore();
  store.onAuth((user) => {
    if (user) {
      if (user.uid !== currentUid) { currentUid = user.uid; shell(user); }
    } else {
      currentUid = null;
      loginView();
    }
  });
}

/* ───────────── connexion ───────────── */
function loginView() {
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const email = h('input', { type: 'email', id: 'lg-mail', autocomplete: 'username', required: true, placeholder: 'toi@exemple.fr' });
  const pass = h('input', { type: 'password', id: 'lg-pass', autocomplete: 'current-password', required: true });
  const btn = h('button', { type: 'submit', class: 'abtn primary block' }, 'Se connecter');
  const form = h('form', { class: 'login-card' },
    h('h1', null, 'Admin'),
    h('p', { class: 'ad-sub' }, 'Connecte-toi avec le compte créé dans Firebase (Authentication).'),
    h('label', { class: 'field', for: 'lg-mail' }, h('span', null, 'Email'), email),
    h('label', { class: 'field', for: 'lg-pass' }, h('span', null, 'Mot de passe'), pass),
    err, btn,
    h('p', { class: 'ad-sub' }, h('a', { href: './' }, '← Retour au site')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Connexion…';
    try { await store.login(email.value.trim(), pass.value); }
    catch (ex) {
      const x = explain(ex);
      err.textContent = x.message + (x.detail ? '  [' + x.detail + ']' : '');
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  });
  clear(app).append(h('div', { class: 'login' }, form));
}

/* ───────────── coque de l'admin ───────────── */
function shell(user) {
  const main = h('main', { class: 'ad-main' });
  const nav = h('nav', { class: 'ad-nav', 'aria-label': 'Sections' });
  const paintNav = () => {
    clear(nav);
    TABS.forEach((t) => nav.append(h('button', { type: 'button', class: 'ad-tab', 'aria-current': t.id === tab ? 'page' : null, onClick: () => go(t.id) }, t.label)));
  };
  const go = async (id) => {
    tab = id;
    history.replaceState(null, '', '#' + id);
    paintNav();
    await render();
  };
  const render = async () => {
    clear(main).append(h('p', { class: 'ad-loading' }, 'Chargement…'));
    try {
      const view = h('div');
      if (tab === 'projets') await projectsTab(view);
      else if (tab === 'cats') await categoriesTab(view);
      else if (tab === 'themes') await themesTab(view);
      else if (tab === 'profil') await profileTab(view);
      else await helpTab(view, user);
      clear(main).append(view);
    } catch (e) {
      fail(e, 'Impossible d’afficher cette section');
      clear(main).append(h('div', { class: 'note bad' }, explain(e).message));
    }
  };
  const side = h('aside', { class: 'ad-side' },
    h('div', { class: 'ad-brand' }, h('span', { class: 'ad-dot' }), 'Admin'),
    nav,
    h('div', { class: 'ad-side-foot' },
      h('a', { class: 'ad-link', href: './' }, 'Voir le site'),
      store.mode === 'firebase' ? h('button', { type: 'button', class: 'ad-link', onClick: () => store.logout().catch((e) => fail(e, 'Déconnexion impossible')) }, 'Déconnexion (' + (user.email || '') + ')') : null));
  const banner = store.mode === 'local'
    ? h('div', { class: 'note info ad-banner' }, 'Mode local : tout fonctionne, mais les données restent dans ce navigateur. Remplis firebase-config.js avec ta config Firebase pour publier en ligne (voir README).')
    : null;
  clear(app).append(h('div', { class: 'ad-layout' }, side, h('div', { class: 'ad-col' }, banner, main)));
  paintNav();
  render();
}

const head = (title, sub, action) => h('div', { class: 'ad-head' }, h('div', null, h('h1', null, title), sub ? h('p', { class: 'ad-sub' }, sub) : null), action || null);
const field = (label, input, hint) => h('label', { class: 'field' }, h('span', null, label), input, hint ? h('small', null, hint) : null);
const noteEl = (tone, text) => h('div', { class: 'note ' + tone, role: tone === 'bad' ? 'alert' : null }, text);
const prettify = (name) => {
  const t = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Nouveau projet';
};

/* ───────────── projets ───────────── */
async function projectsTab(el) {
  const [projects, cats] = await Promise.all([store.listProjects({ all: true }), store.listCategories()]);
  el.append(head('Projets', projects.length + ' projet' + (projects.length > 1 ? 's' : '') + ', ' + projects.filter((p) => p.visible).length + ' publié' + (projects.filter((p) => p.visible).length > 1 ? 's' : ''), h('a', { class: 'abtn primary', href: 'editeur.html' }, 'Nouveau projet')));

  if (!projects.length && !cats.length) {
    el.append(h('div', { class: 'ad-card' },
      h('h2', null, 'La base est vide'),
      h('p', { class: 'ad-sub' }, 'Charge les exemples (profil, 3 catégories, 6 projets dont 2 en Python) pour voir le site fonctionner, puis modifie-les.'),
      h('button', { type: 'button', class: 'abtn primary', onClick: async (e) => {
        e.target.disabled = true;
        try { await store.seed(); toast('Exemples chargés'); tabReload(); } catch (ex) { e.target.disabled = false; fail(ex, 'Chargement des exemples impossible'); }
      } }, 'Charger les exemples')));
  }

  /* zone de dépôt + analyse */
  const result = h('div');
  const input = h('input', { type: 'file', id: 'dz-file', accept: '.py,.html,.htm', class: 'sr-only' });
  const dz = h('div', { class: 'dz' },
    h('div', { class: 'dz-title' }, 'Dépose ton projet ici'),
    h('p', { class: 'ad-sub' }, 'Un fichier .py ou .html. Je lis le code, je détecte ce dont il a besoin, et je te dis comment le faire tourner.'),
    h('label', { class: 'abtn ghost', for: 'dz-file' }, 'Choisir un fichier'), input);
  const analyse = async (file) => {
    clear(result);
    try { result.append(analysisCard(await analyzeFile(file))); }
    catch (e) { result.append(noteEl('bad', explain(e).message)); }
  };
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('over');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) analyse(f); else result.replaceChildren(noteEl('bad', 'Aucun fichier reçu. Si tu as glissé un dossier, mets-le dans le dépôt GitHub (projets/<nom>/).'));
  });
  input.addEventListener('change', () => { if (input.files[0]) analyse(input.files[0]); input.value = ''; });
  el.append(dz, result);

  function analysisCard(a) {
    const verdictClass = a.verdict === 'browser' ? 'ok' : a.verdict === 'server' ? 'warn' : 'bad';
    return h('section', { class: 'ad-card analysis' },
      h('div', { class: 'ad-row' }, h('div', null, h('code', null, a.name), h('h2', null, a.label)), h('span', { class: 'pill ' + verdictClass }, a.short)),
      a.mods.length ? h('div', { class: 'modchips' }, a.mods.map((m) => h('span', { class: 'mod ' + m.k }, m.name))) : null,
      h('div', { class: 'notes' }, a.notes.map((n) => noteEl(n.tone, n.text))),
      h('div', { class: 'ad-row gap' },
        h('button', { type: 'button', class: 'abtn primary', onClick: async (e) => {
          e.target.disabled = true;
          try { await createFromAnalysis(a); } catch (ex) { e.target.disabled = false; fail(ex, 'Création du projet impossible'); }
        } }, 'Créer la page du projet'),
        h('button', { type: 'button', class: 'abtn ghost', onClick: () => clear(result) }, 'Ignorer')));
  }

  async function createFromAnalysis(a) {
    const p = blankProject({ title: prettify(a.name), categoryId: (cats[0] && cats[0].id) || '' });
    if (a.text.length > MAX_DOC && (a.verdict === 'browser' || a.ext === 'html')) throw new Error('Ce fichier dépasse la limite de la base (~900 Ko). Mets-le dans le dépôt GitHub et utilise le mode « Embarqué ».');
    if (a.ext === 'py' && a.verdict === 'browser') {
      p.mode = 'py';
      p.code = a.text;
      p.tags = ['Python'];
      p.blocks = [{ ...makeBlock('title'), text: 'Un programme qui tourne ici' }, { ...makeBlock('text'), text: 'Ce code Python s’exécute dans ton navigateur, sans serveur.' }, makeBlock('run')];
    } else if (a.ext === 'py') {
      p.tags = ['Python'];
      p.blocks = [{ ...makeBlock('text'), text: 'Ce projet ne peut pas tourner dans le navigateur. Ajoute une vidéo, des captures et le lien GitHub.' }, { ...makeBlock('code'), lang: 'python', code: a.text.slice(0, MAX_DOC) }];
    } else {
      p.mode = 'html';
      p.html = a.text;
      p.tags = ['HTML', 'JavaScript'];
      p.blocks = [makeBlock('run')];
    }
    await store.saveProject(p);
    location.href = 'editeur.html?id=' + encodeURIComponent(p.id);
  }

  /* tableau */
  const sorted = projects.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const catName = (id) => (cats.find((c) => c.id === id) || {}).label || 'Sans catégorie';
  const table = h('div', { class: 'tbl-wrap' });
  const tbl = h('div', { class: 'tbl' }, h('div', { class: 'tr th' }, h('span', null, 'Projet'), h('span', null, 'Catégorie'), h('span', null, 'Exécution'), h('span', null, 'À la une'), h('span', null, 'Publié'), h('span', { class: 'r' }, 'Actions')));
  sorted.forEach((p, i) => {
    const pub = switchEl(p.visible, async (v) => {
      try { await store.saveProject({ ...p, visible: v }); p.visible = v; toast(v ? 'Projet publié' : 'Projet masqué'); }
      catch (e) { pub.setAttribute('aria-checked', String(!v)); fail(e, 'Modification impossible'); }
    }, 'Publié : ' + p.title);
    const feat = switchEl(!!p.featured, async (v) => {
      try { await store.saveProject({ ...p, featured: v }); p.featured = v; }
      catch (e) { feat.setAttribute('aria-checked', String(!v)); fail(e, 'Modification impossible'); }
    }, 'À la une : ' + p.title);
    const swap = async (j) => {
      const other = sorted[j];
      try {
        const a = p.order, b = other.order;
        await Promise.all([store.saveProject({ ...p, order: b }), store.saveProject({ ...other, order: a })]);
        tabReload();
      } catch (e) { fail(e, 'Réordonnancement impossible'); }
    };
    tbl.append(h('div', { class: 'tr' },
      h('span', { class: 'tc-title' }, p.title),
      h('span', { class: 'muted' }, catName(p.categoryId)),
      h('span', { class: 'muted' }, MODE_LABELS[p.mode] || p.mode),
      h('span', null, feat),
      h('span', null, pub),
      h('span', { class: 'r acts' },
        h('button', { type: 'button', class: 'ibtn', 'aria-label': 'Monter ' + p.title, disabled: i === 0, onClick: () => swap(i - 1) }, '↑'),
        h('button', { type: 'button', class: 'ibtn', 'aria-label': 'Descendre ' + p.title, disabled: i === sorted.length - 1, onClick: () => swap(i + 1) }, '↓'),
        h('a', { class: 'abtn link', href: 'editeur.html?id=' + encodeURIComponent(p.id) }, 'Modifier'),
        h('button', { type: 'button', class: 'abtn danger', onClick: async () => {
          if (!confirm('Supprimer « ' + p.title + ' » ? Cette action est définitive.')) return;
          try { await store.deleteProject(p.id); toast('Projet supprimé'); tabReload(); } catch (e) { fail(e, 'Suppression impossible'); }
        } }, 'Supprimer'))));
  });
  if (sorted.length) { table.append(tbl); el.append(table); }
}

let tabReload = () => location.reload();

/* ───────────── catégories ───────────── */
async function categoriesTab(el) {
  tabReload = () => categoriesRefresh();
  const refresh = async () => { clear(el); await categoriesTab(el); };
  const categoriesRefresh = refresh;
  const [cats, projects] = await Promise.all([store.listCategories(), store.listProjects({ all: true })]);
  el.append(head('Catégories', 'Elles apparaissent comme filtres sur le portfolio.'));
  const name = h('input', { type: 'text', id: 'cat-new', placeholder: 'Ex. Jeux' });
  const add = async () => {
    const label = name.value.trim();
    if (!label) { toast('Écris un nom de catégorie', 'info'); return; }
    let id = slugify(label) || uid();
    if (cats.some((c) => c.id === id)) id += '-' + uid().slice(0, 3);
    try { await store.saveCategory({ id, label, order: (cats.length ? Math.max(...cats.map((c) => c.order ?? 0)) : 0) + 1 }); await refresh(); } catch (e) { fail(e, 'Ajout impossible'); }
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  el.append(h('div', { class: 'ad-inline' }, field('Nouvelle catégorie', name), h('button', { type: 'button', class: 'abtn primary', onClick: add }, 'Ajouter')));
  const list = h('div', { class: 'cat-list' });
  cats.forEach((c, i) => {
    const input = h('input', { type: 'text', value: c.label, 'aria-label': 'Nom de la catégorie' });
    input.addEventListener('change', async () => {
      const label = input.value.trim();
      if (!label) { input.value = c.label; return; }
      try { await store.saveCategory({ ...c, label }); c.label = label; toast('Catégorie renommée'); } catch (e) { input.value = c.label; fail(e, 'Renommage impossible'); }
    });
    const n = projects.filter((p) => p.categoryId === c.id).length;
    const swap = async (j) => {
      const o = cats[j];
      try { await Promise.all([store.saveCategory({ ...c, order: o.order }), store.saveCategory({ ...o, order: c.order })]); await refresh(); } catch (e) { fail(e, 'Réordonnancement impossible'); }
    };
    list.append(h('div', { class: 'ad-card cat-row' },
      h('div', { class: 'grow' }, input, h('small', null, n + ' projet' + (n > 1 ? 's' : ''))),
      h('button', { type: 'button', class: 'ibtn', 'aria-label': 'Monter', disabled: i === 0, onClick: () => swap(i - 1) }, '↑'),
      h('button', { type: 'button', class: 'ibtn', 'aria-label': 'Descendre', disabled: i === cats.length - 1, onClick: () => swap(i + 1) }, '↓'),
      h('button', { type: 'button', class: 'abtn danger', onClick: async () => {
        if (!confirm('Supprimer la catégorie « ' + c.label + ' » ?' + (n ? ' Ses ' + n + ' projet(s) passeront « sans catégorie ».' : ''))) return;
        try { await store.deleteCategory(c.id); await refresh(); } catch (e) { fail(e, 'Suppression impossible'); }
      } }, 'Supprimer')));
  });
  el.append(list);
  if (!cats.length) el.append(h('p', { class: 'ad-sub' }, 'Aucune catégorie pour l’instant.'));
}

/* ───────────── thèmes ───────────── */
async function themesTab(el) {
  const profile = await store.getProfile();
  el.append(head('Thèmes', 'Choisis le look du site. Les visiteurs peuvent aussi en changer si tu actives l’option.'));
  const grid = h('div', { class: 'theme-grid' });
  const paint = () => {
    clear(grid);
    Object.entries(THEMES).forEach(([k, t]) => {
      const on = profile.theme === k;
      grid.append(h('button', { type: 'button', class: 'theme-card', 'aria-pressed': String(on), onClick: async () => {
        const prev = profile.theme;
        profile.theme = k;
        paint();
        try { await store.saveProfile(profile); toast('Thème « ' + t.name + ' » appliqué'); } catch (e) { profile.theme = prev; paint(); fail(e, 'Enregistrement impossible'); }
      } },
      h('span', { class: 'theme-prev', style: { background: t.bg } }, h('i', { style: { background: t.a } }), h('b', { style: { color: t.a } }, 'Aa')),
      h('span', { class: 'theme-info' }, h('strong', null, t.name), h('small', null, t.desc))));
    });
  };
  paint();
  el.append(grid);
  const sw = switchEl(profile.visitorThemes !== false, async (v) => {
    try { profile.visitorThemes = v; await store.saveProfile(profile); toast(v ? 'Sélecteur affiché' : 'Sélecteur masqué'); } catch (e) { sw.setAttribute('aria-checked', String(!v)); profile.visitorThemes = !v; fail(e, 'Enregistrement impossible'); }
  }, 'Les visiteurs peuvent changer de thème');
  el.append(h('div', { class: 'ad-card ad-row' }, h('div', null, h('strong', null, 'Les visiteurs peuvent changer de thème'), h('p', { class: 'ad-sub' }, 'Affiche les pastilles de thème dans la barre du site.')), sw));
}

/* ───────────── profil ───────────── */
async function profileTab(el) {
  const p = await store.getProfile();
  p.skills = p.skills || [];
  p.sections = { projets: true, apropos: true, contact: true, ...(p.sections || {}) };
  el.append(head('Profil et site', 'Tout ce qui s’affiche sur le portfolio vient d’ici : change ces champs et le site devient celui de quelqu’un d’autre.'));

  const text = (key, label, opts = {}) => {
    const i = opts.area ? h('textarea', { rows: opts.rows || 4 }) : h('input', { type: opts.type || 'text', placeholder: opts.ph || '' });
    i.value = p[key] || '';
    i.addEventListener('input', () => { p[key] = i.value; });
    return field(label, i, opts.hint);
  };

  /* photo */
  const prev = h('div', { class: 'avatar avatar-prev', role: 'img', 'aria-label': 'Aperçu de ta photo' });
  fillAvatar(prev, p);
  const file = h('input', { type: 'file', accept: 'image/*', id: 'ph-file' });
  const photoErr = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const removeBtn = h('button', { type: 'button', class: 'abtn ghost', hidden: !p.photo, onClick: async () => {
    p.photo = '';
    try { await store.saveProfile(p); } catch (e) { fail(e, 'Enregistrement impossible'); return; }
    prev.style.backgroundImage = '';
    prev.classList.remove('has-photo');
    fillAvatar(prev, p);
    removeBtn.hidden = true;
  } }, 'Retirer la photo');
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    photoErr.hidden = true;
    try {
      const id = await store.saveMedia(f);
      p.photo = 'm:' + id;
      await store.saveProfile(p);
      prev.style.backgroundImage = '';
      prev.classList.remove('has-photo');
      await fillAvatar(prev, p);
      removeBtn.hidden = false;
      toast('Photo enregistrée');
    } catch (e) {
      photoErr.textContent = explain(e).message;
      photoErr.hidden = false;
    }
    file.value = '';
  });

  el.append(h('section', { class: 'ad-card' },
    h('h2', null, 'Photo'),
    h('div', { class: 'photo-row' }, prev, h('div', { class: 'grow' }, field('Choisir une photo', file, 'Portrait vertical, visage centré. Elle est redimensionnée automatiquement.'), photoErr, removeBtn))));

  el.append(h('section', { class: 'ad-card' },
    h('h2', null, 'Présentation'),
    h('div', { class: 'grid2' }, text('name', 'Nom affiché'), text('role', 'Ligne sous le nom', { ph: 'Étudiant en BTS CIEL' })),
    h('div', { class: 'grid2' }, text('headline', 'Grande phrase d’accueil'), text('highlight', 'Mots mis en couleur', { hint: 'Doit être copié exactement depuis la phrase.' })),
    text('intro', 'Phrase d’introduction', { area: true, rows: 2 }),
    text('bio', 'Bio (section À propos)', { area: true, rows: 5 })));

  el.append(h('section', { class: 'ad-card' },
    h('h2', null, 'Contact (verso de la carte)'),
    h('div', { class: 'grid2' }, text('email', 'Email', { type: 'email' }), text('phone', 'Téléphone', { hint: 'Laisse vide pour ne pas l’afficher.' })),
    h('div', { class: 'grid2' }, text('github', 'GitHub', { ph: 'github.com/…' }), text('linkedin', 'LinkedIn', { ph: 'linkedin.com/in/…' })),
    text('cardCode', 'Petit code décoratif sur la carte', { ph: '031' })));

  /* compétences */
  const skillsBox = h('div', { class: 'skills-ed' });
  const paintSkills = () => {
    clear(skillsBox);
    p.skills.forEach((s, i) => {
      const n = h('input', { type: 'text', value: s.name, 'aria-label': 'Compétence', placeholder: 'Python' });
      n.addEventListener('input', () => { s.name = n.value; });
      const lv = h('select', { 'aria-label': 'Niveau', value: String(s.level ?? 3) }, [0, 1, 2, 3, 4, 5].map((x) => h('option', { value: String(x) }, x + ' / 5')));
      lv.addEventListener('change', () => { s.level = Number(lv.value); });
      skillsBox.append(h('div', { class: 'skill-row' }, n, lv, h('button', { type: 'button', class: 'ibtn', 'aria-label': 'Retirer cette compétence', onClick: () => { p.skills.splice(i, 1); paintSkills(); } }, '✕')));
    });
  };
  paintSkills();
  el.append(h('section', { class: 'ad-card' }, h('h2', null, 'Compétences'), skillsBox,
    h('button', { type: 'button', class: 'abtn ghost', onClick: () => { p.skills.push({ name: '', level: 3 }); paintSkills(); } }, 'Ajouter une compétence')));

  /* sections */
  const secs = h('div');
  [['projets', 'Projets'], ['apropos', 'À propos'], ['contact', 'Contact']].forEach(([k, label]) => {
    secs.append(h('div', { class: 'ad-row sw-row' }, h('span', null, label), switchEl(p.sections[k] !== false, (v) => { p.sections[k] = v; }, 'Afficher la section ' + label)));
  });
  el.append(h('section', { class: 'ad-card' }, h('h2', null, 'Sections visibles'), secs));

  el.append(h('div', { class: 'ad-row gap' }, h('button', { type: 'button', class: 'abtn primary', onClick: async (e) => {
    e.target.disabled = true;
    try { p.skills = p.skills.filter((s) => s.name.trim()); await store.saveProfile(p); toast('Profil enregistré'); } catch (ex) { fail(ex, 'Enregistrement impossible'); }
    e.target.disabled = false;
  } }, 'Enregistrer le profil')));

  /* sauvegarde / transmission */
  const imp = h('input', { type: 'file', accept: 'application/json,.json', id: 'imp-file', class: 'sr-only' });
  imp.addEventListener('change', async () => {
    const f = imp.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!confirm('Remplacer le profil, les catégories et les projets par le contenu de cette sauvegarde ?')) return;
      await store.importAll(data);
      toast('Sauvegarde importée');
      go('profil');
    } catch (e) { fail(e instanceof SyntaxError ? new Error('Ce fichier n’est pas du JSON valide.') : e, 'Import impossible'); }
    imp.value = '';
  });
  const go = (id) => { tab = id; location.reload(); };
  el.append(h('section', { class: 'ad-card' },
    h('h2', null, 'Sauvegarde et transmission'),
    h('p', { class: 'ad-sub' }, 'Exporte tout (profil, catégories, projets, images) dans un fichier. Pour donner le site à quelqu’un : il récupère le dépôt GitHub, branche son propre Firebase, et remplit son profil. Tu peux aussi lui envoyer ta sauvegarde.'),
    h('div', { class: 'ad-row gap' },
      h('button', { type: 'button', class: 'abtn ghost', onClick: async (e) => {
        e.target.disabled = true;
        try { downloadText('portfolio-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(await store.exportAll())); toast('Sauvegarde téléchargée'); } catch (ex) { fail(ex, 'Export impossible'); }
        e.target.disabled = false;
      } }, 'Exporter une sauvegarde'),
      h('label', { class: 'abtn ghost', for: 'imp-file' }, 'Importer une sauvegarde'), imp)));
}

/* ───────────── aide, diagnostic, Python ───────────── */
async function helpTab(el, user) {
  el.append(head('Aide et Python', 'Diagnostic de la connexion et guide pour tes projets Python.'));

  const uidCode = h('code', { class: 'uid' }, user.uid);
  const result = h('div');
  el.append(h('section', { class: 'ad-card' },
    h('h2', null, 'Diagnostic'),
    h('dl', { class: 'kv' },
      h('dt', null, 'Mode'), h('dd', null, store.mode === 'firebase' ? 'Firebase (en ligne)' : 'Local (ce navigateur seulement)'),
      h('dt', null, 'Projet Firebase'), h('dd', null, store.projectId),
      h('dt', null, 'Connecté'), h('dd', null, user.email || '—'),
      h('dt', null, 'Ton UID'), h('dd', null, uidCode, ' ', h('button', { type: 'button', class: 'abtn link', onClick: async (e) => {
        try { await navigator.clipboard.writeText(user.uid); e.target.textContent = 'Copié'; } catch (ex) { e.target.textContent = 'Copie impossible : sélectionne le texte'; }
      } }, 'Copier'))),
    store.mode === 'firebase' ? h('p', { class: 'ad-sub' }, 'Colle cet UID dans le fichier firestore.rules (à la place de COLLE_ICI_TON_UID), puis publie les règles dans la console Firebase. Sans ça, l’écriture est refusée.') : null,
    h('button', { type: 'button', class: 'abtn primary', onClick: async (e) => {
      e.target.disabled = true;
      clear(result).append(noteEl('info', 'Test en cours…'));
      try { clear(result).append(noteEl('ok', await store.ping())); }
      catch (ex) { const x = explain(ex); clear(result).append(noteEl('bad', x.message + (x.detail ? '  [' + x.detail + ']' : ''))); }
      e.target.disabled = false;
    } }, 'Tester la connexion'),
    result));

  const modes = [
    ['Navigateur', 'ok', 'Python léger, HTML / JS', 'Maths, algos, scripts, pandas, numpy : ça tourne chez le visiteur avec Pyodide, sans serveur. Les projets HTML / JS s’ouvrent dans un cadre isolé.'],
    ['Serveur', 'warn', 'Flask, bots, MediaVault', 'Un programme qui doit rester allumé est hébergé à part (Render, PythonAnywhere). Ajoute-le en mode « Embarqué » avec son URL.'],
    ['Local', 'bad', 'Matériel, Windows, fenêtres', 'ULTRON ou AudioMixer ne peuvent pas tourner chez un visiteur : vidéo, code et lien GitHub à la place.']
  ];
  el.append(h('h2', { class: 'ad-h2' }, 'Où tourne ton projet ?'),
    h('div', { class: 'cards3' }, modes.map(([b, tone, t, d]) => h('div', { class: 'ad-card' }, h('span', { class: 'pill ' + tone }, b), h('h3', null, t), h('p', { class: 'ad-sub' }, d)))));

  const steps = [
    ['Dépose ton fichier dans Projets', 'Je lis les imports et je te dis dans quel cas tu es : navigateur, serveur ou local.'],
    ['Adapte ce qui est signalé', 'input() : les valeurs se saisissent dans le champ « Entrées ». requests : à tester, l’API doit accepter les appels depuis un site (CORS).'],
    ['Aucune clé dans le code', 'Si ton projet utilise une API avec clé, l’appel passe par un petit proxy qui garde la clé secrète (exemple plus bas).'],
    ['Compose la page et publie', 'Texte, images, vidéo et bloc « Projet exécutable » dans l’éditeur. Puis l’interrupteur « Publié ».']
  ];
  el.append(h('h2', { class: 'ad-h2' }, 'Ajouter un projet Python en 4 étapes'),
    h('div', { class: 'steps' }, steps.map(([t, d], i) => h('div', { class: 'ad-card step' }, h('span', { class: 'step-n' }, String(i + 1)), h('div', null, h('strong', null, t), h('p', { class: 'ad-sub' }, d))))));

  const ways = [
    ['API sans clé', 'Appel direct depuis le navigateur, si l’API autorise les sites (CORS).', 'simple, gratuit'],
    ['Proxy', 'Un petit relais garde la clé et limite les appels. Cloudflare Workers ou Firebase Functions.', 'recommandé'],
    ['Clé du visiteur', 'Le visiteur colle sa propre clé, gardée dans son navigateur seulement.', 'pour les outils'],
    ['Mode démo', 'Réponses enregistrées d’avance : le projet marche sans aucune clé.', 'toujours dispo']
  ];
  el.append(h('h2', { class: 'ad-h2' }, 'Et les clés API ?'),
    h('p', { class: 'ad-sub' }, 'Tout ce qui est publié dans le navigateur est lisible avec F12. Une clé écrite dans le code est donc une clé donnée à tout le monde.'),
    h('div', { class: 'cards4' }, ways.map(([t, d, v]) => h('div', { class: 'ad-card' }, h('strong', null, t), h('p', { class: 'ad-sub' }, d), h('code', null, v)))),
    h('pre', { class: 'ad-pre' }, `// worker.js : proxy conseillé (Cloudflare Workers). La clé reste dans les secrets du Worker.
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    // limite les chemins et l'origine autorisés
    const r = await fetch('https://api.exemple.com' + u.pathname + u.search, {
      headers: { Authorization: 'Bearer ' + env.API_KEY }
    });
    return new Response(r.body, {
      status: r.status,
      headers: { 'Access-Control-Allow-Origin': 'https://TON-PSEUDO.github.io' }
    });
  }
}`));
}

start().catch((e) => {
  fail(e, 'L’admin n’a pas pu démarrer');
  clear(app).append(h('div', { class: 'login' }, h('div', { class: 'login-card' }, h('h1', null, 'Admin'), noteEl('bad', explain(e).message), h('p', { class: 'ad-sub' }, h('a', { href: './' }, '← Retour au site')))));
});
