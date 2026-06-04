// api/notify-waitlist.js
// Envoie un email de lancement premium à tous les inscrits sur la liste d'attente
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

// ── Template HTML de lancement (synchronisé avec launch-announcement.html) ──
function buildLaunchHtml() {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mongazon360™ est ouvert !</title>
</head>
<body style="margin:0;padding:0;background:#0f2419;font-family:'Nunito',Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <!-- Preheader (texte invisible dans aperçu boîte mail) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#0f2419;">
    Le jour J est arrivé ! Votre expert gazon intelligent est prêt à transformer votre pelouse.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f2419;">
    <tr>
      <td align="center" style="padding:0;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- HEADER HERO -->
          <tr>
            <td style="padding:48px 32px 32px;text-align:center;background:linear-gradient(135deg,#1a4731 0%,#0d2b1a 100%);border-radius:20px 20px 0 0;">

              <img src="https://mongazon360.fr/icon-192.png" alt="Mongazon360" width="84" height="84"
                   style="border-radius:20px;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;" />

              <div style="display:inline-block;background:rgba(82,183,136,0.18);border:1px solid rgba(82,183,136,0.4);border-radius:24px;padding:6px 16px;margin-bottom:20px;">
                <span style="color:#95d5b2;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">
                  🚀 Le jour J est arrivé
                </span>
              </div>

              <h1 style="color:#ffffff;font-size:32px;font-weight:800;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px;">
                Mongazon360<sup style="font-size:14px;">™</sup><br>
                <span style="color:#95d5b2;">est ouvert !</span>
              </h1>

              <p style="color:#a5d6a7;font-size:15px;line-height:1.5;margin:0 0 4px;">
                Votre expert gazon intelligent est prêt
              </p>
              <p style="color:#52b788;font-size:13px;font-style:italic;margin:0;">
                Tant qu'il y a gazon, il y a match
              </p>
            </td>
          </tr>

          <!-- BODY PRINCIPAL -->
          <tr>
            <td style="padding:36px 32px 8px;background:#0f2419;">
              <p style="color:#e8f5e9;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Bonjour 👋,
              </p>
              <p style="color:#e8f5e9;font-size:15px;line-height:1.7;margin:0 0 28px;">
                Vous étiez sur notre liste d'attente — <strong style="color:#95d5b2;">le moment est venu.</strong>
                Mongazon360<sup style="font-size:10px;">™</sup> est officiellement ouvert. Créez votre compte
                et laissez l'IA s'occuper de votre gazon.
              </p>

              <!-- CTA Principal -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 36px;">
                    <a href="https://mongazon360.fr/login"
                       style="display:inline-block;background:linear-gradient(135deg,#52b788 0%,#2d6a4f 100%);
                              color:#ffffff;font-weight:800;font-size:16px;padding:18px 44px;
                              border-radius:14px;text-decoration:none;letter-spacing:0.3px;
                              box-shadow:0 4px 16px rgba(82,183,136,0.3);">
                      🌿 Activer mon compte
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FEATURES GRID -->
          <tr>
            <td style="padding:0 32px 12px;background:#0f2419;">
              <div style="background:linear-gradient(135deg,rgba(82,183,136,0.08),rgba(45,106,79,0.12));border:1px solid rgba(82,183,136,0.2);border-radius:18px;padding:24px;">

                <p style="color:#95d5b2;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 18px;text-align:center;">
                  Ce qui vous attend
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                  <tr>
                    <td width="48" style="vertical-align:top;"><div style="font-size:28px;line-height:1;">🧠</div></td>
                    <td style="vertical-align:top;padding-left:8px;">
                      <div style="color:#e8f5e9;font-size:14px;font-weight:700;margin-bottom:4px;">Diagnostic photo par IA</div>
                      <div style="color:#81c784;font-size:13px;line-height:1.5;">Photographiez votre pelouse, recevez un diagnostic complet et des recommandations sur-mesure.</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                  <tr>
                    <td width="48" style="vertical-align:top;"><div style="font-size:28px;line-height:1;">🌦️</div></td>
                    <td style="vertical-align:top;padding-left:8px;">
                      <div style="color:#e8f5e9;font-size:14px;font-weight:700;margin-bottom:4px;">Météo temps réel adaptée</div>
                      <div style="color:#81c784;font-size:13px;line-height:1.5;">Alertes anticipées pour tondre, arroser ou traiter au moment idéal selon votre climat local.</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                  <tr>
                    <td width="48" style="vertical-align:top;"><div style="font-size:28px;line-height:1;">📅</div></td>
                    <td style="vertical-align:top;padding-left:8px;">
                      <div style="color:#e8f5e9;font-size:14px;font-weight:700;margin-bottom:4px;">Calendrier d'entretien personnalisé</div>
                      <div style="color:#81c784;font-size:13px;line-height:1.5;">Tonte, arrosage, engrais, désherbage — chaque action programmée pour votre type de gazon.</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                  <tr>
                    <td width="48" style="vertical-align:top;"><div style="font-size:28px;line-height:1;">🏆</div></td>
                    <td style="vertical-align:top;padding-left:8px;">
                      <div style="color:#e8f5e9;font-size:14px;font-weight:700;margin-bottom:4px;">Classements et défis</div>
                      <div style="color:#81c784;font-size:13px;line-height:1.5;">Gagnez des GreenPoints, montez en ligue, comparez votre pelouse avec celle de vos voisins.</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="48" style="vertical-align:top;"><div style="font-size:28px;line-height:1;">💬</div></td>
                    <td style="vertical-align:top;padding-left:8px;">
                      <div style="color:#e8f5e9;font-size:14px;font-weight:700;margin-bottom:4px;">Bob, votre expert virtuel</div>
                      <div style="color:#81c784;font-size:13px;line-height:1.5;">Posez n'importe quelle question sur votre gazon, recevez une réponse précise immédiatement.</div>
                    </td>
                  </tr>
                </table>

              </div>
            </td>
          </tr>

          <!-- PRICING TEASER -->
          <tr>
            <td style="padding:28px 32px 12px;background:#0f2419;">
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:18px 20px;text-align:center;">
                <p style="color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 6px;">
                  ⭐ Offre de lancement
                </p>
                <p style="color:#fde68a;font-size:14px;line-height:1.5;margin:0;">
                  Découvrez l'app <strong>gratuitement</strong>. Passez Premium quand vous voulez —
                  <strong style="color:#fbbf24;">4,99 €/mois</strong> ou <strong style="color:#fbbf24;">39,99 €/an</strong>
                  (économisez 17%).
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA FINAL -->
          <tr>
            <td style="padding:28px 32px 36px;background:#0f2419;text-align:center;">
              <p style="color:#a5d6a7;font-size:14px;line-height:1.6;margin:0 0 20px;">
                Prêt à transformer votre pelouse ?
              </p>
              <a href="https://mongazon360.fr/login"
                 style="display:inline-block;background:linear-gradient(135deg,#52b788 0%,#2d6a4f 100%);
                        color:#ffffff;font-weight:800;font-size:15px;padding:16px 40px;
                        border-radius:14px;text-decoration:none;letter-spacing:0.3px;">
                🚀 Créer mon compte maintenant
              </a>
              <p style="color:#4a7c5c;font-size:11px;margin:14px 0 0;">
                Inscription en 30 secondes — Sans carte bancaire
              </p>
            </td>
          </tr>

          <!-- SIGNATURE -->
          <tr>
            <td style="padding:24px 32px 8px;background:#0f2419;border-top:1px solid rgba(82,183,136,0.15);text-align:center;">
              <p style="color:#52b788;font-size:13px;font-weight:600;margin:0 0 6px;">
                L'équipe Mongazon360<sup style="font-size:9px;">™</sup>
              </p>
              <p style="color:#4a7c5c;font-size:11px;font-style:italic;margin:0 0 10px;">
                Tant qu'il y a gazon, il y a match
              </p>
              <p style="color:#4a7c5c;font-size:11px;margin:0;">
                Une question ? Écrivez-nous à
                <a href="mailto:contact@mongazon360.fr" style="color:#52b788;text-decoration:none;font-weight:600;">contact@mongazon360.fr</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER LÉGAL -->
          <tr>
            <td style="padding:18px 32px 32px;background:#0d2b1a;text-align:center;border-radius:0 0 20px 20px;">
              <p style="color:#52b788;font-size:11px;margin:0 0 14px;">
                Suivez-nous :
                <a href="https://instagram.com/mongazon360" style="color:#f48fb1;text-decoration:none;margin:0 6px;">Instagram</a> ·
                <a href="https://tiktok.com/@mongazon360" style="color:#80deea;text-decoration:none;margin:0 6px;">TikTok</a> ·
                <a href="https://facebook.com/mongazon360" style="color:#90caf9;text-decoration:none;margin:0 6px;">Facebook</a> ·
                <a href="https://youtube.com/@mongazon360" style="color:#ef9a9a;text-decoration:none;margin:0 6px;">YouTube</a>
              </p>

              <p style="color:#4a7c5c;font-size:10px;line-height:1.6;margin:0 0 10px;">
                Vous recevez cet email car vous vous êtes pré-inscrit sur <a href="https://mongazon360.fr" style="color:#52b788;">mongazon360.fr</a>.<br>
                Pour vous désinscrire, répondez à cet email avec "STOP".
              </p>

              <p style="color:#4a7c5c;font-size:10px;margin:0 0 8px;">
                <a href="https://mongazon360.fr/mentions-legales" style="color:#52b788;text-decoration:none;">Mentions légales</a> ·
                <a href="https://mongazon360.fr/confidentialite" style="color:#52b788;text-decoration:none;">Confidentialité</a> ·
                <a href="https://mongazon360.fr/cgu" style="color:#52b788;text-decoration:none;">CGU</a> ·
                <a href="https://mongazon360.fr/cgv" style="color:#52b788;text-decoration:none;">CGV</a>
              </p>

              <p style="color:#3a5c44;font-size:9px;margin:0;line-height:1.6;">
                © ${year} Mongazon360<sup style="font-size:7px;">™</sup> — Marque déposée à l'EUIPO (Classes 9, 42, 44)<br>
                Édité par un auto-entrepreneur immatriculé en France · SIRET disponible dans les Mentions légales<br>
                Tous droits réservés
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

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

    // Pré-générer le HTML une seule fois (gain de perf sur gros envoi)
    const launchHtml = buildLaunchHtml();

    for (const inscrit of inscrits) {
      try {
        await resend.emails.send({
          from:    'Mongazon360 <bonjour@mongazon360.fr>',
          replyTo: 'contact@mongazon360.fr',
          to:      inscrit.email,
          subject: '🚀 Mongazon360™ est ouvert — Votre expert gazon intelligent est prêt',
          html:    launchHtml,
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

      // Petite pause pour éviter le rate limit Resend (~10 emails/seconde)
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
