import { getStore } from './store.js';

const cache = new Map();

// "m:abc123" = image stockée dans la base ; sinon c'est une URL normale.
export async function resolveSrc(src) {
  if (!src) return '';
  if (!String(src).startsWith('m:')) return src;
  const id = String(src).slice(2);
  if (!cache.has(id)) {
    cache.set(id, getStore().then((s) => s.getMedia(id)).catch((e) => { cache.delete(id); throw e; }));
  }
  return cache.get(id);
}

export function rememberMedia(id, dataUrl) {
  cache.set(id, Promise.resolve(dataUrl));
}
