// ─── Miniatures d'images à la volée ─────────────────────────────────────────
// Les photos produits en base peuvent peser plusieurs Mo (uploads anciens non
// compressés) : les afficher telles quelles rend les grilles très lentes.
// On les sert via NOTRE proxy maison /api/img?url=…&w=… (sharp → WebP), mis en
// cache 1 an sur le CDN edge de Vercel : ~2 Mo → ~30-60 Ko, servi près du
// Sénégal après la 1re visite. Aucune dépendance à un service tiers (scalable).
// L'image D'ORIGINE n'est jamais modifiée (le zoom plein écran la garde).

export const thumb = (url, w = 600) => {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return url;
  // On ne passe par le proxy que pour les images Firebase Storage (hôtes autorisés).
  if (!/(^https:\/\/firebasestorage\.googleapis\.com|\.firebasestorage\.app|storage\.googleapis\.com)/i.test(url)) {
    return url;
  }
  return `/api/img?url=${encodeURIComponent(url)}&w=${w}`;
};

// onError : si le CDN est indisponible, retombe sur l'URL d'origine (une fois).
export const fallbackSrc = (originalUrl) => (e) => {
  const img = e.currentTarget;
  if (img.dataset.fbk || !originalUrl) return;
  img.dataset.fbk = '1';
  img.src = originalUrl;
};
