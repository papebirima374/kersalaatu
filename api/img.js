// Proxy d'image même-origine + MINIATURES à la volée.
// But :
//  1) servir les photos/logos Firebase Storage depuis NOTRE domaine (canvas
//     factures, aperçus Open Graph/WhatsApp) — Content-Type propre, cache long ;
//  2) avec ?w=600 : redimensionner + convertir en WebP (sharp) pour des
//     vignettes ~30-60 Ko (au lieu de 1-2 Mo) — vitrines rapides à grande
//     échelle. Le résultat est mis en cache sur le CDN edge de Vercel
//     (s-maxage=1 an) → après la 1re visite, servi instantanément partout.
//
// Sécurité : restreint à Firebase Storage / Google Storage (anti-SSRF).

import sharp from 'sharp';

const ALLOWED_HOSTS = (h) =>
  h === 'firebasestorage.googleapis.com' ||
  h === 'storage.googleapis.com' ||
  h.endsWith('.firebasestorage.app');

export default async function handler(req, res) {
  const q = req.query || {};
  const raw = q.url;
  const url = Array.isArray(raw) ? raw[0] : raw;
  if (!url || typeof url !== 'string') {
    res.statusCode = 400;
    return res.end('missing url');
  }

  let u;
  try { u = new URL(url); } catch { res.statusCode = 400; return res.end('bad url'); }
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS(u.hostname)) {
    res.statusCode = 403;
    return res.end('forbidden host');
  }

  // Largeur cible (vignette). Bornée pour éviter les abus. Absente = image brute.
  let width = parseInt(Array.isArray(q.w) ? q.w[0] : q.w, 10);
  const resize = Number.isFinite(width) && width > 0;
  if (resize) width = Math.min(Math.max(width, 32), 1600);

  try {
    const upstream = await fetch(u.toString(), { headers: { 'user-agent': 'JappandalImageProxy/1.0' } });
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      return res.end('upstream error');
    }
    let ct = upstream.headers.get('content-type') || '';
    if (!ct.toLowerCase().startsWith('image/')) ct = 'image/png';

    let buf = Buffer.from(await upstream.arrayBuffer());

    if (resize) {
      try {
        buf = await sharp(buf)
          .rotate() // respecte l'orientation EXIF (photos de téléphone)
          .resize(width, width, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 78 })
          .toBuffer();
        ct = 'image/webp';
      } catch {
        // image illisible par sharp (svg, format exotique) → on sert l'original
      }
    }

    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Length', String(buf.length));
    // 1 an sur le CDN edge ; les uploads changent d'URL donc pas d'invalidation
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.statusCode = 200;
    return res.end(buf);
  } catch {
    res.statusCode = 502;
    return res.end('fetch failed');
  }
}
