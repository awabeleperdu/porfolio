// Exécute un projet dans la page : Python (Pyodide dans un worker), HTML inline, ou site embarqué.
import { h, safeUrl } from './dom.js';
import { fail } from './errors.js';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
const PYODIDE_INDEX = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

// Ce code tourne dans un Web Worker : si le programme boucle à l'infini, on peut l'arrêter.
function workerMain() {
  let py = null;
  let queue = [];
  const send = (type, s) => self.postMessage({ type, s });
  self.onmessage = async (e) => {
    const m = e.data;
    try {
      if (!py) {
        send('status', 'Chargement de Python (première fois : quelques secondes)…');
        importScripts(m.url);
        py = await self.loadPyodide({
          indexURL: m.index,
          stdout: (s) => send('out', s),
          stderr: (s) => send('err', s),
          stdin: () => (queue.length ? queue.shift() : null)
        });
      }
      queue = (m.inputs || []).slice();
      send('status', 'Préparation des bibliothèques…');
      await py.loadPackagesFromImports(m.code);
      if (/^\s*(import|from)\s+requests/m.test(m.code)) {
        try {
          await py.loadPackage(['requests', 'pyodide-http']);
          await py.runPythonAsync('import pyodide_http\npyodide_http.patch_all()');
        } catch (err) {
          send('err', 'requests indisponible dans le navigateur : ' + (err && err.message ? err.message : err));
        }
      }
      send('status', 'Exécution…');
      const t0 = performance.now();
      const ns = py.globals.get('dict')();
      const res = await py.runPythonAsync(m.code, { globals: ns });
      ns.destroy();
      if (res !== undefined && res !== null) send('out', String(res));
      send('done', Math.round(performance.now() - t0) + ' ms');
    } catch (err) {
      send('error', String(err && err.message ? err.message : err));
    }
  };
}

function makeWorker() {
  const src = '(' + workerMain.toString() + ')()';
  const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  return w;
}

/* ───────────── Python ───────────── */
function pythonRunner(project, opts) {
  const original = project.code || '';
  const code = h('textarea', { class: 'rn-code', spellcheck: 'false', 'aria-label': 'Code Python', rows: Math.min(22, Math.max(8, original.split('\n').length + 1)) });
  code.value = original;
  const inputs = h('textarea', { class: 'rn-inputs', rows: 3, placeholder: 'Une valeur par ligne (pour input())', 'aria-label': 'Entrées du programme' });
  inputs.value = project.inputs || '';
  const out = h('div', { class: 'rn-out', role: 'log', 'aria-live': 'polite' });
  const status = h('span', { class: 'rn-status' }, 'Prêt');
  const runBtn = h('button', { type: 'button', class: 'btn btn-primary rn-run' }, 'Exécuter');
  const stopBtn = h('button', { type: 'button', class: 'btn btn-ghost rn-stop', disabled: true }, 'Arrêter');
  const resetBtn = h('button', { type: 'button', class: 'rn-link' }, 'Réinitialiser le code');
  const clearBtn = h('button', { type: 'button', class: 'rn-link' }, 'Effacer la console');

  let worker = null;
  let timer = null;
  let busy = false;

  const print = (kind, text) => {
    out.append(h('div', { class: 'rn-line rn-' + kind }, text));
    out.scrollTop = out.scrollHeight;
  };
  const setBusy = (b) => {
    busy = b;
    runBtn.disabled = b;
    stopBtn.disabled = !b;
    runBtn.textContent = b ? 'En cours…' : 'Exécuter';
  };
  const arm = (ms, msg) => {
    clearTimeout(timer);
    timer = setTimeout(() => stop(msg), ms);
  };
  function stop(msg) {
    clearTimeout(timer);
    if (worker) { worker.terminate(); worker = null; }
    setBusy(false);
    status.textContent = msg ? 'Arrêté' : 'Prêt';
    if (msg) print('err', msg);
  }
  function run() {
    if (busy) return;
    out.replaceChildren();
    setBusy(true);
    try {
      if (!worker) {
        worker = makeWorker();
        worker.onmessage = (e) => {
          const { type, s } = e.data;
          if (type === 'out') print('out', s);
          else if (type === 'err') print('err', s);
          else if (type === 'status') {
            status.textContent = s;
            if (s === 'Exécution…') arm(60000, 'Arrêté : le programme a dépassé 60 secondes.');
          } else if (type === 'done') {
            clearTimeout(timer);
            setBusy(false);
            status.textContent = 'Terminé en ' + s;
          } else if (type === 'error') {
            clearTimeout(timer);
            const engine = /importScripts|pyodide\.js|Failed to fetch|NetworkError/i.test(String(s));
            print('err', engine ? 'Le moteur Python (Pyodide) n’a pas pu être téléchargé depuis cdn.jsdelivr.net. Vérifie ta connexion internet ou désactive le bloqueur de pub, puis réessaie.' : s);
            setBusy(false);
            status.textContent = engine ? 'Moteur indisponible' : 'Erreur dans le programme';
          }
        };
        worker.onerror = (e) => stop('Le moteur Python n’a pas pu démarrer : ' + (e.message || 'erreur inconnue') + '. Le chargement depuis cdn.jsdelivr.net est peut-être bloqué (réseau, bloqueur de pub).');
      }
      arm(120000, 'Arrêté : le chargement de Python a pris plus de 2 minutes. Vérifie ta connexion.');
      worker.postMessage({ type: 'run', url: PYODIDE_URL, index: PYODIDE_INDEX, code: code.value, inputs: inputs.value ? inputs.value.split('\n') : [] });
    } catch (err) {
      stop('Impossible de lancer Python : ' + (err && err.message ? err.message : err));
      fail(err, 'Exécution Python impossible');
    }
  }

  runBtn.addEventListener('click', run);
  stopBtn.addEventListener('click', () => stop('Arrêté par toi.'));
  resetBtn.addEventListener('click', () => { code.value = original; });
  clearBtn.addEventListener('click', () => out.replaceChildren());
  code.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = code.selectionStart;
      code.setRangeText('    ', s, code.selectionEnd, 'end');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  });

  const root = h('div', { class: 'runner rn-py' },
    h('div', { class: 'rn-cols' },
      h('div', { class: 'rn-pane' },
        h('div', { class: 'rn-bar' }, h('span', { class: 'rn-name' }, 'main.py'), h('div', { class: 'rn-btns' }, resetBtn, stopBtn, runBtn)),
        code,
        h('label', { class: 'rn-label' }, 'Entrées (input), une par ligne', inputs)
      ),
      h('div', { class: 'rn-pane rn-console' },
        h('div', { class: 'rn-bar' }, h('span', { class: 'rn-name' }, 'Console'), clearBtn),
        out,
        h('div', { class: 'rn-foot' }, status)
      )
    ),
    h('p', { class: 'rn-note' }, 'Python réel (Pyodide) exécuté dans ton navigateur : rien n’est envoyé à un serveur. Ctrl + Entrée pour exécuter.')
  );
  if (opts && opts.autostart) setTimeout(run, 50);
  return root;
}

/* ───────────── HTML inline / site embarqué ───────────── */
function frameRunner(project, opts) {
  const isInline = project.mode === 'html';
  const url = isInline ? '' : safeUrl(project.url);
  const host = h('div', { class: 'rn-stage' });
  let frame = null;

  const sandbox = 'allow-scripts allow-forms allow-popups allow-modals' + (!isInline && project.sameOrigin ? ' allow-same-origin' : '');
  const start = () => {
    if (!isInline && !url) { fail(new Error('L’adresse du projet est vide ou invalide : « ' + (project.url || '') + ' ».'), 'Projet impossible à lancer'); return; }
    host.replaceChildren();
    frame = h('iframe', { class: 'rn-iframe', title: project.title || 'Projet', sandbox, allow: 'fullscreen', loading: 'lazy' });
    if (isInline) frame.srcdoc = project.html;
    else frame.src = url;
    host.append(frame);
    bar.hidden = false;
    startBtn.hidden = true;
  };
  const startBtn = h('button', { type: 'button', class: 'btn btn-primary btn-lg', onClick: start }, 'Lancer le projet');
  const fsBtn = h('button', { type: 'button', class: 'btn btn-ghost', onClick: async () => {
    try { await frame.requestFullscreen(); } catch (e) { fail(e, 'Plein écran impossible'); }
  } }, 'Plein écran');
  const reloadBtn = h('button', { type: 'button', class: 'btn btn-ghost', onClick: start }, 'Relancer');
  const bar = h('div', { class: 'rn-bar rn-framebar', hidden: true }, h('span', { class: 'rn-name' }, isInline ? 'Projet HTML' : url), h('div', { class: 'rn-btns' }, reloadBtn, fsBtn));

  host.append(h('div', { class: 'rn-start' }, startBtn));
  const root = h('div', { class: 'runner rn-frame' }, bar, host,
    h('p', { class: 'rn-note' }, 'Le projet s’ouvre dans un cadre isolé de la page.'));
  if (opts && opts.autostart) setTimeout(start, 50);
  return root;
}

export function mountRunner(project, opts = {}) {
  if (project.mode === 'py') return pythonRunner(project, opts);
  if (project.mode === 'html' || project.mode === 'embed') return frameRunner(project, opts);
  return h('div');
}
