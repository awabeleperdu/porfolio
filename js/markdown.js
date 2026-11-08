// Convertit un fichier Markdown (.md) en blocs de page. Tout est du texte : aucun HTML n'est injecté.
import { makeBlock } from './model.js';

const OK_URL = /^https?:\/\//i;

function clean(s) {
  return String(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (m, t, u) => (OK_URL.test(u) ? t + ' (' + u + ')' : t))
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function markdownToBlocks(src) {
  const notes = [];
  let text = String(src || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const meta = {};
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    fm[1].split('\n').forEach((l) => { const m = l.match(/^(\w+)\s*:\s*(.*)$/); if (m) meta[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, '').trim(); });
    text = text.slice(fm[0].length);
  }
  const lines = text.split('\n');
  const blocks = [];
  let title = meta.title || '';
  let desc = meta.description || meta.desc || '';
  let skippedImages = 0;
  const push = (type, props) => blocks.push({ ...makeBlock(type), ...props });

  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }

    const fence = t.match(/^(`{3,}|~{3,})\s*([\w+#-]*)/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
      i++;
      const lang = (fence[2] || '').toLowerCase();
      const map = { py: 'python', python: 'python', js: 'javascript', javascript: 'javascript', ts: 'javascript', html: 'html', css: 'css', json: 'json', sh: 'bash', bash: 'bash', shell: 'bash', zsh: 'bash' };
      push('code', { lang: map[lang] || 'texte', code: buf.join('\n') });
      continue;
    }
    const head = t.match(/^(#{1,6})\s+(.*?)\s*#*$/);
    if (head) {
      const label = clean(head[2]);
      if (head[1].length === 1 && !title && !blocks.length) title = label;
      else push('title', { text: label });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { push('divider', {}); i++; continue; }

    const img = t.match(/^!\[([^\]]*)\]\(([^)\s]+)[^)]*\)$/);
    if (img) {
      if (OK_URL.test(img[2])) push('image', { src: img[2], caption: img[1] });
      else skippedImages++;
      i++;
      continue;
    }
    const link = t.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) { push('button', { text: link[1], url: link[2] }); i++; continue; }
    if (/^https?:\/\/\S+$/.test(t) && /(youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm)(\?|$))/i.test(t)) { push('video', { url: t }); i++; continue; }

    if (t.startsWith('|')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) buf.push(lines[i++].trim());
      push('code', { lang: 'texte', code: buf.join('\n') });
      continue;
    }
    if (/^>/.test(t)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(clean(lines[i++].replace(/^\s*>\s?/, '')));
      push('text', { text: '« ' + buf.filter(Boolean).join(' ') + ' »' });
      continue;
    }
    if (/^([-*+]|\d+[.)])\s+/.test(t)) {
      const buf = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        const indent = m[1].length >= 2 ? '    ' : '';
        buf.push(indent + (/\d/.test(m[2]) ? m[2] + ' ' : '• ') + clean(m[3].replace(/^\[( |x)\]\s*/i, (s, c) => (c === ' ' ? '☐ ' : '☑ '))));
        i++;
      }
      push('text', { text: buf.join('\n') });
      continue;
    }
    // paragraphe : lignes consécutives
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|`{3,}|~{3,}|\||>|([-*+]|\d+[.)])\s|!\[|-{3,}$|\*{3,}$)/.test(lines[i].trim())) buf.push(lines[i++].trim());
    if (!buf.length) { buf.push(t); i++; }
    const para = clean(buf.join(' '));
    if (para) push('text', { text: para });
  }

  // le premier paragraphe devient la description du projet
  if (!desc && blocks[0] && blocks[0].type === 'text' && blocks[0].text.length <= 220 && !blocks[0].text.includes('\n')) {
    desc = blocks.shift().text;
  }
  if (skippedImages) notes.push(skippedImages + ' image(s) ignorée(s) : seules les images en https:// sont reprises. Ajoute les autres avec un bloc Image.');
  return { blocks, title, desc, tags: meta.tags ? meta.tags.replace(/[\[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean) : [], notes };
}
