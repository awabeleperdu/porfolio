// Redimensionne et compresse une image dans le navigateur (max 1400 px, JPEG).
// Résultat < 900 000 caractères : c'est la limite d'un document Firestore (1 Mo).
const LIMIT = 900000;

export async function compressImage(file, max = 1400) {
  if (!file || !file.type || file.type.indexOf('image/') !== 0) {
    throw new Error('« ' + ((file && file.name) || 'fichier') + ' » n’est pas une image. Choisis un fichier .jpg, .png ou .webp.');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Impossible de lire l’image « ' + file.name + ' » (format non pris en charge ?).'));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let q = 0.86;
    let out = c.toDataURL('image/jpeg', q);
    while (out.length > LIMIT && q > 0.4) {
      q -= 0.1;
      out = c.toDataURL('image/jpeg', q);
    }
    if (out.length > LIMIT) throw new Error('L’image « ' + file.name + ' » est trop lourde même après compression. Utilise une image plus petite.');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
