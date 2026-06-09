// Proxy d'image même-origine.
// But : afficher les logos / photos hébergés sur Firebase Storage
//  1) dans un <canvas> (génération des factures PDF) sans blocage CORS ;
//  2) comme image d'aperçu de lien (Open Graph / WhatsApp) servie depuis NOTRE
//     domaine, avec un Content-Type propre et un cache correct.
//
// Sécurité : restreint à Firebase Storage / Google Storage pour éviter tout
// « open proxy » (SSRF). Aucune autre origine n'est relayée.

const ALLOWED_HOSTS = (h) =>
  h === 'firebasestorage.googleapis.com' ||
  h === 'storage.googleapis.com' ||
  h.endsWith('.firebasestorage.app');

export default async function handler(req, res) {
  const raw = req.query && req.query.url;
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

  try {
    const upstream = await fetch(u.toString(), { headers: { 'user-agent': 'JappandalImageProxy/1.0' } });
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      return res.end('upstream error');
    }
    let ct = upstream.headers.get('content-type') || '';
    if (!ct.toLowerCase().startsWith('image/')) ct = 'image/png';

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.statusCode = 200;
    return res.end(buf);
  } catch {
    res.statusCode = 502;
    return res.end('fetch failed');
  }
}
