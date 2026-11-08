// Couche de données unique : le reste du site ne sait pas si on est en mode
// Firebase ou en mode local. Même interface dans les deux cas.
import { configured, firebaseConfig, FIREBASE_VERSION } from './firebase-config.js';
import { DEFAULT_PROFILE, DEFAULT_CATEGORIES, DEFAULT_PROJECTS } from './defaults.js';
import { compressImage } from './image.js';
import { uid } from './dom.js';

let promise = null;
export function getStore() {
  if (!promise) promise = (configured ? firebaseStore() : Promise.resolve(localStore()));
  return promise;
}

const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore refuse les "undefined"
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0);

/* ───────────────────────── MODE LOCAL (localStorage) ───────────────────────── */
function localStore() {
  const mem = new Map();
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return mem.has(k) ? mem.get(k) : null; } },
    set(k, v) {
      try { localStorage.setItem(k, v); }
      catch (e) {
        if (e && e.name === 'QuotaExceededError') throw Object.assign(new Error('Stockage du navigateur plein : supprime des images ou configure Firebase.'), { code: 'QuotaExceededError' });
        mem.set(k, v);
      }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) { mem.delete(k); } }
  };
  const read = (k, d) => { const v = ls.get('pf:' + k); if (v === null) return d; try { return JSON.parse(v); } catch (e) { return d; } };
  const write = (k, v) => ls.set('pf:' + k, JSON.stringify(v));
  const seed = () => {
    write('profile', DEFAULT_PROFILE);
    write('categories', DEFAULT_CATEGORIES);
    write('projects', DEFAULT_PROJECTS);
  };
  if (ls.get('pf:projects') === null) seed();

  return {
    mode: 'local',
    projectId: '(mode local)',
    currentUser: () => ({ uid: 'local', email: 'mode local' }),
    onAuth(cb) { setTimeout(() => cb({ uid: 'local', email: 'mode local' }), 0); return () => {}; },
    async login() {},
    async logout() {},

    async getProfile() { return { ...DEFAULT_PROFILE, ...read('profile', {}) }; },
    async saveProfile(p) { write('profile', clean(p)); },

    async listCategories() { return read('categories', []).sort(byOrder); },
    async saveCategory(c) {
      const list = read('categories', []).filter((x) => x.id !== c.id);
      list.push(clean(c));
      write('categories', list);
    },
    async deleteCategory(id) { write('categories', read('categories', []).filter((x) => x.id !== id)); },

    async listProjects({ all = false } = {}) {
      const list = read('projects', []);
      return (all ? list : list.filter((p) => p.visible)).sort(byOrder);
    },
    async getProject(id) { return read('projects', []).find((p) => p.id === id) || null; },
    async saveProject(p) {
      const list = read('projects', []).filter((x) => x.id !== p.id);
      list.push(clean({ ...p, updatedAt: Date.now() }));
      write('projects', list);
    },
    async deleteProject(id) { write('projects', read('projects', []).filter((x) => x.id !== id)); },

    async saveMedia(file) {
      const data = await compressImage(file);
      const id = uid() + uid();
      ls.set('pf:media:' + id, JSON.stringify({ data, name: file.name }));
      return id;
    },
    async getMedia(id) { const m = read('media:' + id, null); return m ? m.data : ''; },

    async seed() { seed(); },
    async ping() {
      const k = 'pf:ping';
      ls.set(k, String(Date.now()));
      const v = ls.get(k);
      ls.del(k);
      return v ? 'Mode local : le stockage du navigateur fonctionne.' : 'Le stockage du navigateur est bloqué (navigation privée ?).';
    },
    async exportAll() {
      const media = {};
      for (const p of [read('profile', {}), ...read('projects', [])]) {
        for (const ref of mediaRefs(p)) media[ref] = (await this.getMedia(ref)) || '';
      }
      return { version: 1, profile: read('profile', {}), categories: read('categories', []), projects: read('projects', []), media };
    },
    async importAll(d) {
      checkImport(d);
      write('profile', d.profile); write('categories', d.categories); write('projects', d.projects);
      for (const [id, data] of Object.entries(d.media || {})) ls.set('pf:media:' + id, JSON.stringify({ data, name: id }));
    }
  };
}

function mediaRefs(obj) {
  const refs = new Set();
  const walk = (v) => {
    if (typeof v === 'string' && v.startsWith('m:')) refs.add(v.slice(2));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(obj);
  return refs;
}

function checkImport(d) {
  if (!d || typeof d !== 'object' || !d.profile || !Array.isArray(d.categories) || !Array.isArray(d.projects)) {
    throw new Error('Ce fichier n’est pas une sauvegarde de portfolio valide (profile, categories, projects attendus).');
  }
}

/* ───────────────────────── MODE FIREBASE ───────────────────────── */
async function firebaseStore() {
  const base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
  let App, Auth, Fs;
  try {
    [App, Auth, Fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  } catch (e) {
    throw new Error('Impossible de charger Firebase depuis gstatic.com (réseau coupé ou bloqueur de contenu ?). ' + (e && e.message ? e.message : ''));
  }
  const app = App.initializeApp(firebaseConfig);
  const auth = Auth.getAuth(app);
  const db = Fs.getFirestore(app);
  const { doc, getDoc, setDoc, deleteDoc, getDocs, collection, query, where, writeBatch } = Fs;

  const colList = async (name) => (await getDocs(collection(db, name))).docs.map((d) => ({ id: d.id, ...d.data() }));

  const api = {
    mode: 'firebase',
    projectId: firebaseConfig.projectId,
    currentUser: () => auth.currentUser,
    onAuth: (cb) => Auth.onAuthStateChanged(auth, cb),
    login: (email, password) => Auth.signInWithEmailAndPassword(auth, email, password),
    logout: () => Auth.signOut(auth),

    async getProfile() {
      const s = await getDoc(doc(db, 'site', 'profile'));
      return { ...DEFAULT_PROFILE, ...(s.exists() ? s.data() : {}) };
    },
    async saveProfile(p) { await setDoc(doc(db, 'site', 'profile'), clean(p)); },

    async listCategories() { return (await colList('categories')).sort(byOrder); },
    async saveCategory(c) { await setDoc(doc(db, 'categories', c.id), clean(c)); },
    async deleteCategory(id) { await deleteDoc(doc(db, 'categories', id)); },

    async listProjects({ all = false } = {}) {
      const snap = all ? await getDocs(collection(db, 'projects')) : await getDocs(query(collection(db, 'projects'), where('visible', '==', true)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
    },
    async getProject(id) { const s = await getDoc(doc(db, 'projects', id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    async saveProject(p) { await setDoc(doc(db, 'projects', p.id), clean({ ...p, updatedAt: Date.now() })); },
    async deleteProject(id) { await deleteDoc(doc(db, 'projects', id)); },

    async saveMedia(file) {
      const data = await compressImage(file);
      const id = uid() + uid();
      await setDoc(doc(db, 'media', id), { data, name: file.name || 'image', createdAt: Date.now() });
      return id;
    },
    async getMedia(id) { const s = await getDoc(doc(db, 'media', id)); return s.exists() ? s.data().data : ''; },

    async seed() {
      const batch = writeBatch(db);
      batch.set(doc(db, 'site', 'profile'), clean(DEFAULT_PROFILE));
      DEFAULT_CATEGORIES.forEach((c) => batch.set(doc(db, 'categories', c.id), clean(c)));
      DEFAULT_PROJECTS.forEach((p) => batch.set(doc(db, 'projects', p.id), clean(p)));
      await batch.commit();
    },
    async ping() {
      await setDoc(doc(db, 'site', '_ping'), { t: Date.now() });
      const s = await getDoc(doc(db, 'site', '_ping'));
      await deleteDoc(doc(db, 'site', '_ping'));
      return s.exists() ? 'Firebase répond : lecture et écriture OK.' : 'Écriture passée mais lecture vide : vérifie les règles.';
    },
    async exportAll() {
      const [pSnap, categories, projects] = await Promise.all([getDoc(doc(db, 'site', 'profile')), colList('categories'), colList('projects')]);
      const profile = pSnap.exists() ? pSnap.data() : {};
      const media = {};
      for (const ref of mediaRefs([profile, projects])) media[ref] = (await api.getMedia(ref)) || '';
      return { version: 1, profile, categories, projects, media };
    },
    async importAll(d) {
      checkImport(d);
      const ops = [
        [doc(db, 'site', 'profile'), clean(d.profile)],
        ...d.categories.map((c) => [doc(db, 'categories', c.id), clean(c)]),
        ...d.projects.map((p) => [doc(db, 'projects', p.id), clean(p)]),
        ...Object.entries(d.media || {}).map(([id, data]) => [doc(db, 'media', id), { data, name: id, createdAt: Date.now() }])
      ];
      for (let i = 0; i < ops.length; i += 100) {
        const batch = writeBatch(db);
        ops.slice(i, i + 100).forEach(([ref, data]) => batch.set(ref, data));
        await batch.commit();
      }
    }
  };
  return api;
}
