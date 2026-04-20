// api/confirm-preinscription.js
// Envoie un email de confirmation à l'utilisateur qui vient de se pré-inscrire
// Déclenché automatiquement par ComingSoon.jsx après insertion en base

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  try {
    await resend.emails.send({
      from: 'Mongazon360 <bonjour@mongazon360.fr>',
      to: email,
      subject: '🌿 Vous êtes sur la liste — Mongazon360',
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#0f2419;font-family:Nunito,Arial,sans-serif;">
          <div style="max-width:520px;margin:0 auto;padding:40px 24px;">

            <div style="text-align:center;margin-bottom:32px;">
              <img src="https://mongazon360.fr/icon-192.png" alt="Mongazon360" width="72" height="72"
                style="border-radius:16px;margin-bottom:16px;" />
              <h1 style="color:#95d5b2;font-size:22px;margin:0 0 8px;">
                Vous êtes sur la liste ! 🌿
              </h1>
              <p style="color:#52b788;font-size:14px;margin:0;">
                Merci de votre intérêt pour Mongazon360
              </p>
            </div>

            <div style="background:rgba(82,183,136,0.1);border:1px solid rgba(82,183,136,0.25);
              border-radius:16px;padding:24px;margin-bottom:24px;">
              <p style="color:#e8f5e9;font-size:14px;line-height:1.7;margin:0 0 16px;">
                Bonjour,<br><br>
                Votre pré-inscription est bien enregistrée. Vous serez parmi les <strong style="color:#95d5b2;">
                premiers à accéder à Mongazon360</strong> dès l'ouverture officielle.
              </p>
              <p style="color:#95d5b2;font-size:13px;line-height:1.7;margin:0;">
                🌱 Suivi intelligent de votre gazon<br>
                📅 Calendrier d'entretien personnalisé<br>
                🌦️ Alertes météo adaptées à votre pelouse<br>
                🏆 Classements et défis entre voisins
              </p>
            </div>

            <div style="text-align:center;margin-bottom:24px;">
              <a href="https://mongazon360.fr" 
                style="display:inline-block;background:linear-gradient(135deg,#52b788,#2d6a4f);
                color:#fff;font-weight:800;font-size:14px;padding:14px 32px;
                border-radius:12px;text-decoration:none;">
                Visiter Mongazon360
              </a>
            </div>

            <p style="color:#4a7c5c;font-size:11px;text-align:center;margin:0;line-height:1.6;">
              Vous recevrez un email dès que l'app sera disponible.<br>
              Pour vous désinscrire, répondez à cet email avec "STOP".<br>
              Mongazon360 — <a href="https://mongazon360.fr/confidentialite" 
                style="color:#52b788;">Politique de confidentialité</a>
            </p>

          </div>
        </body>
        </html>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[MG360] Erreur email confirmation:', error);
    return res.status(500).json({ error: 'Erreur envoi email' });
  }
}
