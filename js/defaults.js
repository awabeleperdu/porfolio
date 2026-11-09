// Contenu de départ (exemples). Tout se modifie ensuite depuis l'admin.
export const DEFAULT_PROFILE = {
  name: 'Amir Eddahmani',
  role: 'Étudiant en BTS CIEL · maths et NSI',
  headline: 'Je construis des outils web.',
  highlight: 'outils web.',
  seeking: '',
  cvUrl: '',
  intro: 'Des applis que j’imagine, que je code, et que tu peux lancer ici même, dans le navigateur.',
  bio: 'Bac en poche avec les spécialités maths et NSI, aujourd’hui en BTS CIEL. J’aime partir d’une idée, la coder, et la voir tourner pour de vrai.',
  photo: '',
  email: '',
  github: '',
  linkedin: '',
  phone: '',
  cardCode: '031',
  skills: [
    { name: 'Python', level: 4 },
    { name: 'Flask', level: 3 },
    { name: 'JavaScript', level: 4 },
    { name: 'HTML / CSS', level: 4 }
  ],
  theme: 'nuit',
  visitorThemes: true,
  sections: { projets: true, apropos: true, contact: true }
};

export const DEFAULT_CATEGORIES = [
  { id: 'web', label: 'Applications web', order: 1 },
  { id: 'outils', label: 'Outils', order: 2 },
  { id: 'ecole', label: 'Projets scolaires', order: 3 }
];

const PRIMES = `def premiers(n):
    crible = [True] * (n + 1)
    resultat = []
    for i in range(2, n + 1):
        if crible[i]:
            resultat.append(i)
            for k in range(i * i, n + 1, i):
                crible[k] = False
    return resultat

n = 50
print(f"Nombres premiers jusqu'à {n} :")
print(premiers(n))
`;

const GUESS = `import random

secret = random.randint(1, 20)
print("J'ai choisi un nombre entre 1 et 20.")

for essai in range(1, 6):
    reponse = int(input(f"Essai {essai}/5 : "))
    if reponse == secret:
        print("Bravo, trouvé !")
        break
    print("Plus grand" if reponse < secret else "Plus petit")
else:
    print("Perdu, c'était", secret)
`;

const now = Date.now();
const base = { role: '', tags: [], mode: 'none', code: '', inputs: '', html: '', url: '', sameOrigin: false, link: '', visible: true, featured: false, cover: '', createdAt: now, updatedAt: now };

export const DEFAULT_PROJECTS = [
  {
    ...base, id: 'lecture', title: 'Lecture', categoryId: 'web', order: 1, featured: true,
    role: 'PWA hébergée sur GitHub Pages, installable sur le téléphone.',
    desc: 'Lecteur d’epub installable sur téléphone, pensé aussi pour les scans et les webtoons.',
    tags: ['PWA', 'JavaScript'],
    blocks: [
      { id: 'b1', type: 'title', text: 'Le point de départ' },
      { id: 'b2', type: 'text', text: 'Explique ici pourquoi tu as fait ce projet, ce qui te manquait, ce que tu voulais obtenir.' }
    ]
  },
  {
    ...base, id: 'muscu', title: 'Suivi musculation', categoryId: 'web', order: 2,
    role: 'Firebase pour les données, trois thèmes, hébergé sur GitHub Pages.',
    desc: 'Suivi de séances de salle avec trois thèmes et sauvegarde Firebase.',
    tags: ['Firebase', 'JavaScript'],
    blocks: [{ id: 'b1', type: 'text', text: 'Décris le projet, ses fonctions et les choix techniques.' }]
  },
  {
    ...base, id: 'clean', title: 'Family Clean Hub', categoryId: 'web', order: 3,
    role: 'Application HTML et JavaScript, roulement des tâches géré par le code.',
    desc: 'Gestion du ménage familial : roulement des tâches, jokers et tâches spéciales.',
    tags: ['HTML', 'JavaScript'],
    blocks: [{ id: 'b1', type: 'text', text: 'Décris le projet, ses fonctions et les choix techniques.' }]
  },
  {
    ...base, id: 'premiers', title: 'Nombres premiers', categoryId: 'outils', order: 4,
    role: 'Écrit en Python, exécuté dans le navigateur grâce à Pyodide.',
    desc: 'Exemple de projet Python qui s’exécute directement dans le navigateur.',
    tags: ['Python', 'Pyodide'], mode: 'py', code: PRIMES,
    blocks: [
      { id: 'b1', type: 'title', text: 'Un programme qui tourne ici' },
      { id: 'b2', type: 'text', text: 'Ce code Python s’exécute dans ton navigateur, sans serveur. Tu peux le modifier puis relancer.' },
      { id: 'b3', type: 'run' }
    ]
  },
  {
    ...base, id: 'devine', title: 'Devine le nombre', categoryId: 'outils', order: 5,
    role: 'Jeu en Python, les réponses passent par input() dans le navigateur.',
    desc: 'Jeu en Python avec input() : les réponses se saisissent dans le champ « Entrées ».',
    tags: ['Python', 'Pyodide'], mode: 'py', code: GUESS, inputs: '10\n15\n7\n12\n18',
    blocks: [{ id: 'b1', type: 'run' }]
  },
  {
    ...base, id: 'ultron', title: 'ULTRON', categoryId: 'ecole', order: 6,
    role: 'Interface Flask pour la détection de balle, projet de NSI.',
    desc: 'Interface Flask pour un robot qui détecte une balle, projet de NSI.',
    tags: ['Python', 'Flask'],
    blocks: [
      { id: 'b1', type: 'text', text: 'Ce projet dépend de matériel : il ne peut pas tourner ici. Ajoute une vidéo, des photos et le lien GitHub.' },
      { id: 'b2', type: 'divider' }
    ]
  }
];
