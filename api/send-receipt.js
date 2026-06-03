// Envoi d'un reçu PDF par e-mail (via Resend).
// POST { to, subject, html, pdfBase64, filename }
// Nécessite RESEND_API_KEY (Vercel env). Pour envoyer à des adresses clients
// (pas seulement la tienne), un domaine vérifié dans Resend est requis (REMINDER_FROM_EMAIL).

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDER_FROM_EMAIL || 'Jappandal Tech <onboarding@resend.dev>';
  if (!resendKey) return res.status(400).json({ error: "Service e-mail non configuré (RESEND_API_KEY manquant)." });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { to, subject, html, pdfBase64, filename } = body || {};
  if (!to || !pdfBase64) return res.status(400).json({ error: 'Champs manquants (to / pdfBase64).' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject || 'Votre reçu — Jappandal Tech',
        html: html || '<p>Bonjour,<br/>Veuillez trouver votre reçu en pièce jointe.<br/>Merci de votre confiance — Jappandal Tech.</p>',
        attachments: [{ filename: filename || 'recu.pdf', content: pdfBase64 }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data?.message || data?.name || "Échec de l'envoi." });
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
