import { h } from './dom.js';

let toastBox = null;

// Petit message en bas de l'écran. kind : 'ok' | 'info'
export function toast(message, kind = 'ok') {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const t = h('div', { class: 'toast ' + kind }, message);
  toastBox.append(t);
  setTimeout(() => t.remove(), 3200);
}

// Interrupteur façon iOS, accessible (role=switch).
export function switchEl(on, onChange, label) {
  const btn = h('button', { type: 'button', class: 'sw', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label || 'Interrupteur' }, h('span', { class: 'sw-knob' }));
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  return btn;
}
