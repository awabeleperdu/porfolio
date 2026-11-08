# Mise en ligne pas à pas

## 0. Essayer tout de suite (sans rien configurer)

Tant que `js/firebase-config.js` contient « COLLE_ICI », le site tourne en **mode local** :
tout fonctionne, mais les données restent dans ton navigateur seulement.
Un site doit être servi en http : double-cliquer sur `index.html` ne marche pas (modules JavaScript).
Pour tester sur ton ordinateur : `python -m http.server 8000` dans le dossier, puis http://localhost:8000.
Dans l'admin, le bouton « Charger les exemples » remplit le site avec des projets de démo.

## 1. Mettre le site en ligne (GitHub Pages)

1. Crée un dépôt GitHub (ex. `portfolio`), public.
2. Envoie **le contenu** du dossier `portfolio-amir/` à la racine du dépôt : `index.html` doit être à la racine, pas dans un sous-dossier.
   Sur github.com : Add file → Upload files → glisse tout le contenu (dossiers `css`, `js`, `assets`, `docs` compris, et `.nojekyll`).
3. Settings → Pages → Source : « Deploy from a branch » → branche `main`, dossier `/ (root)` → Save.
4. Au bout d'une minute, le site est sur `https://TON-PSEUDO.github.io/portfolio/`.

## 2. Brancher Firebase (pour que tes modifications soient en ligne)

1. https://console.firebase.google.com → Ajouter un projet (Analytics inutile).
2. **Firestore Database** → Créer une base (mode production, région `eur3`).
3. **Authentication** → Commencer → Sign-in method → **Email/Mot de passe** → Activer.
4. Authentication → Utilisateurs → **Ajouter un utilisateur** (ton email + un mot de passe solide). C'est ton compte admin.
5. Authentication → Paramètres → **Domaines autorisés** → ajoute `TON-PSEUDO.github.io`.
6. ⚙ Paramètres du projet → Tes applications → **Web (`</>`)** → enregistre l'app → copie les 4 valeurs
   (`apiKey`, `authDomain`, `projectId`, `appId`).
7. Dans ton dépôt GitHub, ouvre **`js/firebase-config.js`** (dossier `js` ; attention, si ton navigateur traduit la page, les noms de fichiers peuvent changer d'apparence) et remplace les `COLLE_ICI` par tes valeurs. Garde les guillemets. Commit.
8. Va sur `…/admin.html` et connecte-toi. Va dans **Aide** : copie ton **UID**.
9. Ouvre `firestore.rules`, remplace `COLLE_ICI_TON_UID` par ton UID, puis colle tout le fichier dans Firestore Database → **Règles** → **Publier**.
10. Dans Admin → Aide, clique sur **Tester la connexion** : tout doit être au vert.

Les valeurs de `firebase-config.js` ne sont pas secrètes (c'est normal qu'elles soient publiques). La sécurité vient de `firestore.rules` : seul ton UID peut écrire.

