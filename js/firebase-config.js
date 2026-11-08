// ─────────────────────────────────────────────────────────────
//  CONFIG FIREBASE  (fichier : js/firebase-config.js)
//
//  1. Console Firebase → ⚙ Paramètres du projet → Tes applications → Application Web (</>)
//  2. Copie les 4 valeurs ci-dessous à la place de COLLE_ICI (garde les guillemets).
//
//  Tant que ce n'est pas rempli, le site tourne en « mode local » :
//  tout marche, mais les données restent dans ton navigateur seulement.
//
//  Ces valeurs ne sont PAS secrètes : c'est normal qu'elles soient publiques.
//  La sécurité vient du fichier firestore.rules (seul ton compte peut écrire).
// ─────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: 'AIzaSyDv5B6WqgxghZeBeLavvY5ONIyFyxYxNfo',
  authDomain: 'portoflio-254e6.firebaseapp.com',
  projectId: 'portoflio-254e6',
  appId: '1:88776806664:web:a11ace494c191dcb64dcbd'
};

export const FIREBASE_VERSION = '10.14.1';

export const configured = Object.values(firebaseConfig).every((v) => v && !String(v).startsWith('COLLE_ICI'));
