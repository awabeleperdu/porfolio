// Lit un fichier déposé et dit s'il peut tourner dans le navigateur.
import { readText } from './dom.js';

const SERVER = ['flask', 'django', 'fastapi', 'discord', 'socketio', 'uvicorn', 'sqlalchemy', 'psycopg2', 'pymongo'];
const LOCAL = ['tkinter', 'pygame', 'win32api', 'win32com', 'pyaudio', 'pycaw', 'serial', 'keyboard', 'pyautogui', 'cv2', 'subprocess', 'ctypes'];
const NET = ['requests', 'urllib', 'urllib3', 'httpx', 'aiohttp'];
const kindOf = (m) => (SERVER.includes(m) ? 'server' : LOCAL.includes(m) ? 'local' : NET.includes(m) ? 'net' : 'ok');

export const MAX_DOC = 900000; // limite d'un document Firestore (~1 Mo)

export function analyzePy(name, text) {
  const mods = [];
  const re = /^\s*(?:from|import)\s+([A-Za-z0-9_]+)/gm;
  let m;
  while ((m = re.exec(text)) !== null) if (!mods.includes(m[1])) mods.push(m[1]);
  const hasServer = mods.some((x) => kindOf(x) === 'server');
  const hasLocal = mods.some((x) => kindOf(x) === 'local');
  const hasNet = mods.some((x) => kindOf(x) === 'net');
  const secrets = (text.match(/(api[_-]?key|apikey|secret|token|password)\s*=\s*["'][^"']{6,}["']/gi) || []).length;
  const usesInput = /\binput\s*\(/.test(text);
  const notes = [];
  let verdict = 'browser';
  if (hasLocal) verdict = 'local';
  else if (hasServer) verdict = 'server';

  if (verdict === 'browser') {
    notes.push({ tone: 'ok', text: 'Ce code peut tourner dans le navigateur avec Pyodide, sans serveur et sans frais.' });
    if (usesInput) notes.push({ tone: 'info', text: 'Tu utilises input() : les valeurs se saisissent dans le champ « Entrées » (une par ligne) avant d’exécuter.' });
    if (hasNet) notes.push({ tone: 'warn', text: 'Ce code appelle le réseau. Ça peut marcher via Pyodide, mais l’API doit accepter les appels depuis un site (CORS). Teste-le, et ne mets jamais de clé dans le code.' });
  } else if (verdict === 'server') {
    notes.push({ tone: 'warn', text: 'Ce programme a besoin d’un serveur Python : il ne peut pas tourner dans le navigateur.' });
    notes.push({ tone: 'info', text: 'Solution : l’héberger à part (Render ou PythonAnywhere, gratuit) et l’ajouter en mode « Embarqué » avec son URL. En attendant, le code est ajouté en bloc de code sur la page.' });
  } else {
    notes.push({ tone: 'warn', text: 'Ce programme dépend de ton ordinateur (fenêtre, matériel, Windows) : impossible à exécuter chez un visiteur.' });
    notes.push({ tone: 'info', text: 'Solution : une page avec vidéo, captures, code et lien GitHub, sans bouton Exécuter. Le code est ajouté en bloc de code.' });
  }
  if (secrets > 0) notes.unshift({ tone: 'bad', text: 'Attention : ' + secrets + ' clé(s) ou mot(s) de passe écrits en clair dans le code. Retire-les avant de publier : ils seraient lisibles par tout le monde.' });
  if (text.length > MAX_DOC) notes.unshift({ tone: 'bad', text: 'Ce fichier est trop lourd pour la base (' + Math.round(text.length / 1000) + ' Ko, limite ~900 Ko).' });

  const label = verdict === 'browser' ? 'Exécutable dans le navigateur' : verdict === 'server' ? 'Besoin d’un serveur' : 'Exécution impossible ici';
  const short = verdict === 'browser' ? 'Pyodide' : verdict === 'server' ? 'Serveur' : 'Local';
  return { name, ext: 'py', verdict, label, short, mods: mods.map((x) => ({ name: x, k: kindOf(x) })), notes, text };
}

export async function analyzeFile(file) {
  const name = file.name || 'fichier';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (ext === 'py') return analyzePy(name, await readText(file));
  if (ext === 'html' || ext === 'htm') {
    const text = await readText(file);
    const notes = [
      { tone: 'ok', text: 'Page web : elle s’ouvrira dans un cadre isolé, avec un bouton Lancer.' },
      { tone: 'info', text: 'Un seul fichier HTML (CSS et JS inclus dedans). S’il utilise d’autres fichiers, mets le dossier dans le dépôt GitHub sous projets/<nom>/ et utilise le mode « Embarqué ».' }
    ];
    if (text.length > MAX_DOC) notes.unshift({ tone: 'bad', text: 'Ce fichier est trop lourd pour la base (' + Math.round(text.length / 1000) + ' Ko, limite ~900 Ko). Mets-le dans le dépôt (projets/<nom>/) et utilise le mode « Embarqué ».' });
    return { name, ext: 'html', verdict: 'browser', label: 'Exécutable dans le navigateur', short: 'HTML / JS', mods: [], notes, text };
  }
  throw new Error('Le format « .' + (ext || name) + ' » n’est pas pris en charge ici. Dépose un .py ou un .html. Pour un dossier ou un .zip : mets-le dans le dépôt GitHub (projets/<nom>/) et utilise le mode « Embarqué ».');
}
