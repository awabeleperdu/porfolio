// Affiche TOUTES les erreurs à l'écran (pratique sur téléphone, sans console).
// Importé en premier par chaque page.
let box = null;
const seen = new Set();

// Transforme une erreur technique en phrase compréhensible + piste de correction.
export function explain(err) {
  const code = (err && (err.code || err.name)) || '';
  const raw = (err && err.message) || String(err);
  const map = {
    'permission-denied': 'Firebase refuse l’opération. Soit tu n’es pas connecté, soit ton UID n’est pas dans les règles. Va dans Admin → Aide, copie ton UID, colle-le dans firestore.rules, puis clique sur Publier dans la console Firebase (Firestore → Règles).',
    'unavailable': 'Impossible de joindre Firebase (réseau coupé ou service bloqué). Vérifie ta connexion et réessaie.',
    'failed-precondition': 'Firestore n’est pas prêt : crée la base dans la console Firebase (Firestore Database → Créer une base).',
    'not-found': 'Document introuvable.',
    'resource-exhausted': 'Quota Firebase dépassé pour aujourd’hui. Réessaie demain ou vérifie ton offre.',
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
    'auth/wrong-password': 'Email ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet email. Crée-le dans Firebase → Authentication → Utilisateurs.',
    'auth/invalid-email': 'Cet email n’est pas valide.',
    'auth/too-many-requests': 'Trop d’essais. Attends quelques minutes avant de réessayer.',
    'auth/operation-not-allowed': 'La connexion par email n’est pas activée : Firebase → Authentication → Sign-in method → Email/Mot de passe → Activer.',
    'auth/network-request-failed': 'Réseau indisponible pendant la connexion.',
    'auth/unauthorized-domain': 'Ce domaine n’est pas autorisé : Firebase → Authentication → Paramètres → Domaines autorisés → ajoute ton adresse github.io.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'La clé de config Firebase est invalide : vérifie js/firebase-config.js.',
    'QuotaExceededError': 'Le stockage du navigateur est plein. Supprime des images ou passe en mode Firebase.'
  };
  return { code, message: map[code] || raw, detail: map[code] ? code + ' · ' + raw : code };
}

export function showError(title, message, detail) {
  const key = title + '|' + message;
  if (seen.has(key)) return;
  seen.add(key);
  setTimeout(() => seen.delete(key), 4000);
  if (!document.body) { console.error(title, message, detail); return; }
  if (!box) {
    box = document.createElement('div');
    box.id = 'err-banner';
    box.setAttribute('role', 'alert');
    document.body.append(box);
  }
  box.hidden = false;
  const item = document.createElement('div');
  item.className = 'err-item';
  const strong = document.createElement('strong');
  strong.textContent = title;
  const p = document.createElement('p');
  p.textContent = message;
  item.append(strong, p);
  if (detail) {
    const pre = document.createElement('pre');
    pre.textContent = detail;
    item.append(pre);
  }
  const row = document.createElement('div');
  row.className = 'err-actions';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copier';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(title + '\n' + message + (detail ? '\n' + detail : '')); copy.textContent = 'Copié'; }
    catch (e) { copy.textContent = 'Copie impossible'; }
  });
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Fermer';
  close.addEventListener('click', () => { item.remove(); if (!box.children.length) box.hidden = true; });
  row.append(copy, close);
  item.append(row);
  box.append(item);
}

// Raccourci : attrape n'importe quelle erreur et l'affiche proprement.
export function fail(err, title = 'Une erreur est survenue') {
  const e = explain(err);
  showError(title, e.message, e.detail);
  console.error(err);
}

window.addEventListener('error', (e) => {
  if (/ResizeObserver/.test(e.message || '')) return;
  const where = e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '';
  showError('Erreur dans la page', (e.message || 'Erreur inconnue') + where);
});
window.addEventListener('unhandledrejection', (e) => {
  const x = explain(e.reason);
  showError('Erreur', x.message, x.detail);
});
