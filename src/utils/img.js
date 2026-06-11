// ─── Miniatures d'images à la volée ─────────────────────────────────────────
// Les photos produits déjà en base peuvent peser plusieurs Mo (uploads anciens
// non compressés) : les afficher telles quelles rend les grilles très lentes
// sur mobile. On les sert via le CDN public images.weserv.nl qui redimensionne,
// convertit en WebP et met en cache mondialement : ~3 Mo → ~30-60 Ko.
// L'image D'ORIGINE n'est jamais modifiée (le zoom plein écran la garde).

export const thumb = (url, w = 600) => {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${w}&q=78&output=webp`;
};

// onError : si le CDN est indisponible, retombe sur l'URL d'origine (une fois).
export const fallbackSrc = (originalUrl) => (e) => {
  const img = e.currentTarget;
  if (img.dataset.fbk || !originalUrl) return;
  img.dataset.fbk = '1';
  img.src = originalUrl;
};
