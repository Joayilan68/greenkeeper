import { useNavigate } from "react-router-dom";
import { card, scroll, header, btn } from "../lib/styles";

export function MentionsLegales() {
  const navigate = useNavigate();
  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>📋 Mentions Légales</div>
      </div>
      <div style={scroll}>
        <div style={card()}>
          <h3 style={{ color:"#a5d6a7", marginBottom:12 }}>Éditeur</h3>
          <p style={{ fontSize:13, lineHeight:1.7, color:"#e8f5e9" }}>
            Application Mon Gazon 360 (MG360)<br/>
            Micro-entrepreneur — SIRET : [À compléter]<br/>
            Email : contact@mongazon360.fr<br/>
            Hébergeur : Vercel Inc., 340 Pine Street, San Francisco, CA 94104, USA
          </p>
        </div>
        <div style={card()}>
          <h3 style={{ color:"#a5d6a7", marginBottom:12 }}>Propriété intellectuelle</h3>
          <p style={{ fontSize:13, lineHeight:1.7, color:"#e8f5e9" }}>
            L'ensemble des contenus MG360 sont protégés par le droit de la propriété intellectuelle. 
            Toute reproduction sans autorisation est interdite.
          </p>
        </div>
        <div style={card()}>
          <h3 style={{ color:"#a5d6a7", marginBottom:12 }}>Limitation de responsabilité</h3>
          <p style={{ fontSize:13, lineHeight:1.7, color:"#e8f5e9" }}>
            Les recommandations MG360 ont un caractère informatif. Elles ne constituent pas un conseil 
            professionnel garanti. MG360 ne saurait être tenu responsable des résultats obtenus.
          </p>
        </div>
        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}

export function Confidentialite() {
  const navigate = useNavigate();
  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🔒 Politique de Confidentialité</div>
        <div style={{ fontSize:11, color:"#81c784", marginTop:4 }}>Conformité RGPD</div>
      </div>
      <div style={scroll}>
        {[
          { title:"Responsable du traitement", content:"[Votre prénom et nom], micro-entrepreneur. Email : contact@mongazon360.fr" },
          { title:"Données collectées", content:"Email et nom (Clerk) · Localisation GPS (avec votre consentement) · Historique d'entretien · Profil pelouse · Statut d'abonnement (Stripe)" },
          { title:"Finalités", content:"Fourniture du service MG360 · Gestion de votre abonnement · Amélioration du service (données anonymisées) · Notifications (avec consentement)" },
          { title:"Durée de conservation", content:"Données de compte : durée de l'abonnement + 3 ans · Localisation : stockée localement sur votre appareil uniquement · Photos diagnostic : supprimées sous 24h" },
          { title:"Vos droits", content:"Accès · Rectification · Effacement · Portabilité · Opposition · Retrait du consentement. Contact : contact@mongazon360.fr — Réponse sous 30 jours. Vous pouvez également saisir la CNIL : cnil.fr" },
          { title:"Sous-traitants", content:"Vercel (hébergement, USA) · Clerk (authentification, USA) · Stripe (paiement, USA) · Groq (IA, USA) · Open-Meteo (météo, Suisse)" },
        ].map(({ title, content }) => (
          <div key={title} style={card()}>
            <h3 style={{ color:"#a5d6a7", marginBottom:8, fontSize:14 }}>{title}</h3>
            <p style={{ fontSize:13, lineHeight:1.7, color:"#e8f5e9" }}>{content}</p>
          </div>
        ))}
        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}

export function CGU() {
  const navigate = useNavigate();
  const articles = [
    { title:"Article 1 — Objet", content:"Les présentes CGU régissent l'utilisation de l'application Mon Gazon 360 (mongazon360.fr). En accédant à MG360, vous acceptez sans réserve les présentes conditions." },
    { title:"Article 2 — Accès au service", content:"MG360 est accessible à toute personne physique majeure (18 ans+). L'inscription est obligatoire. L'utilisateur s'engage à fournir des informations exactes." },
    { title:"Article 3 — Description du service", content:"Accès gratuit : score basique, plan mensuel, historique limité (5 entrées). Accès Premium (4,99€/mois ou 39,99€/an) : score complet, IA personnalisée, météo temps réel, historique illimité, diagnostic photo." },
    { title:"Article 4 — Obligations utilisateur", content:"L'utilisateur s'engage à ne pas utiliser MG360 à des fins illicites, à ne pas tenter d'accéder à des zones non autorisées, et à maintenir la confidentialité de ses identifiants." },
    { title:"Article 5 — Propriété intellectuelle", content:"L'algorithme de score, les recommandations IA et l'ensemble des contenus MG360 sont protégés par le droit de la propriété intellectuelle." },
    { title:"Article 6 — Limitation de responsabilité", content:"MG360 ne garantit pas l'exactitude absolue des recommandations ni la disponibilité continue du service. Sa responsabilité ne peut être engagée pour des dommages indirects." },
    { title:"Article 7 — Droit applicable", content:"Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront compétents." },
  ];
  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>📄 Conditions Générales d'Utilisation</div>
      </div>
      <div style={scroll}>
        {articles.map(({ title, content }) => (
          <div key={title} style={card()}>
            <h3 style={{ color:"#a5d6a7", marginBottom:8, fontSize:14 }}>{title}</h3>
            <p style={{ fontSize:13, lineHeight:1.7, color:"#e8f5e9" }}>{content}</p>
          </div>
        ))}
        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}

export function CGV() {
  const navigate = useNavigate();
  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🛒 Conditions Générales de Vente</div>
      </div>
      <div style={scroll}>
        {[
          { title:"Prix et abonnements", content:"Premium Mensuel : 4,99€/mois TTC — sans engagement, résiliable à tout moment.\nPremium Annuel : 39,99€/an TTC — économie de 20%.\nL'auto-entrepreneur n'est pas assujetti à la TVA (art. 293B CGI)." },
          { title:"Paiement", content:"Paiement sécurisé via Stripe (norme PCI-DSS). L'abonnement est activé immédiatement après validation. Renouvellement automatique sauf résiliation." },
          { title:"Droit de rétractation", content:"Conformément à l'article L.221-18 du Code de la consommation, vous disposez de 14 jours pour exercer votre droit de rétractation. Contact : contact@mongazon360.fr — mention « Rétractation »." },
          { title:"Résiliation", content:"Mensuel : résiliable à tout moment depuis Paramètres > Mon abonnement. Annuel : résiliable à tout moment, sans remboursement prorata sauf vice du service. Aucun frais de résiliation." },
          { title:"Médiation", content:"En cas de litige non résolu, vous pouvez recourir gratuitement à un médiateur de la consommation (médiateur du numérique : mediateur.net)." },
        ].map(({ title, content }) => (
          <div key={title} style={card()}>
            <h3 style={{ color:"#a5d6a7", marginBottom:8, fontSize:14 }}>{title}</h3>
            <p style={{ fontSize:13, lineHeight:1.7, color:"#e8f5e9", whiteSpace:"pre-line" }}>{content}</p>
          </div>
        ))}
        <button onClick={() => navigate(-1)} style={{ ...btn.ghost, marginTop:8 }}>← Retour</button>
      </div>
    </div>
  );
}
