// Vercel Cron — rappels d'abonnement quotidiens (Jappandal Tech).
// Lit les boutiques (Firestore REST, lecture publique), repère celles qui expirent
// (J-3 → expirées) et envoie un récap par e-mail à l'admin, avec un lien WhatsApp
// pré-rempli par client pour relancer en 1 tap.
//
// Variables d'env (Vercel) :
//   VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY  (déjà présentes)
//   RESEND_API_KEY            (clé Resend — service d'envoi d'e-mail)
//   REMINDER_ADMIN_EMAIL      (ton e-mail, qui reçoit le récap)
//   REMINDER_FROM_EMAIL       (optionnel — défaut : onboarding@resend.dev)
//   CRON_SECRET               (optionnel — protège le déclenchement)

export default async function handler(req, res) {
  // Sécurité : seul Vercel Cron (en-tête) ou un test manuel avec ?key= peut déclencher
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    const key = (req.query && req.query.key) || '';
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!projectId || !apiKey) {
    return res.status(500).json({ error: 'VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY manquants' });
  }

  // 1) Lire les boutiques
  const docs = await (async () => {
    try {
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/boutiques?key=${apiKey}&pageSize=300`);
      const data = await r.json();
      return data.documents || [];
    } catch {
      return null;
    }
  })();
  if (docs === null) {
    return res.status(500).json({ error: 'lecture Firestore échouée' });
  }

  const DAY = 86400000;
  const sv = (x) => (x && x.stringValue) || '';
  const toRelance = [];
  for (const d of docs) {
    const f = d.fields || {};
    const ab = (f.abonnement && f.abonnement.mapValue && f.abonnement.mapValue.fields) || {};
    const plan = sv(ab.plan) || 'Découverte';
    if (plan === 'Découverte') continue; // forfait gratuit → pas de relance
    const expStr = sv(ab.dateExpiration);
    if (!expStr) continue;
    const days = Math.ceil((new Date(expStr).getTime() - Date.now()) / DAY);
    if (days <= 3) { // J-3, J-2, J-1, aujourd'hui et déjà expirées
      toRelance.push({
        name: sv(f.name),
        plan,
        days,
        whatsapp: sv(f.whatsapp).replace(/\D/g, ''),
        email: sv(f.ownerEmail),
        exp: new Date(expStr).toLocaleDateString('fr-FR'),
      });
    }
  }
  toRelance.sort((a, b) => a.days - b.days); // expirées d'abord

  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.REMINDER_ADMIN_EMAIL;
  const fromEmail = process.env.REMINDER_FROM_EMAIL || 'Jappandal Tech <onboarding@resend.dev>';

  let emailSent = false;
  if (toRelance.length > 0 && resendKey && adminEmail) {
    const rows = toRelance.map(e => {
      const status = e.days < 0 ? `⛔ EXPIRÉ (${-e.days} j)` : e.days === 0 ? "⏳ expire AUJOURD'HUI" : `⏳ expire dans ${e.days} j`;
      const msg = `Bonjour ${e.name}, votre abonnement Jappandal Tech (${e.plan}) ${e.days < 0 ? 'a expiré' : `expire le ${e.exp}`}. Pensez à renouveler pour garder votre boutique en ligne. Merci !`;
      const wa = e.whatsapp ? `https://wa.me/${e.whatsapp}?text=${encodeURIComponent(msg)}` : '';
      const action = wa ? `<a href="${wa}" style="color:#2563eb;font-weight:bold">Relancer sur WhatsApp</a>` : (e.email || '—');
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${e.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${e.plan}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${status}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${e.exp}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${action}</td>
      </tr>`;
    }).join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:640px">
      <h2 style="color:#2563eb">🔔 Rappels d'abonnement — Jappandal Tech</h2>
      <p><b>${toRelance.length}</b> boutique(s) à relancer :</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr style="background:#f1f5f9;text-align:left">
          <th style="padding:8px 10px">Boutique</th><th style="padding:8px 10px">Forfait</th>
          <th style="padding:8px 10px">Statut</th><th style="padding:8px 10px">Échéance</th><th style="padding:8px 10px">Action</th>
        </tr>
        ${rows}
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:16px">Envoyé automatiquement chaque jour par Jappandal Tech.</p>
    </div>`;
    try {
      const er = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: [adminEmail], subject: `🔔 ${toRelance.length} abonnement(s) à relancer`, html }),
      });
      emailSent = er.ok;
    } catch { /* ignore */ }
  }

  return res.status(200).json({
    ok: true,
    checked: docs.length,
    toRelance: toRelance.length,
    emailConfigured: !!(resendKey && adminEmail),
    emailSent,
    list: toRelance.map(e => ({ name: e.name, days: e.days, exp: e.exp, whatsapp: !!e.whatsapp })),
  });
}
