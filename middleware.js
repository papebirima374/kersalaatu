import { next } from '@vercel/edge';

// S'exécute uniquement sur les liens de vitrine /shop/...
export const config = {
  matcher: '/shop/:path*',
};

// Robots d'aperçu (WhatsApp, Facebook, Twitter/X, Telegram, LinkedIn, Slack, Discord…)
const CRAWLER = /facebookexternalhit|facebot|WhatsApp|Twitterbot|Slackbot|Slack-ImgProxy|LinkedInBot|TelegramBot|Discordbot|Pinterest|redditbot|Applebot|vkShare|Googlebot|bingbot|embedly|quora link preview|outbrain|SkypeUriPreview|nuzzel|Iframely|W3C_Validator/i;

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  // Vrais visiteurs : on sert l'app normalement (aucun ralentissement).
  if (!CRAWLER.test(ua)) return next();

  const url = new URL(request.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/shop\//, '').split('/')[0] || '');
  if (!slug) return next();

  // 1) Récupère la boutique par son slug via l'API REST Firestore (clé web publique)
  let shop = null;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (projectId && apiKey) {
    try {
      const query = {
        structuredQuery: {
          from: [{ collectionId: 'boutiques' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: slug },
            },
          },
          limit: 1,
        },
      };
      const r = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(query) }
      );
      const data = await r.json();
      const doc = Array.isArray(data) ? data.find((d) => d && d.document)?.document : null;
      if (doc && doc.fields) {
        const f = doc.fields;
        shop = {
          name: f.name?.stringValue || '',
          description: f.description?.stringValue || '',
          logo: f.logo?.stringValue || '',
        };
      }
    } catch {
      /* en cas d'échec, on retombe sur l'aperçu Jappandal par défaut */
    }
  }

  // 2) Récupère le HTML de base
  const htmlRes = await fetch(new URL('/index.html', url.origin));
  let html = await htmlRes.text();

  // 3) Injecte les balises d'aperçu spécifiques à la boutique
  if (shop && shop.name) {
    // Logo distant (Firebase Storage) → on le sert via notre proxy même-domaine
    // /api/img : Content-Type propre + cache, et image livrée depuis notre domaine
    // (plus fiable pour l'aperçu WhatsApp/Facebook que l'URL Storage brute).
    const isImg = /^https?:\/\//i.test(shop.logo);
    const image = isImg
      ? (shop.logo.includes('firebasestorage.googleapis.com')
          ? `${url.origin}/api/img?url=${encodeURIComponent(shop.logo)}`
          : shop.logo)
      : `${url.origin}/icon-512.png`;
    const title = `${shop.name} — Boutique en ligne`;
    const desc = shop.description || `Découvrez ${shop.name} et commandez en ligne en un clic.`;
    const pageUrl = `${url.origin}/shop/${slug}`;

    const tags = `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(shop.name)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:url" content="${esc(pageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <link rel="canonical" href="${esc(pageUrl)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
  </head>`;

    // Retire le titre + la description par défaut, puis injecte avant </head>
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/<meta\s+name="description"[^>]*>/i, '')
      .replace('</head>', tags);
  }

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600',
    },
  });
}
