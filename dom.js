// Petits outils DOM partagés par toutes les pages.
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// h('div', { class: 'x', onClick: fn }, 'texte', autreElement)
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  let pendingValue;
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') pendingValue = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  if (pendingValue !== undefined) el.value = pendingValue;
  return el;
}

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// N'accepte que http(s), mailto, tel et les chemins relatifs. Bloque javascript:.
export function safeUrl(u) {
  if (!u) return '';
  try {
    const x = new URL(String(u), location.href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(x.protocol) ? String(u) : '';
  } catch (e) {
    return '';
  }
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2)).toUpperCase();
}

export function readText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Lecture impossible de « ' + file.name + ' » : ' + ((r.error && r.error.message) || 'fichier illisible') + '. Si c’est un dossier, mets-le dans le dépôt GitHub.'));
    r.readAsText(file);
  });
}

export function downloadText(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function playIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 14 14');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M3 1.5 L12 7 L3 12.5 Z');
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}
