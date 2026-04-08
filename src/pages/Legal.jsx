import { useNavigate } from "react-router-dom";
import { card, scroll, btn } from "../lib/styles";

// ── Composants communs ────────────────────────────────────────────────────────
function PageHeader({ emoji, title, subtitle }) {
  return (
    <div style={{ padding:"48px 20px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>{emoji} {title}</div>
          {subtitle && <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={card()}>
      <div style={{ fontSize:13, fontWeight:700, color:"#66BB6A", marginBottom:10, letterSpacing:0.5 }}>{title}</div>
      <div style={{ fontSize:12, lineHeight:1.8, color:"#e8f5e9" }}>{children}</div>
    </div>
  );
}

// ── MENTIONS LÉGALES ──────────────────────────────────────────────────────────
export function MentionsLegales() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader emoji="📋" title="Mentions Légales" subtitle="Dernière mise à jour : Avril 2026" />
      <div style={scroll}>

        <Section title="Éditeur de l'application">
          L'application mobile et web progressive Mongazon360 est éditée par :<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Krebs Ayfer</strong> — Directrice de la publication<br/>
          Forme juridique : Micro-entreprise<br/>
          SIRET : 442 546 594<br/>
          55 rue Pierre Pflimlin, 68510 Sierentz, France<br/>
          Email : contact@mongazon360.fr<br/>
          Site : mongazon360.fr<br/><br/>
          Auto-entrepreneur non assujetti à la TVA (article 293B du CGI).
        </Section>

        <Section title="Hébergeur">
          Vercel Inc.<br/>
          340 Pine Street, Suite 701<br/>
          San Francisco, California 94104, USA<br/>
          vercel.com
        </Section>

        <Section title="Propriété intellectuelle">
          L'ensemble des contenus de l'application Mongazon360 (textes, algorithmes, score de santé, recommandations IA, design, mascotte, nom de l'assistant Ilan) constituent la propriété exclusive de Krebs Ayfer, protégés par le Code de la propriété intellectuelle. Toute reproduction, distribution ou exploitation non autorisée est strictement interdite.
        </Section>

        <Section title="Limitation de responsabilité">
          Les recommandations de l'application Mongazon360 sont fournies à titre purement informatif et ne constituent pas un conseil agronomique professionnel garanti. L'éditeur ne saurait être tenu responsable des décisions prises par l'utilisateur sur la base de ces informations ni des résultats obtenus.
        </Section>

        <Section title="Disponibilité du service">
          L'éditeur s'efforce d'assurer la disponibilité continue du service mais ne saurait être tenu responsable des interruptions liées à des causes techniques ou des événements indépendants de sa volonté.
        </Section>

        <Section title="Droit applicable">
          Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français du ressort du siège social de l'éditeur seront compétents.
        </Section>

        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}

// ── POLITIQUE DE CONFIDENTIALITÉ ──────────────────────────────────────────────
export function Confidentialite() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader emoji="🔒" title="Politique de Confidentialité" subtitle="RGPD — Dernière mise à jour : Avril 2026" />
      <div style={scroll}>

        <Section title="Responsable du traitement">
          Krebs Ayfer, micro-entrepreneur<br/>
          55 rue Pierre Pflimlin, 68510 Sierentz<br/>
          contact@mongazon360.fr<br/><br/>
          En tant qu'auto-entrepreneur, Krebs Ayfer assume également le rôle de Délégué à la Protection des Données (DPO).
        </Section>

        <Section title="Données collectées">
          <strong style={{ color:"#a5d6a7" }}>Identification :</strong> nom, prénom, email (via Clerk) · identifiant unique utilisateur<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Localisation :</strong> coordonnées GPS (avec votre consentement explicite) · ville déduite via OpenStreetMap (service anonyme) · stockées localement sur votre appareil<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Utilisation :</strong> historique des interventions · profil de pelouse (type, surface, sol, exposition) · score de santé et évolution<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Paiement :</strong> géré exclusivement par Stripe Inc. (PCI-DSS) — Mongazon360 ne stocke aucune donnée bancaire<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Photos diagnostic (Premium) :</strong> traitées par IA puis supprimées des serveurs sous 24 heures
        </Section>

        <Section title="Finalités et bases légales">
          • Fourniture du service (exécution du contrat — art. 6.1.b RGPD){"\n"}
          • Localisation, notifications, marketing (consentement — art. 6.1.a RGPD){"\n"}
          • Amélioration du service anonymisée (intérêt légitime — art. 6.1.f RGPD){"\n"}
          • Obligations comptables (obligation légale — art. 6.1.c RGPD)
        </Section>

        <Section title="Durée de conservation">
          • Données de compte : durée de l'abonnement + 3 ans après résiliation{"\n"}
          • Données de localisation : stockées localement sur votre appareil uniquement{"\n"}
          • Photos diagnostic : supprimées des serveurs sous 24 heures{"\n"}
          • Données de paiement : selon la politique de Stripe (5 ans)
        </Section>

        <Section title="Vos droits (RGPD)">
          Conformément au Règlement UE 2016/679 :{"\n\n"}
          • <strong style={{ color:"#a5d6a7" }}>Accès</strong> — obtenir une copie de vos données{"\n"}
          • <strong style={{ color:"#a5d6a7" }}>Rectification</strong> — corriger des données inexactes{"\n"}
          • <strong style={{ color:"#a5d6a7" }}>Effacement</strong> — supprimer votre compte et toutes vos données{"\n"}
          • <strong style={{ color:"#a5d6a7" }}>Portabilité</strong> — recevoir vos données dans un format lisible{"\n"}
          • <strong style={{ color:"#a5d6a7" }}>Opposition</strong> — vous opposer à certains traitements{"\n"}
          • <strong style={{ color:"#a5d6a7" }}>Retrait du consentement</strong> — à tout moment, sans effet rétroactif{"\n\n"}
          Contact : contact@mongazon360.fr — Réponse sous 30 jours.{"\n"}
          Vous pouvez également saisir la CNIL : cnil.fr — 3 place de Fontenoy, 75007 Paris.
        </Section>

        <Section title="Sous-traitants et transferts hors UE">
          • Vercel Inc. (USA) — hébergement (CCT UE-USA){"\n"}
          • Clerk Inc. (USA) — authentification (CCT){"\n"}
          • Stripe Inc. (USA) — paiements (PCI-DSS / CCT){"\n"}
          • Groq Inc. (USA) — recommandations IA / assistant Ilan (CCT){"\n"}
          • Cloudinary (USA) — traitement photos diagnostic (CCT){"\n"}
          • Open-Meteo (Suisse) — données météo (adéquation RGPD){"\n"}
          • Resend Inc. (USA) — emails transactionnels (CCT){"\n\n"}
          CCT = Clauses Contractuelles Types approuvées par la Commission européenne.
        </Section>

        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}

// ── CGU ───────────────────────────────────────────────────────────────────────
export function CGU() {
  const navigate = useNavigate();
  const articles = [
    { title:"Article 1 — Objet", content:"Les présentes CGU régissent l'accès et l'utilisation de l'application Mongazon360, accessible à mongazon360.fr et via l'application mobile PWA. En créant un compte, l'utilisateur accepte sans réserve les présentes conditions." },
    { title:"Article 2 — Accès au service", content:"L'Application est accessible à toute personne physique majeure (18 ans et plus) disposant d'un accès Internet. L'inscription est obligatoire. L'utilisateur s'engage à fournir des informations exactes, complètes et à jour." },
    { title:"Article 3 — Description des services", content:"Accès gratuit : score de santé du gazon, plan d'entretien mensuel, journalisation des actions, classement gamifié.\n\nAccès Premium (4,99€/mois ou 39,99€/an) : score détaillé, recommandations IA personnalisées (assistant Ilan), météo temps réel, historique illimité, notifications intelligentes, diagnostic photo IA.\n\nLes recommandations sont fournies à titre informatif et ne constituent pas un conseil agronomique professionnel garanti." },
    { title:"Article 4 — Obligations de l'utilisateur", content:"L'utilisateur s'engage à :\n• Utiliser l'Application conformément à sa destination et aux lois en vigueur\n• Ne pas tenter d'accéder à des zones non autorisées ou de contourner les mesures de sécurité\n• Ne pas reproduire, extraire ou revendre le contenu sans autorisation écrite\n• Maintenir la confidentialité de ses identifiants et ne pas partager son compte\n• Ne pas introduire de virus ou code malveillant" },
    { title:"Article 5 — Intelligence artificielle", content:"L'Application intègre un système d'IA (assistant Ilan — modèle Llama via Groq). Conformément au Règlement européen sur l'IA (IA Act — Règlement UE 2024/1689), l'utilisateur est informé que les recommandations sont générées automatiquement à titre indicatif et qu'il conserve en toute circonstance sa pleine autonomie de décision." },
    { title:"Article 6 — Propriété intellectuelle", content:"L'ensemble des éléments de l'Application (algorithmes, score de santé, design, mascotte, nom Ilan, contenu éditorial) sont protégés par le Code de la propriété intellectuelle. Toute reproduction est interdite sans autorisation écrite préalable." },
    { title:"Article 7 — Limitation de responsabilité", content:"L'éditeur ne garantit pas l'exactitude absolue des recommandations IA ni la disponibilité continue du service. La responsabilité de l'éditeur est limitée au montant des sommes payées par l'utilisateur au cours des 12 derniers mois." },
    { title:"Article 8 — Modification des CGU", content:"L'éditeur peut modifier les présentes CGU à tout moment, avec notification 15 jours avant entrée en vigueur. La poursuite de l'utilisation vaut acceptation des nouvelles CGU." },
    { title:"Article 9 — Droit applicable", content:"Les présentes CGU sont soumises au droit français. En cas de litige non résolu amiablement, les tribunaux français seront compétents." },
  ];
  return (
    <div>
      <PageHeader emoji="📄" title="Conditions Générales d'Utilisation" subtitle="Dernière mise à jour : Avril 2026" />
      <div style={scroll}>
        {articles.map(({ title, content }) => (
          <div key={title} style={card()}>
            <div style={{ fontSize:13, fontWeight:700, color:"#66BB6A", marginBottom:10 }}>{title}</div>
            <p style={{ fontSize:12, lineHeight:1.8, color:"#e8f5e9", whiteSpace:"pre-line", margin:0 }}>{content}</p>
          </div>
        ))}
        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}

// ── CGV ───────────────────────────────────────────────────────────────────────
export function CGV() {
  const navigate = useNavigate();
  const articles = [
    { title:"Article 1 — Objet", content:"Les présentes CGV s'appliquent à toute souscription d'un abonnement Premium Mongazon360." },
    { title:"Article 2 — Formules et prix", content:"Premium Mensuel : 4,99 € TTC/mois — sans engagement, résiliable à tout moment.\nPremium Annuel : 39,99 € TTC/an — économie de 33%, facturation annuelle unique.\n\nPrix TTC. Auto-entrepreneur non assujetti à la TVA (art. 293B CGI). Toute modification tarifaire s'applique uniquement aux nouveaux abonnements et renouvellements ultérieurs, après notification préalable." },
    { title:"Article 3 — Commande et paiement", content:"• Paiement sécurisé via Stripe Inc. (certifié PCI-DSS niveau 1)\n• Abonnement activé immédiatement après validation du paiement\n• Renouvellement automatique sauf résiliation avant l'échéance\n• Email de confirmation envoyé après chaque paiement" },
    { title:"Article 4 — Droit de rétractation", content:"Conformément à l'article L.221-18 du Code de la consommation, vous disposez de 14 jours pour exercer votre droit de rétractation à compter de la souscription.\n\nException : si vous avez expressément demandé l'exécution immédiate du service et renoncé à votre droit de rétractation lors de la souscription (art. L.221-28 12°), ce droit ne peut être exercé.\n\nPour exercer ce droit : contact@mongazon360.fr, objet « Rétractation » avec votre numéro de commande. Remboursement sous 14 jours." },
    { title:"Article 5 — Résiliation", content:"• Mensuel : résiliable depuis Paramètres > Mon abonnement > Résilier\n• Annuel : résiliable à tout moment — aucun remboursement pour la période restante, sauf vice avéré\n• Effet à la fin de la période en cours — Aucun frais de résiliation" },
    { title:"Article 6 — Médiation de la consommation", content:"En cas de litige non résolu amiablement dans un délai de 2 mois, vous pouvez recourir gratuitement à un médiateur de la consommation.\n\nMédiateur désigné : Médié — Le médiateur du numérique (mediateur.net)" },
    { title:"Article 7 — Droit applicable", content:"Les présentes CGV sont soumises au droit français." },
  ];
  return (
    <div>
      <PageHeader emoji="🛒" title="Conditions Générales de Vente" subtitle="Dernière mise à jour : Avril 2026" />
      <div style={scroll}>
        {articles.map(({ title, content }) => (
          <div key={title} style={card()}>
            <div style={{ fontSize:13, fontWeight:700, color:"#66BB6A", marginBottom:10 }}>{title}</div>
            <p style={{ fontSize:12, lineHeight:1.8, color:"#e8f5e9", whiteSpace:"pre-line", margin:0 }}>{content}</p>
          </div>
        ))}
        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}

// ── POLITIQUE DE COOKIES ──────────────────────────────────────────────────────
export function Cookies() {
  const navigate = useNavigate();
  const cookies = [
    { name:"clerk_session",  type:"Essentiel",   duree:"Session",   finalite:"Maintien de la connexion utilisateur" },
    { name:"mg360_location", type:"Fonctionnel",  duree:"Permanent", finalite:"Position géographique (localStorage)" },
    { name:"mg360_profile",  type:"Fonctionnel",  duree:"Permanent", finalite:"Profil pelouse et préférences (localStorage)" },
    { name:"mg360_history",  type:"Fonctionnel",  duree:"Permanent", finalite:"Historique des interventions (localStorage)" },
    { name:"mg360_consents", type:"Essentiel",    duree:"Permanent", finalite:"Mémorisation des consentements RGPD" },
    { name:"stripe_session", type:"Essentiel",    duree:"Session",   finalite:"Sécurisation du paiement (Stripe)" },
  ];
  return (
    <div>
      <PageHeader emoji="🍪" title="Politique de cookies" subtitle="Dernière mise à jour : Avril 2026" />
      <div style={scroll}>

        <div style={card()}>
          <div style={{ fontSize:13, fontWeight:700, color:"#66BB6A", marginBottom:10 }}>Cookies utilisés</div>
          {cookies.map((c, i) => (
            <div key={c.name} style={{ padding:"10px 0", borderBottom: i < cookies.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#e8f5e9", fontFamily:"monospace" }}>{c.name}</span>
                <span style={{ fontSize:10, background: c.type === "Essentiel" ? "rgba(46,125,50,0.3)" : "rgba(102,187,106,0.15)", color: c.type === "Essentiel" ? "#66BB6A" : "#A5D6A7", borderRadius:20, padding:"2px 8px" }}>{c.type}</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784" }}>{c.finalite} — {c.duree}</div>
            </div>
          ))}
        </div>

        <div style={card()}>
          <div style={{ fontSize:13, fontWeight:700, color:"#66BB6A", marginBottom:10 }}>Nos engagements</div>
          <p style={{ fontSize:12, lineHeight:1.8, color:"#e8f5e9", margin:0 }}>
            Mongazon360 n'utilise aucun cookie publicitaire ni traceur tiers à des fins de ciblage commercial. Tous les cookies fonctionnels sont stockés localement sur votre appareil (localStorage).
          </p>
        </div>

        <div style={card()}>
          <div style={{ fontSize:13, fontWeight:700, color:"#66BB6A", marginBottom:10 }}>Gestion de vos préférences</div>
          <p style={{ fontSize:12, lineHeight:1.8, color:"#e8f5e9", margin:0 }}>
            Vous pouvez modifier vos préférences à tout moment dans Paramètres &gt; Mes données &gt; Consentements.
          </p>
        </div>

        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}
