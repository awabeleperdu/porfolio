# Utiliser l’admin

## 3. Utiliser l'admin

- **Projets** : dépose un fichier `.py` ou `.html` sur la zone, le site l'analyse (modules utilisés, clé d'API, etc.) et crée le projet.
  Les boutons ouvrent l'éditeur : blocs titre, texte, image, vidéo (lien), code, bouton, projet exécutable. Glisse-les ou touche-les. Aperçu, Publier/Dépublier, Ctrl+S.
- **Markdown (.md)** : dépose un `.md` (README, notes) sur la zone de l'admin, ou utilise « Importer un fichier .md » / « Coller du Markdown » dans l'éditeur. Titres, listes, code, citations, séparateurs, liens et images en https:// deviennent des blocs modifiables. Un `# Titre` donne le titre du projet, le premier paragraphe la description. Les images locales (`img/x.png`) sont ignorées : ajoute-les avec un bloc Image.
- **Catégories**, **Thèmes** (thème du site + autoriser ou non le visiteur à changer), **Profil et site** (photo, bio, compétences, coordonnées de la carte, sections affichées, export/import JSON).
- **Aide et Python** : guide, diagnostic de connexion, ton UID.

## 4. Ce qui tourne dans le navigateur

| Mode | Marche | Ne marche pas |
|---|---|---|
| Python (Pyodide) | calculs, jeux en texte, `input()`, `random`, `json`, `requests` simples | `tkinter`, `pygame`, serveurs, Raspberry Pi, `socket`, accès aux fichiers du PC |
| HTML (cadre isolé) | page complète en un seul fichier (CSS et JS dedans) | plusieurs fichiers liés |
| Embarqué (URL) | une page hébergée ailleurs (autre dépôt Pages) | sites qui interdisent l'intégration |

Pour un projet qui a besoin d'un serveur ou de matériel : mets une vidéo (YouTube) + le lien GitHub.

## 5. Limites à connaître

- **Images** : stockées dans Firestore (pas de Firebase Storage, qui demande une carte bancaire). Elles sont réduites automatiquement (1400 px, JPEG < 900 Ko). Beaucoup de grandes images = base qui grossit : reste raisonnable.
- **Vidéos** : par lien seulement (YouTube, Vimeo, .mp4 hébergé ailleurs).
- **Clés d'API** : tout ce qui est dans le navigateur est lisible par tout le monde. Ne mets jamais de clé secrète dans un projet Python/HTML.
  Passe par un petit proxy (ex. Cloudflare Worker gratuit) qui garde la clé et que ton code appelle. L'admin signale les clés repérées dans un `.py`.
- **Python** : le premier lancement télécharge Pyodide (~10 Mo, il faut internet), les suivants sont plus rapides.

## 6. Créer ton propre thème

Dans `css/themes.css`, copie un bloc `[data-theme="..."]`, change son nom et les couleurs,
puis ajoute-le dans la liste `THEMES` en haut de `js/theme.js`.

## 7. Donner ce portfolio à quelqu'un d'autre

Il suffit de lui passer le dossier : il crée son Firebase, met ses valeurs dans `firebase-config.js`, son UID dans `firestore.rules`,
et remplit son profil dans Admin (nom, photo, bio, couleurs : tout se change là, rien à toucher dans le code).
