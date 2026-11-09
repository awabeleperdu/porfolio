# Portfolio

Un portfolio avec un espace admin : catégories, projets, page de présentation, 6 thèmes, carte de contact qui se retourne.
Certains projets (Python, pages HTML) **tournent directement dans le navigateur**.
Site statique : aucun build, il se publie tel quel sur **GitHub Pages**.

## Structure

```
/
├── index.html           ← accueil (le site)
├── projet.html          ← page d'un projet
├── admin.html           ← espace admin
├── editeur.html         ← éditeur de projet par blocs
├── manifest.webmanifest ← appli installable (PWA)
├── sw.js                ← service worker (hors connexion)
├── .nojekyll
├── css/                 ← base, themes (les 6 thèmes), site, admin
├── js/                  ← le code
│   └── firebase-config.js   ← LE fichier à remplir avec ta config Firebase
├── assets/              ← images (favicon…)
└── docs/
    ├── TUTO.md          ← mise en ligne pas à pas (GitHub Pages + Firebase)
    └── ADMIN.md         ← utiliser l'admin, limites, thèmes
```

`firestore.rules` est fourni à part : il se colle dans Firebase (Firestore → Règles), pas sur GitHub.

## Démarrer

1. Mets **tout le contenu** de ce dossier à la racine d'un dépôt GitHub, puis active Pages.
2. Suis [docs/TUTO.md](docs/TUTO.md) pour brancher Firebase.
3. Ensuite [docs/ADMIN.md](docs/ADMIN.md).

Sans config Firebase, le site fonctionne en mode local (données dans ton navigateur) : pratique pour essayer.
Pour tester sur ton ordinateur : `python -m http.server 8000`, puis http://localhost:8000 (double-clic sur `index.html` ne marche pas).


## Pages
- `index.html` accueil (intro, démo en direct, 3 projets à voir d'abord, à propos)
- `projets.html` tous les projets (filtres)
- `contact.html` carte + gros boutons
- `projet.html?id=…` page d'un projet
Sur téléphone, une barre en bas (Accueil / Projets / Contact) remplace le menu. Champs admin ajoutés : « Ce que j'ai fait » (projet), « Ce que tu cherches » et « Lien du CV » (profil). Thème par défaut : Nuit.
