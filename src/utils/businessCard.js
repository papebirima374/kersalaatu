// ─── Carte de visite professionnelle (SaaS Pro / Premium VIP) ───────────────
// Dessine une carte 1200×700 (ratio carte bancaire) sur un canvas :
// logo (ou pastille initiales), nom, téléphone(s), adresse, lien vitrine et
// QR code. Entrées pré-chargées (qrDataUrl / logoDataUrl) → fonction pure,
// utilisable et testable hors React.

export function buildBusinessCardCanvas(b, { shopUrlDisplay, qrDataUrl, logoImg = null }) {
  const W = 1200, H = 700, R = 40;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const brand = b.couleurMarque || '#2563eb';

  const rr = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Carte blanche arrondie (fond transparent autour) + ombre douce
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.18)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  rr(8, 8, W - 16, H - 16, R); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();

  // Tout le décor est découpé dans la carte
  ctx.save(); rr(8, 8, W - 16, H - 16, R); ctx.clip();

  // Bande de marque à gauche + filet doré discret
  ctx.fillStyle = brand; ctx.fillRect(8, 8, 18, H - 16);
  // Bandeau bas
  ctx.fillStyle = '#f1f5f9'; ctx.fillRect(8, H - 86, W - 16, 78);

  // ── Logo ──
  const lx = 78, ly = 70, ls = 150;
  if (logoImg) {
    ctx.save(); rr(lx, ly, ls, ls, 30); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(lx, ly, ls, ls);
    const sc = Math.min(ls / logoImg.width, ls / logoImg.height) * 0.92;
    const dw = logoImg.width * sc, dh = logoImg.height * sc;
    ctx.drawImage(logoImg, lx + (ls - dw) / 2, ly + (ls - dh) / 2, dw, dh);
    ctx.restore();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; rr(lx, ly, ls, ls, 30); ctx.stroke();
  } else {
    rr(lx, ly, ls, ls, 30); ctx.fillStyle = brand; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '800 62px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const initials = String(b.name || 'B').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    ctx.fillText(initials, lx + ls / 2, ly + ls / 2 + 4);
  }

  // ── Nom de la boutique (2 lignes max) ──
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f172a'; ctx.font = '800 54px Arial';
  const maxW = 500;
  const words = String(b.name || 'Ma boutique').trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
    if (lines.length === 2) break;
  }
  if (line && lines.length < 2) lines.push(line);
  let ny = ly + 56;
  const nx = lx + ls + 36;
  lines.slice(0, 2).forEach(l => { ctx.fillText(l, nx, ny); ny += 60; });

  // Tagline (description, 1 ligne)
  if (b.description) {
    ctx.fillStyle = '#64748b'; ctx.font = '400 26px Arial';
    let desc = String(b.description).replace(/\s+/g, ' ').trim();
    while (ctx.measureText(desc).width > maxW && desc.length > 4) desc = desc.slice(0, -5) + '…';
    ctx.fillText(desc, nx, ny + 2);
  }

  // ── Séparateur ──
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(78, 290); ctx.lineTo(700, 290); ctx.stroke();

  // ── Coordonnées ──
  const rows = [];
  if (b.whatsapp) rows.push(['TÉL / WHATSAPP', String(b.whatsapp) + (b.whatsapp2 ? '   ·   ' + b.whatsapp2 : '')]);
  if (b.adresse) rows.push(['ADRESSE', String(b.adresse)]);
  rows.push(['BOUTIQUE EN LIGNE', shopUrlDisplay]);

  let cy = 348;
  rows.forEach(([label, value]) => {
    // puce de marque
    ctx.fillStyle = brand;
    ctx.beginPath(); ctx.arc(88, cy - 9, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.font = '700 20px Arial';
    ctx.fillText(label, 112, cy - 16);
    ctx.fillStyle = label === 'BOUTIQUE EN LIGNE' ? brand : '#1e293b';
    ctx.font = (label === 'BOUTIQUE EN LIGNE' ? '800 ' : '600 ') + '30px Arial';
    let v = value;
    while (ctx.measureText(v).width > 640 && v.length > 4) v = v.slice(0, -5) + '…';
    ctx.fillText(v, 112, cy + 18);
    cy += 86;
  });

  // ── QR code à droite ──
  const qs = 300, qx = W - qs - 96, qy = 140;
  rr(qx - 22, qy - 22, qs + 44, qs + 88, 28);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.5; rr(qx - 22, qy - 22, qs + 44, qs + 88, 28); ctx.stroke();
  if (qrDataUrl && qrDataUrl.img) {
    ctx.drawImage(qrDataUrl.img, qx, qy, qs, qs);
  }
  ctx.fillStyle = '#475569'; ctx.font = '700 24px Arial'; ctx.textAlign = 'center';
  ctx.fillText('Scannez pour commander', qx + qs / 2, qy + qs + 42);

  // ── Pied de carte ──
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8'; ctx.font = '600 22px Arial';
  ctx.fillText('Propulsé par Jappandal Tech  ·  jappandal.com', 78, H - 38);

  ctx.restore();
  return canvas;
}
