// api/notify-waitlist.js
// Envoie un email de lancement à tous les inscrits sur la liste d'attente
// À déclencher UNE SEULE FOIS lors de l'ouverture officielle de l'app
//
// COMMENT L'UTILISER :
// Depuis ton terminal ou via un outil comme Postman/Insomnia :
//
//   curl -X POST https://mongazon360.fr/api/notify-waitlist \
//     -H "Content-Type: application/json" \
//     -H "Authorization: Bearer NOTIFY_SECRET_changez_moi" \
//     -d '{}'
//
// ⚠️ Change NOTIFY_SECRET dans Vercel → Environment Variables avant utilisation

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend  = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NOTIFY_SECRET = process.env.NOTIFY_SECRET || 'NOTIFY_SECRET_changez_moi';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérification du secret — protège contre les appels non autorisés
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${NOTIFY_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    // Récupérer tous les inscrits non encore notifiés
    const { data: inscrits, error } = await supabase
      .from('preinscriptions')
      .select('email')
      .eq('notified', false);

    if (error) throw error;
    if (!inscrits || inscrits.length === 0) {
      return res.status(200).json({ message: 'Aucun inscrit à notifier', count: 0 });
    }

    let success = 0;
    let failed  = 0;
    const failedEmails = [];

    // Envoyer les emails par batch de 10 (limite Resend)
    for (const inscrit of inscrits) {
      try {
        await resend.emails.send({
          from: 'Mongazon360 <bonjour@mongazon360.fr>',
          to: inscrit.email,
          subject: '🌿 Mongazon360™ est maintenant ouvert !',
          html: `
            <!DOCTYPE html>
            <html lang="fr">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#0f2419;font-family:Nunito,Arial,sans-serif;">
              <div style="max-width:520px;margin:0 auto;padding:40px 24px;">

                <div style="text-align:center;margin-bottom:32px;">
                  <img src="https://mongazon360.fr/icon-192.png" alt="Mongazon360" width="72" height="72"
                    style="border-radius:16px;margin-bottom:16px;" />
                  <h1 style="color:#95d5b2;font-size:24px;margin:0 0 8px;">
                    C'est ouvert ! 🎉
                  </h1>
                  <p style="color:#52b788;font-size:14px;margin:0;">
                    Mongazon360<sup style="font-size:9px;">™</sup> est maintenant disponible
                  </p>
                </div>

                <div style="background:rgba(82,183,136,0.1);border:1px solid rgba(82,183,136,0.25);
                  border-radius:16px;padding:24px;margin-bottom:24px;">
                  <p style="color:#e8f5e9;font-size:14px;line-height:1.7;margin:0 0 16px;">
                    Bonjour,<br><br>
                    Vous faisiez partie de notre liste d'attente — <strong style="color:#95d5b2;">
                    Mongazon360<sup style="font-size:9px;">™</sup> est maintenant ouvert !</strong><br><br>
                    Créez votre compte et commencez à entretenir votre gazon comme un pro.
                  </p>
                  <p style="color:#95d5b2;font-size:13px;line-height:1.7;margin:0;">
                    🌱 Suivi intelligent de votre gazon<br>
                    📅 Calendrier d'entretien personnalisé<br>
                    🌦️ Alertes météo adaptées à votre pelouse<br>
                    🏆 Classements et défis entre voisins
                  </p>
                </div>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="https://mongazon360.fr/login"
                    style="display:inline-block;background:linear-gradient(135deg,#52b788,#2d6a4f);
                    color:#fff;font-weight:800;font-size:15px;padding:16px 40px;
                    border-radius:14px;text-decoration:none;letter-spacing:0.3px;">
                    🚀 Accéder à Mongazon360
                  </a>
                </div>

                <div style="text-align:center;padding:16px 0 8px;border-top:1px solid rgba(82,183,136,0.15);margin-bottom:8px;">
                  <p style="color:#52b788;font-size:12px;font-weight:600;margin:0 0 4px;">
                    L'équipe Mongazon360<sup style="font-size:8px;">™</sup>
                  </p>
                  <p style="color:#4a7c5c;font-size:10px;font-style:italic;margin:0;">
                    Tant qu'il y a gazon, il y a match
                  </p>
                </div>

                <p style="color:#4a7c5c;font-size:11px;text-align:center;margin:0;line-height:1.6;">
                  Vous recevez cet email car vous vous êtes pré-inscrit sur mongazon360.fr.<br>
                  Pour vous désinscrire, répondez à cet email avec "STOP".<br>
                  © ${new Date().getFullYear()} Mongazon360<sup style="font-size:8px;">™</sup> — Marque déposée à l'EUIPO<br>
                  <a href="https://mongazon360.fr/mentions-legales" style="color:#52b788;">Mentions légales</a> ·
                  <a href="https://mongazon360.fr/confidentialite" style="color:#52b788;">Confidentialité</a>
                </p>

              </div>
            </body>
            </html>
          `,
        });

        // Marquer comme notifié
        await supabase
          .from('preinscriptions')
          .update({ notified: true })
          .eq('email', inscrit.email);

        success++;
      } catch (err) {
        console.error(`[MG360] Échec email ${inscrit.email}:`, err.message);
        failed++;
        failedEmails.push(inscrit.email);
      }

      // Petite pause pour éviter le rate limit Resend
      await new Promise(r => setTimeout(r, 100));
    }

    return res.status(200).json({
      message: `Emails envoyés : ${success} succès, ${failed} échecs`,
      success,
      failed,
      failedEmails,
    });

  } catch (error) {
    console.error('[MG360] Erreur notify-waitlist:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
