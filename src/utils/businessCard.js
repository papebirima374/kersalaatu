// ─── Carte de visite professionnelle (SaaS Pro / Premium VIP) ───────────────
// Carte 1200×700 (ratio carte bancaire) aux COULEURS de la boutique :
// bandeau de marque avec logo + nom + description complète, coordonnées
// (téléphone, adresse) et QR code de la vitrine. Fonction pure (entrées
// pré-chargées) → testable hors React.

export function buildBusinessCardCanvas(b, { qrDataUrl, logoImg = null }) {
  const W = 1200, H = 700, R = 40;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const brand = b.couleurMarque || '#2563eb';

  // Nuance plus sombre de la couleur de marque (pour le dégradé)
  const shade = (hex, f) => {
    const h = String(hex).replace('#', '');
    const n = (i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f)));
    return `rgb(${n(0)},${n(2)},${n(4)})`;
  };

  const rr = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Découpe le texte en lignes (par largeur max)
  const wrap = (text, maxW, maxLines) => {
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
    const out = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) {
        out.push(line); line = w;
        if (out.length === maxLines) break;
      } else line = t;
    }
    if (line && out.length < maxLines) out.push(line);
    // ellipse si tronqué
    if (out.length === maxLines && words.join(' ').length > out.join(' ').length) {
      let last = out[maxLines - 1];
      while (ctx.measureText(last + '…').width > maxW && last.length > 2) last = last.slice(0, -1);
      out[maxLines - 1] = last + '…';
    }
    return out;
  };

  // ── Carte blanche arrondie + ombre ──
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.18)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  rr(8, 8, W - 16, H - 16, R); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();

  ctx.save(); rr(8, 8, W - 16, H - 16, R); ctx.clip();

  // ── Bandeau de marque (dégradé) ──
  const HB = 280;
  const grad = ctx.createLinearGradient(0, 8, W, HB);
  grad.addColorStop(0, brand);
  grad.addColorStop(1, shade(brand, 0.68));
  ctx.fillStyle = grad;
  ctx.fillRect(8, 8, W - 16, HB);

  // Cercles décoratifs translucides (vie + relief)
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(W - 160, 10, 150, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.arc(W - 330, 250, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.beginPath(); ctx.arc(120, HB + 10, 170, 0, Math.PI * 2); ctx.fill();

  // ── Logo dans une pastille blanche ──
  const lx = 70, ly = 62, ls = 156;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
  rr(lx, ly, ls, ls, 32); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
  if (logoImg) {
    ctx.save(); rr(lx + 6, ly + 6, ls - 12, ls - 12, 26); ctx.clip();
    const sc = Math.min((ls - 12) / logoImg.width, (ls - 12) / logoImg.height);
    const dw = logoImg.width * sc, dh = logoImg.height * sc;
    ctx.drawImage(logoImg, lx + 6 + (ls - 12 - dw) / 2, ly + 6 + (ls - 12 - dh) / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = brand; ctx.font = '800 64px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const initials = String(b.name || 'B').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    ctx.fillText(initials, lx + ls / 2, ly + ls / 2 + 4);
  }

  // ── Nom (blanc, 2 lignes max) + description COMPLÈTE ──
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const nx = lx + ls + 38;
  const nameMaxW = 500;
  ctx.font = '800 52px Arial';
  const nameLines = wrap(b.name || 'Ma boutique', nameMaxW, 2);
  ctx.fillStyle = '#ffffff';
  let ny = 124;
  nameLines.forEach(l => { ctx.fillText(l, nx, ny); ny += 56; });

  if (b.description) {
    ctx.font = '400 25px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const descLines = wrap(b.description, nameMaxW, nameLines.length === 1 ? 3 : 2);
    let dy = ny + 2;
    descLines.forEach(l => { ctx.fillText(l, nx, dy); dy += 33; });
  }

  // ── Coordonnées (sous le bandeau) ──
  const rows = [];
  if (b.whatsapp) rows.push(['TÉL / WHATSAPP', String(b.whatsapp) + (b.whatsapp2 ? '   ·   ' + b.whatsapp2 : '')]);
  if (b.adresse) rows.push(['ADRESSE', String(b.adresse)]);

  let cy = HB + 110;
  rows.forEach(([label, value]) => {
    // pastille icône à la couleur de marque
    ctx.fillStyle = brand;
    rr(70, cy - 34, 14, 14, 4); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.font = '700 21px Arial';
    ctx.fillText(label, 102, cy - 22);
    ctx.fillStyle = '#1e293b'; ctx.font = '700 31px Arial';
    const valLines = wrap(value, 620, 2);
    let vy = cy + 16;
    valLines.forEach(l => { ctx.fillText(l, 102, vy); vy += 36; });
    cy += 64 + (valLines.length - 1) * 36 + 36;
  });

  // ── QR code à droite (chevauche le bandeau = relief) ──
  const qs = 280, qx = W - qs - 100, qy = 180;
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.22)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6;
  rr(qx - 24, qy - 24, qs + 48, qs + 92, 30); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; rr(qx - 24, qy - 24, qs + 48, qs + 92, 30); ctx.stroke();
  if (qrDataUrl && qrDataUrl.img) ctx.drawImage(qrDataUrl.img, qx, qy, qs, qs);
  ctx.fillStyle = brand; ctx.font = '800 24px Arial'; ctx.textAlign = 'center';
  ctx.fillText('Scannez pour commander', qx + qs / 2, qy + qs + 44);

  // ── Pied de carte ──
  ctx.fillStyle = '#f1f5f9'; ctx.fillRect(8, H - 80, W - 16, 72);
  ctx.fillStyle = brand; ctx.fillRect(8, H - 80, W - 16, 4);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b'; ctx.font = '600 22px Arial';
  ctx.fillText('Propulsé par Jappandal Tech  ·  jappandal.com', 70, H - 36);

  ctx.restore();
  return canvas;
}
