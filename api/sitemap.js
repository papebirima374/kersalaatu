// Sitemap dynamique pour Google (et autres moteurs).
//
// Liste automatiquement : la page d'accueil, l'annuaire des boutiques, et
// CHAQUE boutique (/shop/:slug). Quand une nouvelle boutique est créée, elle
// apparaît ici sans rien toucher — Google la découvre au prochain passage.
//
// Servi sur /sitemap.xml via un rewrite (voir vercel.json). Mis en cache sur le
// CDN edge (s-maxage) pour ne pas interroger Firestore à chaque visite de robot.

const BASE = 'https://www.jappandal.com'; // domaine canonique (l'apex redirige ici)
const PROJECT = 'kersalaatu';

const xmlEscape = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function fetchSlugs() {
  const out = [];
  let pageToken = '';
  for (let i = 0; i < 6; i++) { // pagination de sécurité
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/boutiques`
      + `?pageSize=300&mask.fieldPaths=slug${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const r = await fetch(url);
    if (!r.ok) break;
    const j = await r.json();
    (j.documents || []).forEach((d) => {
      const slug = d.fields?.slug?.stringValue;
      if (slug) out.push(slug);
    });
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  return [...new Set(out)];
}

export default async function handler(req, res) {
  let slugs = [];
  try { slugs = await fetchSlugs(); } catch { slugs = []; }

  const urls = [
    { loc: `${BASE}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${BASE}/boutiques`, changefreq: 'daily', priority: '0.9' },
    ...slugs.map((s) => ({ loc: `${BASE}/shop/${encodeURIComponent(s)}`, changefreq: 'weekly', priority: '0.8' })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(body);
}
