import { useNavigate } from "react-router-dom";
import { card, scroll, btn } from "../lib/styles";

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENTS JURIDIQUES MONGAZON360™
// ════════════════════════════════════════════════════════════════════════════
// Source : documents validés par Cabinet Numetik Avocats (juin 2026)
//   - CGU__CGV_-_V27_05_26.docx     → CGU + CGV (article unifié)
//   - Mentions_légales.docx          → MentionsLegales
//   - Politique_de_confidentialité_V03_06_26.docx → Confidentialite
//
// Décisions appliquées :
//   - AGMG → Mongazon360 (correction erreur avocat)
//   - Téléphone perso retiré (contact email uniquement)
//   - Mentions Apple/Google Play conservées par anticipation
//   - "[XXX]" → "💳 S'abonner — [montant][période]" (libellé réel app)
//   - Suppression mentions "[à confirmer avec le client]"
//   - Page Cookies : version simple basée sur fonctionnement réel app
// ════════════════════════════════════════════════════════════════════════════

// ── Composants communs ────────────────────────────────────────────────────────
function PageHeader({ emoji, title, subtitle }) {
  return (
    <div style={{ padding:"48px 20px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <img src="/mg360-mascot-transparent.png" alt="Mongazon360" style={{ width:40, height:40, objectFit:"contain" }} />
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

function SubSection({ title, children }) {
  return (
    <div style={{ marginTop:14, marginBottom:6 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"#a5d6a7", marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12, lineHeight:1.8, color:"#e8f5e9" }}>{children}</div>
    </div>
  );
}

function BackToSettings() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate("/parametres")} style={{ ...btn.ghost, marginTop:16, marginBottom:24, padding:"10px", fontSize:13 }}>
      ← Retour aux paramètres
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MENTIONS LÉGALES
// ════════════════════════════════════════════════════════════════════════════
export function MentionsLegales() {
  return (
    <div>
      <PageHeader emoji="📋" title="Mentions Légales" subtitle="Mise à jour : juin 2026" />
      <div style={scroll}>

        <Section title="Identité de l'éditeur du site internet">
          L'éditeur du site internet est : <strong style={{ color:"#a5d6a7" }}>Krebs Ayfer</strong> exerçant en entreprise individuelle.<br/><br/>
          Nom de l'entreprise : <strong>Mongazon360</strong><br/>
          Numéro d'immatriculation professionnelle (SIRET) : 442 546 594<br/>
          Adresse officielle de l'entreprise : 55 rue Pierre Pflimlin, 68510 Sierentz, France<br/>
          Email de contact : contact@mongazon360.fr<br/><br/>
          L'éditeur du site n'est pas assujetti à la TVA (article 293B du Code général des impôts).<br/><br/>
          Mongazon360<sup style={{ fontSize:8 }}>™</sup> est une marque déposée à l'EUIPO (European Union Intellectual Property Office) le 30 mai 2026 — Classes 9, 42, 44 — protection sur 27 pays de l'Union européenne.
        </Section>

        <Section title="Activités exercées">
          L'éditeur du site internet exerce les activités suivantes : développement de l'application web et mobile progressive Mongazon360<sup style={{ fontSize:7 }}>™</sup>.<br/><br/>
          Mongazon360 permet aux utilisateurs de suivre et d'optimiser l'entretien de leur gazon (ci-après l'« Application »). L'Application intègre un assistant conversationnel alimenté par intelligence artificielle et un système de diagnostic photo par IA.<br/><br/>
          L'Application s'adresse à toute personne physique agissant à titre non professionnel, qu'elle dispose d'un compte gratuit ou d'un compte payant par abonnement.
        </Section>

        <Section title="Directeur de la publication">
          Le Directeur de la publication est : <strong style={{ color:"#a5d6a7" }}>Krebs Ayfer</strong>
        </Section>

        <Section title="Hébergement du site internet">
          Le site internet est hébergé par :<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Vercel Inc.</strong><br/>
          340 Pine Street, Suite 701<br/>
          San Francisco, California 94104, USA<br/>
          Site internet : vercel.com
        </Section>

        <Section title="Propriété intellectuelle">
          Le site internet est susceptible de reproduire des œuvres de propriété intellectuelle. Ces œuvres peuvent appartenir à l'éditeur du site ou à des tiers. Dans ce dernier cas, les œuvres sont reproduites par l'éditeur avec l'autorisation de ces tiers.<br/><br/>
          Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des œuvres représentées sur le site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de l'éditeur du site internet.<br/><br/>
          Toute exploitation non autorisée des œuvres ou de l'un quelconque des éléments que le site contient pourra être considérée comme constitutive d'une contrefaçon et poursuivie conformément aux dispositions des articles L.335-2 et suivants du Code de Propriété Intellectuelle.
        </Section>

        <Section title="Obligations des utilisateurs">
          Les utilisateurs s'engagent à utiliser le présent site internet dans les conditions suivantes :<br/><br/>
          • ne pas utiliser le site aux fins d'entraver ou altérer son fonctionnement, notamment en l'encombrant, volontairement ou involontairement, par le transfert intempestif de contenus, en dehors des cas d'utilisation prévus ;<br/>
          • ne pas extraire, copier, dupliquer, des éléments et graphismes du site internet, sur lesquels l'éditeur dispose des droits de propriété intellectuelle ;<br/>
          • ne pas introduire de fichiers/programmes malveillants, ou contenant des virus informatiques ;<br/>
          • ne pas stocker, transmettre du contenu non autorisé, qui serait illégal ou qui pourrait être constitutif d'incitation à la réalisation de crimes et délits, de diffamations et injures, d'atteinte à la vie privée, ou encore d'actes mettant en péril des mineurs ;<br/>
          • ne pas transmettre de contenu qui violerait le droit à l'image, tout droit de propriété intellectuelle tout autre droit appartenant à autrui.
        </Section>

        <Section title="Responsabilité de l'éditeur">
          L'utilisateur est seul responsable des choix qu'il fait. Ainsi, la responsabilité de l'éditeur ne saurait être engagée en raison de l'inadaptation des services du site internet aux besoins et informations exprimés par l'utilisateur.<br/><br/>
          L'éditeur n'est pas non plus responsable des conséquences dommageables liées au réseau de communication et des défaillances d'accès à Internet et de sécurité informatique de l'utilisateur.
        </Section>

        <Section title="Protection des données personnelles">
          L'éditeur est susceptible de traiter des données personnelles dans le cadre de l'exploitation de son site internet.<br/><br/>
          Dans ce cadre, il s'engage à respecter la Loi n°78-17 du 6 janvier 1978 (dite « Loi informatique et libertés » ou « LIL ») et le Règlement Général sur la protection des Données Personnelles (« RGPD ») n°2016/679.<br/><br/>
          Pour plus de détails, consultez notre Politique de confidentialité.
        </Section>

        <Section title="Démarche téléphonique">
          Le consommateur qui ne souhaite pas faire l'objet de prospection commerciale par voie téléphonique peut gratuitement s'inscrire sur une liste d'opposition au démarchage téléphonique :<br/><br/>
          <a href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155931" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7", textDecoration:"underline" }}>
            Article L223-1 du Code de la consommation
          </a>
        </Section>

        <BackToSettings />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// POLITIQUE DE CONFIDENTIALITÉ (RGPD)
// ════════════════════════════════════════════════════════════════════════════
export function Confidentialite() {
  return (
    <div>
      <PageHeader emoji="🔒" title="Politique de confidentialité" subtitle="Mise à jour : 26 mai 2026" />
      <div style={scroll}>

        <Section title="1. Préambule">
          Mongazon360<sup style={{ fontSize:8 }}>™</sup> est une application web (PWA), accessible sur mobile et sur navigateur, qui permet aux utilisateurs de suivre et d'optimiser l'entretien de leur gazon. L'application intègre un assistant conversationnel alimenté par intelligence artificielle et un système de diagnostic photo par IA.<br/><br/>
          Dans le cadre de l'exploitation de l'application, Mongazon360 traite des données personnelles en qualité de responsable de traitement.<br/><br/>
          Cette politique de protection des données personnelles est rédigée conformément à la loi n°78-17 du 6 janvier 1978 (dite « Loi informatique et libertés » ou « LIL ») et au Règlement Général sur la protection des Données Personnelles (« RGPD ») n°2016/679.
        </Section>

        <Section title="2. À qui s'adresse cette politique ?">
          Cette politique s'adresse aux Utilisateurs de l'application : toute personne physique ayant créé un compte sur l'application Mongazon360 (gratuit ou payant) et bénéficiant de droits sur l'application conformément aux Conditions Générales d'Utilisation ; ainsi qu'aux personnes pré-inscrites via le formulaire de liste d'attente.
        </Section>

        <Section title="3. Fonctionnalités d'intelligence artificielle">
          L'application intègre des fonctionnalités reposant sur des technologies d'intelligence artificielle, notamment :<br/><br/>
          • un assistant conversationnel (« Bob ») destiné à répondre aux questions des utilisateurs sur l'entretien du gazon, en s'appuyant sur une base de connaissances intégrée ;<br/>
          • un système de diagnostic photo permettant d'analyser une photo du gazon prise par l'utilisateur pour identifier les problèmes éventuels (maladies, carences, mauvaises herbes) et proposer des actions correctives ;<br/>
          • un système de recommandations personnalisées adapté au profil gazon de l'utilisateur (type de gazon, sol, exposition, historique d'interventions).<br/><br/>
          Ces fonctionnalités fournissent des suggestions et recommandations destinées à faciliter l'entretien du gazon par l'utilisateur. Elles ne se substituent pas à l'appréciation de l'utilisateur et n'emportent aucune décision automatique à l'égard des personnes concernées.<br/><br/>
          <strong style={{ color:"#fbbf24" }}>Information relative à l'assistant conversationnel :</strong> lorsque vous utilisez l'assistant conversationnel de l'application, vous êtes informé que vous échangez avec un système d'intelligence artificielle et non avec une personne physique.
        </Section>

        <Section title="4. Responsable du traitement">
          Le responsable du traitement est, au sens du RGPD, la personne qui détermine les moyens et les finalités du traitement.<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Mongazon360<sup style={{ fontSize:8 }}>™</sup></strong> est le responsable du traitement.<br/>
          Siège : 55 rue Pierre Pflimlin, 68510 Sierentz, France<br/>
          SIRET : 442 546 594<br/>
          Email de contact : contact@mongazon360.fr
        </Section>

        <Section title="5. Traitements de données personnelles réalisés">
          Mongazon360 réalise les traitements de données personnelles suivants dans le cadre de l'exploitation de l'application.

          <SubSection title="5.1 Finalités et bases légales des traitements">
            • <strong>Création et gestion du compte utilisateur</strong> — Base légale : exécution du contrat (CGU/CGV)<br/>
            • <strong>Souscription et gestion de l'abonnement Premium</strong> — Base légale : exécution du contrat<br/>
            • <strong>Fourniture des fonctionnalités d'entretien du gazon</strong> (journal, GreenScore, recommandations) — Base légale : exécution du contrat<br/>
            • <strong>Envoi d'emails transactionnels</strong> (confirmation, rappels, alertes météo) — Base légale : exécution du contrat<br/>
            • <strong>Envoi d'emails de prospection commerciale</strong> — Base légale : consentement (case optionnelle à l'inscription)<br/>
            • <strong>Notifications push</strong> — Base légale : consentement<br/>
            • <strong>Géolocalisation</strong> (météo locale) — Base légale : consentement<br/>
            • <strong>Partage de données anonymisées avec partenaires jardinage</strong> — Base légale : consentement<br/>
            • <strong>Gestion des demandes RGPD</strong> (accès, rectification, suppression) — Base légale : obligation légale<br/>
            • <strong>Lutte contre la fraude et sécurité</strong> — Base légale : intérêt légitime
          </SubSection>

          <SubSection title="5.2 Données personnelles collectées">
            <strong>Données d'identification :</strong> nom, prénom, adresse email, mot de passe chiffré (via Clerk).<br/><br/>
            <strong>Données de profil gazon :</strong> type de gazon, surface, type de sol, exposition, ville, objectifs d'entretien, budget.<br/><br/>
            <strong>Données d'activité :</strong> historique des interventions, GreenPoints, streak, classement, photos de diagnostic.<br/><br/>
            <strong>Données techniques :</strong> identifiants techniques, journaux de connexion, adresse IP, type de navigateur, langue.<br/><br/>
            <strong>Données de paiement :</strong> en cas d'abonnement Premium, les données de paiement sont traitées directement par Stripe (web) ou Apple/Google Play (stores) — Mongazon360 n'a pas accès aux numéros de carte bancaire.<br/><br/>
            <strong>Données de géolocalisation :</strong> coordonnées GPS approximatives (avec votre consentement uniquement).
          </SubSection>

          <SubSection title="5.3 Durées de conservation des données">
            • <strong>Compte actif :</strong> tant que le compte est actif<br/>
            • <strong>Compte inactif :</strong> 24 mois après dernière connexion, puis suppression après notification par email et 45 jours sans réponse<br/>
            • <strong>Données de facturation :</strong> 10 ans (obligation comptable)<br/>
            • <strong>Données de prospection commerciale :</strong> 3 ans à compter du dernier contact<br/>
            • <strong>Logs techniques :</strong> 1 an
          </SubSection>

          <SubSection title="5.4 Origine et modalités de collecte des données">
            Les données personnelles des Utilisateurs sont collectées directement auprès d'eux par Mongazon360, dans le cadre de la création de leur compte, de l'utilisation de l'application et de la souscription d'un abonnement. Certaines données sont collectées indirectement via le compte Google de l'utilisateur.<br/><br/>
            <strong>Caractère obligatoire des données :</strong> les données collectées présentent un caractère obligatoire pour réaliser les finalités de traitement, à l'exception de la géolocalisation GPS qui est optionnelle.
          </SubSection>
        </Section>

        <Section title="6. Destinataires de vos données">
          Les données personnelles sont réservées à l'usage de Mongazon360. Elles peuvent être transmises aux catégories de destinataires suivantes, dans le cadre des finalités décrites à l'article 5.

          <SubSection title="6.1 Sous-traitants">
            Mongazon360 fait appel aux prestataires techniques suivants, qui traitent des données personnelles pour son compte et sur ses instructions, en qualité de sous-traitants au sens de l'article 28 du RGPD :<br/><br/>
            • <strong>Supabase Inc.</strong> (base de données — UE Frankfurt)<br/>
            • <strong>Clerk Inc.</strong> (authentification)<br/>
            • <strong>Stripe Inc.</strong> (traitement des paiements)<br/>
            • <strong>Groq Inc.</strong> (inférence IA pour l'assistant conversationnel)<br/>
            • <strong>Cloudinary Ltd</strong> (hébergement et traitement des photos de diagnostic)<br/>
            • <strong>Plus Five Five Inc. (Resend)</strong> (envoi des emails transactionnels)<br/>
            • <strong>Vercel Inc.</strong> (hébergement frontend)<br/>
            • <strong>Open-Meteo</strong> (données météorologiques)<br/>
            • <strong>Google LLC</strong> (authentification Google, support email)
          </SubSection>

          <SubSection title="6.2 Tiers responsables de traitement">
            <strong style={{ color:"#a5d6a7" }}>Amazon (Programme Partenaires)</strong> : l'application propose des recommandations de produits d'entretien avec des liens d'affiliation vers Amazon dans un format spécifique contenant un identifiant propre à Mongazon360 (ci-après les « Liens d'Affiliation »). Lorsque vous cliquez sur un lien d'affiliation, vous quittez l'application et êtes redirigé vers le site Amazon.fr.<br/><br/>
            Amazon est alors susceptible de déposer des cookies ou d'utiliser des technologies similaires sur votre terminal afin d'attribuer les achats réalisés dans le cadre du Programme Partenaires Amazon. Ce traitement est effectué par Amazon en qualité de responsable de traitement indépendant, conformément à sa propre politique de confidentialité.<br/><br/>
            Mongazon360 ne reçoit d'Amazon aucune donnée personnelle relative aux achats effectués par l'utilisateur sur le site Amazon.fr. Les seules données communiquées par Amazon à Mongazon360 sont des rapports de commissions agrégés (montants, nombre de clics, taux de conversion), qui ne constituent pas des données personnelles.
          </SubSection>

          <SubSection title="6.3 Autorités compétentes">
            En cas d'obligation légale, vos données peuvent être communiquées aux autorités compétentes, notamment l'administration fiscale, les juridictions, les forces de l'ordre et la Commission Nationale de l'Informatique et des Libertés (CNIL).
          </SubSection>
        </Section>

        <Section title="7. Transferts de données hors Union européenne">
          Les données personnelles des Utilisateurs sont stockées en Union européenne (Supabase, Frankfurt).<br/><br/>
          Des transferts de données personnelles en dehors de l'Union européenne ne peuvent cependant être totalement exclus dans le cadre de l'utilisation de l'application, par l'intermédiaire des sous-traitants suivants notamment : <strong>Clerk Inc.</strong> (authentification), <strong>Stripe LLC</strong> (paiement), <strong>Groq Inc.</strong> (inférence IA), <strong>Cloudinary Ltd</strong> (traitement d'images), <strong>Plus Five Five, Inc./Resend</strong> (envoi d'emails), <strong>Vercel Inc.</strong> (hébergement frontend) et <strong>Google LLC/Gmail</strong> (support email). Des données personnelles pourraient alors être stockées et/ou des transferts de données pourraient intervenir en dehors de l'Union européenne, notamment aux États-Unis.<br/><br/>
          De plus, <strong>Supabase Inc.</strong> est une société de droit américain. Bien que les données soient hébergées en Union européenne (Frankfurt), un accès distant depuis les États-Unis ou Singapour ne peut être exclu (support, maintenance).<br/><br/>
          Le responsable de traitement s'engage à ce que ces transferts soient réalisés :<br/>
          • vers des pays présentant un niveau de protection dit adéquat au sens des autorités européennes de protection des données, ou<br/>
          • avec des garanties appropriées en application de l'article 46 du RGPD (notamment des clauses contractuelles types adoptées par la Commission européenne), ou<br/>
          • dans le respect de l'article 49 du RGPD.
        </Section>

        <Section title="8. Prise de décision automatisée">
          Aucune prise de décision entièrement automatisée produisant des effets juridiques ou affectant significativement les personnes concernées n'est réalisée dans le cadre de l'exploitation de l'application, au sens de l'article 22 du RGPD.<br/><br/>
          L'assistant conversationnel IA et le diagnostic photo sont des outils d'aide à l'entretien du gazon. Les résultats qu'ils produisent sont destinés à être examinés et utilisés par l'utilisateur et ne constituent pas des décisions automatisées au sens du RGPD.<br/><br/>
          Le GreenScore est calculé automatiquement à partir de vos actions d'entretien et de votre profil. Ce score sert uniquement à alimenter un classement ludique entre utilisateurs et ne produit aucun effet juridique ni aucune décision vous concernant.
        </Section>

        <Section title="9. Mesures de sécurité">
          Le responsable de traitement met en œuvre les mesures techniques et organisationnelles appropriées afin de garantir un niveau de sécurité adapté au risque.<br/><br/>
          Le responsable de traitement prend des mesures afin de garantir que toute personne physique agissant sous son autorité ou sous celle du sous-traitant, qui a accès à des données à caractère personnel, ne les traite pas, à moins d'y être obligée.<br/><br/>
          En cas de violation de données à caractère personnel, Mongazon360 procède à la notification de la violation à la CNIL dans les conditions prévues par l'article 33 du RGPD. Lorsque la violation est susceptible d'engendrer un risque élevé pour les droits et libertés des personnes concernées, celles-ci en sont également informées conformément à l'article 34 du RGPD.
        </Section>

        <Section title="10. Vos droits sur vos données personnelles">
          La personne concernée par un traitement peut définir des directives relatives à la conservation, à l'effacement et à la communication de ses données personnelles après son décès. Ces directives peuvent être générales ou particulières.<br/><br/>
          La personne concernée par un traitement bénéficie également :<br/>
          • d'un <strong>droit d'accès</strong>,<br/>
          • d'un <strong>droit d'opposition</strong>,<br/>
          • d'un <strong>droit de rectification</strong>,<br/>
          • d'un <strong>droit de suppression</strong>,<br/>
          • d'un <strong>droit à la portabilité</strong> de ses données (sous conditions),<br/>
          • du droit de <strong>retirer son consentement</strong> à tout moment.<br/><br/>
          Pour les traitements fondés sur l'intérêt légitime de Mongazon360, la personne concernée dispose du droit de s'opposer à tout moment au traitement de ses données. En cas d'opposition, Mongazon360 devra démontrer l'existence de motifs légitimes et impérieux pour la poursuite du traitement, qui prévalent sur les intérêts, droits et libertés de la personne concernée, ou établir que le traitement est nécessaire à la constatation, à l'exercice ou à la défense de droits en justice.<br/><br/>
          Le droit à la portabilité s'applique uniquement aux données fournies par la personne concernée dans le cadre de traitements fondés sur le contrat ou le consentement. Dans le cadre de l'application Mongazon360, ce droit concerne notamment les données du compte utilisateur et les données du profil gazon.<br/><br/>
          La demande devra indiquer les nom et prénom, adresse email ou postale de la personne concernée, et être signée et accompagnée d'un justificatif d'identité en cours de validité. Mongazon360 s'engage à répondre dans un délai d'un mois à compter de la réception de la demande. Ce délai peut être prorogé de deux mois supplémentaires en cas de demande complexe ou de nombre élevé de demandes ; la personne concernée en sera informée dans le mois suivant la réception.<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Exercice des droits</strong> :<br/>
          Email : contact@mongazon360.fr<br/><br/>
          Vous pouvez également exporter et supprimer vos données directement depuis l'application : <em>Paramètres → Mes données</em>.
        </Section>

        <Section title="11. Réclamation">
          La personne concernée par un traitement a le droit d'introduire une réclamation auprès de l'autorité de protection des données :<br/><br/>
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7", textDecoration:"underline" }}>
            CNIL — Commission Nationale de l'Informatique et des Libertés
          </a>
        </Section>

        <BackToSettings />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CGU — Conditions Générales d'Utilisation
// ════════════════════════════════════════════════════════════════════════════
export function CGU() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader emoji="📜" title="Conditions Générales d'Utilisation" subtitle="Mise à jour : 27 mai 2026" />
      <div style={scroll}>

        <div style={{ ...card(), background:"rgba(33,150,243,0.06)", border:"1px solid rgba(33,150,243,0.2)" }}>
          <div style={{ fontSize:12, color:"#90caf9", lineHeight:1.6 }}>
            ℹ️ Les présentes CGU/CGV sont un document unique. Les sections 1 à 4, 6, 7, 10 à 18 constituent les <strong>Conditions Générales d'Utilisation (CGU)</strong> applicables à tout utilisateur. Les sections 5, 8 et 9 constituent les <strong>Conditions Générales de Vente (CGV)</strong> applicables aux abonnements Premium —{" "}
            <span onClick={() => navigate("/cgv")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>voir les CGV</span>.
          </div>
        </div>

        <Section title="1. Présentation de l'Application Mongazon360™">
          Mongazon360<sup style={{ fontSize:8 }}>™</sup> est une application web (PWA), accessible sur mobile et sur navigateur, qui permet aux utilisateurs de suivre et d'optimiser l'entretien de leur gazon (ci-après l'« Application »). L'Application intègre un assistant conversationnel alimenté par intelligence artificielle et un système de diagnostic photo par IA.<br/><br/>
          L'Application s'adresse à toute personne physique agissant à titre non professionnel (ci-après l'« Utilisateur »), qu'elle dispose d'un compte gratuit (ci-après « Compte Free ») ou d'un compte payant par abonnement (ci-après « Compte Premium »).
        </Section>

        <Section title="2. Éditeur de l'Application">
          L'Application Mongazon360 est éditée par <strong style={{ color:"#a5d6a7" }}>Krebs Ayfer</strong>, dont le siège est situé 55 rue Pierre Pflimlin, 68510 Sierentz, immatriculé sous le numéro SIRET 442 546 594.<br/><br/>
          Email de contact : contact@mongazon360.fr
        </Section>

        <Section title="3. Compte utilisateur">
          Avant l'utilisation de l'Application Mongazon360, l'Utilisateur est invité à créer un compte utilisateur depuis l'URL : https://accounts.mongazon360.fr/sign-in ou depuis l'application, téléchargeable depuis les plateformes habituelles (App Store, Google Play).<br/><br/>
          <strong>1/</strong> en renseignant nom, prénom, adresse email et un mot de passe robuste, ou en se connectant via son compte Google ;<br/>
          <strong>2/</strong> en acceptant les documents contractuels (CGU/CGV et politique de confidentialité).<br/><br/>
          L'Utilisateur pourra mettre à jour ses informations personnelles à tout moment depuis son espace utilisateur.<br/><br/>
          Les identifiants de connexion sont personnels et confidentiels. L'Utilisateur est seul responsable de leur conservation et de leur protection contre la perte et l'accès non autorisé. Toute utilisation de l'Application réalisée à partir des identifiants de l'Utilisateur est réputée effectuée par ce dernier.<br/><br/>
          L'Utilisateur s'engage à informer Mongazon360, par tout moyen et dans les meilleurs délais, en cas de vol ou de perte de ses identifiants, ou en cas de vol ou de perte de son terminal, pouvant permettre à un tiers d'accéder à l'Application par le biais de ses identifiants.<br/><br/>
          L'Utilisateur peut demander la clôture de son compte à tout moment en adressant sa demande à l'adresse suivante : contact@mongazon360.fr. La suppression du compte intervient dans un délai de 45 jours à compter de la demande, sous réserve de l'abonnement Premium en cours le cas échéant.<br/><br/>
          Lorsque l'abonnement Premium a été souscrit par l'intermédiaire de l'Apple App Store ou du Google Play Store, la suppression du compte n'emporte pas résiliation de l'abonnement. L'Utilisateur doit procéder séparément à la résiliation de son abonnement depuis les réglages de la plateforme concernée, conformément à l'article 5d des présentes.<br/><br/>
          En cas d'inactivité du compte pendant une durée de 24 mois, Mongazon360 adresse un email à l'Utilisateur pour l'informer de la suppression prochaine de son compte. En l'absence de réponse dans un délai de 45 jours, le compte et les données associées sont supprimés.
        </Section>

        <Section title="4. Documents contractuels">
          Les documents contractuels (ci-après le « Contrat ») que l'Utilisateur est invité à accepter lors de la création de son compte sur l'Application sont les suivants :<br/><br/>
          — les présentes CGU/CGV,<br/>
          — la politique de confidentialité,<br/>
          — le cas échéant, la confirmation de la commande de l'abonnement Premium adressée par email à l'Utilisateur.<br/><br/>
          En cas de contradiction entre ces documents, le document de rang supérieur dans l'ordre ci-dessus prévaudra.
        </Section>

        <Section title="6. Description du service">
          <SubSection title="a. Fonctionnalités accessibles avec un Compte Free">
            Le Compte Free permet notamment à l'Utilisateur de bénéficier des fonctionnalités suivantes :<br/><br/>
            • création et gestion d'un profil gazon (questionnaire d'onboarding, type de gazon, sol, exposition) ;<br/>
            • journalisation des interventions d'entretien ;<br/>
            • calcul du GreenScore et participation au classement mensuel par ligues ;<br/>
            • recommandations de produits d'entretien avec liens d'affiliation ;<br/>
            • partage social de l'état de son jardin ;<br/>
            • notifications push et emails d'alerte et de conseil (alertes météo, conseils d'entretien, notifications de gamification).<br/><br/>
            La liste des fonctionnalités accessibles dans le cadre du Compte Free est celle disponible au sein de l'Application à la date de son téléchargement par l'Utilisateur. Cette liste est fournie à titre indicatif et est susceptible d'évoluer à tout moment, sans préavis ni compensation, dans le cadre des mises à jour de l'Application. L'Éditeur se réserve le droit de modifier, suspendre ou supprimer certaines fonctionnalités gratuites, ou d'en soumettre l'accès à la souscription d'un abonnement Premium.
          </SubSection>

          <SubSection title="b. Fonctionnalités supplémentaires accessibles avec un Compte Premium">
            En complément des fonctionnalités du Compte Free, le Compte Premium donne notamment accès aux fonctionnalités suivantes :<br/><br/>
            • assistant conversationnel <strong>« Bob »</strong>, alimenté par intelligence artificielle, répondant aux questions de l'Utilisateur sur l'entretien du gazon ;<br/>
            • diagnostic photo par IA permettant d'analyser une photo du gazon pour identifier les problèmes éventuels (maladies, carences, mauvaises herbes) et proposer des actions correctives ;<br/>
            • recommandations personnalisées adaptées au profil gazon de l'Utilisateur.<br/><br/>
            La liste des fonctionnalités accessibles dans le cadre du Compte Premium est celle disponible au sein de l'Application à la date de souscription de l'abonnement par l'Utilisateur. Cette liste est fournie à titre indicatif et est susceptible d'évoluer dans le cadre des mises à jour de l'Application. L'Éditeur se réserve le droit de modifier, enrichir ou remplacer certaines fonctionnalités Premium, sous réserve de maintenir un niveau de service globalement équivalent.
          </SubSection>

          <SubSection title="c. Fonctionnalités d'intelligence artificielle">
            L'Application intègre des fonctionnalités reposant sur des technologies d'intelligence artificielle. Ces fonctionnalités fournissent des suggestions et recommandations destinées à faciliter l'entretien du gazon par l'Utilisateur. Elles ne se substituent pas à l'appréciation de l'Utilisateur et n'emportent aucune garantie de résultat.<br/><br/>
            Lorsque l'Utilisateur utilise l'assistant conversationnel, il est informé qu'il échange avec un système d'intelligence artificielle et non avec une personne physique.
          </SubSection>

          <SubSection title="d. Recommandations de produits et liens d'affiliation">
            L'Application propose à l'Utilisateur des recommandations de produits d'entretien du gazon, sélectionnées en fonction de son profil gazon. Ces recommandations prennent la forme de liens vers des pages du site Amazon.fr présentant des produits correspondant à la catégorie d'entretien concernée (par exemple : engrais, traitements, matériel de tonte).<br/><br/>
            Ces liens sont des <strong>liens d'affiliation</strong> intégrés dans le cadre du Programme Partenaires Amazon. Mongazon360 perçoit une commission sur les achats remplissant les conditions requises, effectués par l'Utilisateur après avoir cliqué sur ces liens. Cette commission n'influence pas la sélection des catégories recommandées, qui est déterminée par le profil gazon de l'Utilisateur.<br/><br/>
            Mongazon360 ne commercialise pas directement les produits affichés sur les pages Amazon. L'ordre d'affichage des produits sur le site Amazon est déterminé par Amazon selon ses propres critères de classement. L'achat est réalisé directement auprès d'Amazon ou du vendeur tiers référencé sur Amazon, qui est seul responsable de la vente, de la livraison, de la garantie et du service après-vente.<br/><br/>
            <strong style={{ color:"#fbbf24" }}>Produits phytosanitaires :</strong> l'Utilisateur est informé que certains produits accessibles via les pages Amazon vers lesquelles l'Application renvoie sont susceptibles de contenir des substances phytopharmaceutiques. Conformément à l'article L. 253-7, III du Code rural et de la pêche maritime, la mise sur le marché, la délivrance, l'utilisation et la détention de produits phytopharmaceutiques pour un usage non professionnel sont interdites depuis le 1er janvier 2019, à l'exception des produits de biocontrôle, des produits qualifiés à faible risque et des produits dont l'usage est autorisé dans le cadre de l'agriculture biologique (art. L. 253-7, IV). En pratique, les produits accessibles aux utilisateurs non professionnels portent la mention <strong>« emploi autorisé dans les jardins » (EAJ)</strong>. Il appartient à l'Utilisateur de vérifier, avant tout achat, que le produit relève de l'une de ces catégories autorisées.
          </SubSection>

          <SubSection title="e. GreenScore">
            L'Application attribue à chaque Utilisateur un score dénommé <strong>« GreenScore »</strong>, reflétant son engagement dans l'entretien de son gazon. Le GreenScore repose sur l'accumulation de GreenPoints attribués pour les actions suivantes :<br/><br/>
            • actions d'entretien enregistrées dans l'Application (tonte, arrosage, engrais, désherbage, aération, scarification, traitement anti-mousse/fongicide, regarnissage/semis), chaque action étant assortie d'un nombre de points et d'un délai minimum entre deux enregistrements (cooldown) ;<br/>
            • complétion du profil gazon (200 points, attribués une seule fois) ;<br/>
            • diagnostic photo par IA (100 points, cooldown de 7 jours — fonctionnalité réservée aux titulaires d'un Compte Premium) ;<br/>
            • partage social de l'état de son jardin (75 points, cooldown de 7 jours).<br/><br/>
            Les GreenPoints totaux s'accumulent indéfiniment et ne sont pas remis à zéro.<br/><br/>
            L'Utilisateur est informé que certaines sources de points sont réservées aux titulaires d'un Compte Premium (diagnostic photo). En conséquence, un Utilisateur disposant d'un Compte Free ne pourra pas accéder à l'ensemble des sources de points, indépendamment de la qualité de son entretien.<br/><br/>
            Le GreenScore ne constitue pas une évaluation de la personne de l'Utilisateur. Il vise exclusivement à animer l'engagement dans l'entretien du gazon et ne produit aucun effet juridique ni aucune décision à l'égard de l'Utilisateur.
          </SubSection>

          <SubSection title="f. Gamification : ligues et classement">
            L'Application intègre un système de classement mensuel organisé en cinq ligues : <strong>Semis</strong> (ligue de départ, tous les nouveaux utilisateurs), <strong>Pousse</strong> (top 50 % de Semis en fin de mois, 30 joueurs maximum), <strong>Gazon</strong> (top 50 % de Pousse, 20 joueurs maximum), <strong>Champion</strong> (top 50 % de Gazon, 10 joueurs maximum) et <strong>Légende</strong> (top 50 % de Champion, 5 joueurs maximum).<br/><br/>
            Le classement repose sur un score mensuel, distinct des GreenPoints totaux, calculé selon la formule suivante :<br/>
            <em>score final = (GreenPoints du mois × coefficient de complétion du profil) + points de connexion</em>.<br/>
            Seuls les GreenPoints accumulés entre le 1er et le dernier jour du mois comptent pour le classement mensuel.<br/><br/>
            Le coefficient de complétion du profil varie en fonction du niveau de complétion du profil de l'Utilisateur : × 0,40 lorsque seul l'onboarding est terminé, jusqu'à × 1,00 lorsque le profil est complet et qu'un diagnostic photo a été réalisé (réservé Premium). Le coefficient maximal ne peut donc être atteint que par les titulaires d'un Compte Premium.<br/><br/>
            Les points de connexion correspondent à 1 point par jour de connexion à l'Application au cours du mois (maximum de 30 ou 31 points selon le mois).<br/><br/>
            Le classement est figé le dernier jour du mois à minuit. Les Utilisateurs classés dans le top 50 % de leur ligue sont promus à la ligue supérieure, les Utilisateurs classés entre 25 % et 50 % restent dans leur ligue, et les Utilisateurs classés dans les 25 % inférieurs sont relégués à la ligue inférieure. Les Utilisateurs de la ligue Semis ne peuvent pas être relégués et les Utilisateurs de la ligue Légende ne peuvent pas être promus.<br/><br/>
            En cas d'égalité de score, les critères de départage s'appliquent dans l'ordre suivant : premièrement, le type de compte (Premium devant Free) ; deuxièmement, l'ancienneté (compte le plus ancien favorisé).<br/><br/>
            Le 1er de chaque mois, le score mensuel de chaque Utilisateur est remis à zéro, les promotions et relégations de la période précédente sont appliquées et les points de connexion sont remis à zéro. Les GreenPoints totaux (paliers) ne sont pas remis à zéro et s'accumulent indéfiniment.<br/><br/>
            La participation au classement implique que le prénom et le GreenScore de l'Utilisateur soient visibles par les autres Utilisateurs de la même ligue. L'Utilisateur en accepte le principe en acceptant les présentes CGU/CGV.<br/><br/>
            Un nouvel Utilisateur inscrit en cours de mois intègre la ligue Semis avec un score de 0 et ne peut pas être relégué lors de son premier mois. En cas de passage d'un Compte Free à un Compte Premium en cours de mois, le coefficient de complétion du profil est recalculé immédiatement et le type de compte Premium s'applique au départage dès le lendemain.<br/><br/>
            <strong style={{ color:"#90caf9" }}>Profils simulés (bots) :</strong> tant qu'une ligue compte moins de 10 utilisateurs réels actifs sur le mois, des profils simulés (bots) complètent automatiquement le classement. Les profils simulés sont nommés « Jardinier #001 », « Jardinier #002 », etc., et identifiés par un pictogramme distinctif <strong>🤖</strong>. Leurs scores sont générés aléatoirement dans une plage réaliste correspondant à la ligue. Les profils simulés ne génèrent jamais de promotion ou de relégation réelle. Ils sont supprimés automatiquement lorsque la ligue atteint 100 utilisateurs réels actifs sur le mois.
          </SubSection>
        </Section>

        <Section title="7. Évolution du service">
          Mongazon360 se réserve la possibilité de faire évoluer les fonctionnalités de l'Application, notamment d'ajouter, de modifier ou de supprimer des fonctionnalités, ou de faire évoluer leurs caractéristiques.<br/><br/>
          Concernant les abonnements Premium en cours, l'Utilisateur est informé par courrier électronique de toute modification de nature à dégrader ou diminuer de manière substantielle les fonctionnalités du service, au moins un mois avant la mise en œuvre de la modification. L'Utilisateur pourra dans ce cas résilier son abonnement dans les conditions prévues à l'article 5 des présentes.
        </Section>

        <Section title="10. Obligations de Mongazon360">
          Mongazon360 s'engage à apporter toute la diligence et tout le soin nécessaires à la fourniture d'un service de qualité et à tenir informé l'Utilisateur des difficultés ou incidents pouvant survenir lors du fonctionnement de l'Application.<br/><br/>
          Mongazon360 fournit les mises à jour nécessaires au maintien de la conformité du service numérique pendant toute la durée de sa fourniture, conformément à l'article L. 224-25-25 du Code de la consommation.<br/><br/>
          Mongazon360 met en œuvre les mesures techniques et organisationnelles appropriées afin de garantir la sécurité de l'Application et des données des Utilisateurs.<br/><br/>
          Mongazon360 ne garantit pas la compatibilité totale de l'Application avec l'ensemble des terminaux, systèmes d'exploitation ou navigateurs utilisés par l'Utilisateur. Il appartient à l'Utilisateur de vérifier la compatibilité de son environnement numérique avec l'Application.
        </Section>

        <Section title="11. Obligations de l'Utilisateur">
          L'Utilisateur s'engage à utiliser l'Application conformément à sa destination et aux présentes CGU/CGV.<br/><br/>
          L'Application est destinée à un usage strictement personnel. L'Utilisateur s'interdit d'en faire un usage commercial, professionnel ou collectif.<br/><br/>
          L'Utilisateur demeure seul responsable de l'adéquation de l'Application avec ses besoins. Il est également seul responsable de l'utilisation qu'il fait de l'Application, des finalités pour lesquelles il l'utilise, de l'utilisation des résultats fournis par les fonctionnalités de l'Application ainsi que des contenus qu'il met en ligne sur l'Application. <strong style={{ color:"#fbbf24" }}>Les informations fournies par l'Application ne se substituent pas aux conseils d'un professionnel du jardinage ou de l'agronomie.</strong><br/><br/>
          L'Utilisateur s'engage à ne pas utiliser l'Application aux fins d'entraver ou d'altérer son fonctionnement, notamment en l'encombrant volontairement ou involontairement par le transfert intempestif de contenus, en dehors des cas d'utilisation prévus.<br/><br/>
          L'Utilisateur s'engage à ne pas tenter d'accéder de manière non autorisée aux systèmes informatiques de Mongazon360, ni de procéder à l'extraction ou la réutilisation non autorisée des données de l'Application.<br/><br/>
          L'Utilisateur s'engage à ce que les contenus qu'il met en ligne sur l'Application (photos, messages adressés au chatbot, informations de profil) ne contreviennent pas aux lois et réglementations en vigueur, et notamment :<br/><br/>
          • ne portent pas atteinte aux droits des tiers, en particulier aux droits de propriété intellectuelle et aux droits de la personnalité ;<br/>
          • ne contiennent aucun contenu illicite, diffamatoire, injurieux, discriminatoire, violent ou contraire à l'ordre public et aux bonnes mœurs.
        </Section>

        <Section title="12. Propriété intellectuelle">
          L'Application Mongazon360, ses composants logiciels, son interface graphique, ses contenus rédactionnels, ses bases de données ainsi que l'ensemble des éléments qui la composent sont protégés par les dispositions du Code de la propriété intellectuelle et par toute législation applicable en matière de propriété intellectuelle.<br/><br/>
          Mongazon360<sup style={{ fontSize:8 }}>™</sup> est par ailleurs une marque déposée à l'EUIPO (30 mai 2026 — Classes 9, 42, 44) protégée sur 27 pays de l'Union européenne.<br/><br/>
          L'Utilisateur reconnaît que les présentes CGU/CGV ne lui confèrent aucun droit de propriété intellectuelle sur l'Application. La mise à disposition de l'Application dans les conditions prévues aux présentes ne saurait être analysée comme la cession d'un quelconque droit de propriété intellectuelle, au sens du Code de la propriété intellectuelle.<br/><br/>
          L'Utilisateur s'engage à ne pas reproduire, copier, modifier, adapter, distribuer, représenter ou exploiter de quelque manière que ce soit tout ou partie de l'Application, de ses contenus ou de ses fonctionnalités, sans l'autorisation préalable et écrite de Mongazon360.<br/><br/>
          L'Utilisateur demeure titulaire des droits sur les contenus qu'il met en ligne sur l'Application (photos de gazon, informations de profil). Aucune disposition des présentes ne le prive des droits que l'Utilisateur détient sur son propre contenu.<br/><br/>
          En mettant en ligne ces contenus, l'Utilisateur concède à Mongazon360 une licence non exclusive, transférable, sous-licenciable, gratuite et mondiale pour héberger, utiliser, modifier, exécuter, copier, représenter. Cette licence prend fin à la suppression du contenu des systèmes de Mongazon360.
        </Section>

        <Section title="13. Responsabilité">
          <SubSection title="a. Responsabilité de Mongazon360">
            Mongazon360 est soumise à une obligation générale de moyens dans le cadre de la fourniture du service.<br/><br/>
            Conformément à l'article L. 221-15 du Code de la consommation, Mongazon360 est responsable de plein droit à l'égard de l'Utilisateur de la bonne exécution des obligations résultant du Contrat conclu à distance. Toutefois, elle peut s'exonérer de tout ou partie de sa responsabilité en apportant la preuve que l'inexécution ou la mauvaise exécution du Contrat est imputable soit à l'Utilisateur, soit au fait, imprévisible et insurmontable, d'un tiers au Contrat, soit à un cas de force majeure.<br/><br/>
            Mongazon360 met en œuvre tous les efforts raisonnables pour assurer la disponibilité de l'Application. Mongazon360 pourra interrompre l'accès à l'Application, occasionnellement, pour des travaux de maintenance ou d'amélioration. Mongazon360 ne saurait être tenue responsable des interruptions liées à un dysfonctionnement du réseau Internet, à une défaillance de l'environnement numérique de l'Utilisateur ou à tout événement échappant à son contrôle.<br/><br/>
            <strong style={{ color:"#fbbf24" }}>Fonctionnalités IA :</strong> les fonctionnalités d'intelligence artificielle intégrées à l'Application (assistant conversationnel « Bob », diagnostic photo, recommandations) fournissent des résultats à titre informatif. Ces résultats sont générés automatiquement à partir des données fournies par l'Utilisateur et d'une base de connaissances. Mongazon360 ne garantit pas l'exactitude, l'exhaustivité ou la pertinence des résultats produits par ces fonctionnalités. L'Utilisateur reste seul juge de l'opportunité de suivre les recommandations formulées.
          </SubSection>

          <SubSection title="b. Responsabilité de l'Utilisateur">
            L'Utilisateur demeure seul responsable de l'adéquation de l'Application avec ses besoins. Il est également seul responsable de l'utilisation qu'il fait de l'Application, des finalités pour lesquelles il l'utilise, de l'utilisation des résultats fournis par les fonctionnalités de l'Application ainsi que des contenus qu'il met en ligne sur l'Application.<br/><br/>
            L'Utilisateur assume et garantit Mongazon360 contre l'ensemble des risques et conséquences liés à un contenu ne respectant pas les présentes CGU/CGV.
          </SubSection>
        </Section>

        <Section title="14. Force majeure">
          Mongazon360 ne pourra être tenue pour responsable de tout retard ou manquement dans l'exécution de l'une quelconque de ses obligations au titre du présent Contrat, si ledit retard ou manquement est dû à la survenance d'un cas de force majeure habituellement reconnu par la jurisprudence des cours et tribunaux français.<br/><br/>
          Nonobstant les cas de force majeure habituellement reconnus par la jurisprudence des cours et tribunaux français, de convention expresse entre les parties, sont considérés comme cas de force majeure : les actes de terrorisme, les guerres, les grèves totales ou partielles et lock-out d'entreprises tierces impactant la prestation, les intempéries, épidémies, blocage des voies de circulation, des moyens de transports ou d'approvisionnement pour quelque raison que ce soit, pandémie, tremblement de terre, incendie, tempête, inondation, dégât des eaux, les restrictions gouvernementales ou légales, modifications légales ou réglementaires, le blocage des télécommunications.<br/><br/>
          L'Utilisateur souhaitant invoquer un cas de force majeure devra le notifier à Mongazon360 par tout moyen dans les meilleurs délais dès qu'il aura connaissance d'un tel événement. Dès lors que les effets consécutifs à l'événement de force majeure invoqué auront disparu, Mongazon360 en informera, sans délai, l'Utilisateur par tout moyen et reprendra immédiatement l'exécution de ses obligations.<br/><br/>
          En cas de persistance des effets consécutifs à l'événement constituant un cas de force majeure pendant plus d'un (1) mois, les parties conviennent que le présent Contrat pourra être résilié de plein droit sur l'initiative de la partie la plus diligente. L'Utilisateur sera alors remboursé au prorata de la période d'abonnement restant à courir.
        </Section>

        <Section title="15. Résiliation">
          En cas de manquement par une partie à l'une de ses obligations au titre des présentes, l'autre partie aura la faculté, 15 jours après mise en demeure envoyée par lettre recommandée avec avis de réception restée sans effet, de mettre fin au Contrat de plein droit sans préjudice de tout dommage et intérêt auquel elle pourrait prétendre du fait des manquements invoqués.
        </Section>

        <Section title="16. Données personnelles">
          Dans le cadre de l'utilisation de l'Application, Mongazon360 est amenée à réaliser des traitements de données personnelles en qualité de responsable de traitement. Les règles relatives à la protection des données personnelles sont prévues dans la{" "}
          <span onClick={() => navigate("/confidentialite")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
            Politique de confidentialité
          </span>{" "}accessible depuis l'Application.
        </Section>

        <Section title="17. Dispositions diverses">
          Chacune des clauses des présentes CGU/CGV doit être interprétée, dans toute la mesure du possible, de manière à ce qu'elle soit validée au regard du droit qui lui est applicable. Si l'une quelconque des stipulations des présentes se révèle être illégale, nulle ou inopposable par toute juridiction ou autorité administrative compétente aux termes d'une décision exécutoire, cette stipulation sera réputée non écrite, sans altérer la validité des autres stipulations et sera remplacée par une stipulation valable d'effet équivalent.<br/><br/>
          Le fait pour une partie de ne pas se prévaloir d'une disposition quelconque des présentes CGU/CGV ne vaudra en aucun cas renonciation à son droit d'exiger le respect de chacune de ses clauses et conditions.<br/><br/>
          Mongazon360 se réserve le droit de modifier les présentes CGU/CGV à tout moment. Les modifications prennent effet à la date de leur mise en ligne sur l'Application. L'Utilisateur est informé de toute modification substantielle par tout moyen approprié. La poursuite de l'utilisation de l'Application après notification de la modification vaut acceptation des nouvelles CGU/CGV. En cas de désaccord, l'Utilisateur peut résilier son compte dans les conditions prévues à l'article 15 des présentes.<br/><br/>
          Mongazon360 est également autorisé à céder le Contrat à tout cessionnaire de son choix. En cas de cession du présent Contrat par Mongazon360, l'Utilisateur accepte que Mongazon360 ne soit pas tenu solidairement de la bonne exécution du Contrat par le cessionnaire. L'Utilisateur sera informé de toute cession par email. En cas de désaccord, l'Utilisateur pourra résilier son compte dans les conditions prévues à l'article 15.<br/><br/>
          Toute cession, subrogation, substitution ou autre forme de transmission du présent Contrat par l'Utilisateur est interdite sauf accord préalable écrit de Mongazon360.
        </Section>

        <Section title="18. Droit applicable — Médiation — Juridiction compétente">
          La version française des présentes CGU/CGV fait foi et prime sur toute autre version rédigée en langue étrangère. Le Contrat est régi par le droit français.<br/><br/>
          Conformément aux articles L. 611-1 et suivants du Code de la consommation, l'Utilisateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige l'opposant à Mongazon360.<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Mongazon360 adhère au service du médiateur suivant :</strong><br/>
          CM2C — Centre de la Médiation et de la Consommation de Conciliateurs de Justice<br/>
          49 Rue de Ponthieu, 75008 Paris<br/>
          <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7", textDecoration:"underline" }}>www.cm2c.net</a><br/><br/>
          Après démarche préalable écrite de l'Utilisateur auprès de Mongazon360 restée infructueuse, le service du médiateur peut être saisi pour tout litige de consommation dont le règlement n'aurait pas abouti.<br/><br/>
          En cas de litige non réglé amiablement, la compétence est attribuée au tribunal du lieu de résidence du défendeur, conformément à l'article 42 du Code de procédure civile, ou, au choix de l'Utilisateur, au lieu d'exécution du service, conformément à l'article 46 du Code de procédure civile.
        </Section>

        <BackToSettings />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CGV — Conditions Générales de Vente
// ════════════════════════════════════════════════════════════════════════════
export function CGV() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader emoji="💳" title="Conditions Générales de Vente" subtitle="Mise à jour : 27 mai 2026" />
      <div style={scroll}>

        <div style={{ ...card(), background:"rgba(33,150,243,0.06)", border:"1px solid rgba(33,150,243,0.2)" }}>
          <div style={{ fontSize:12, color:"#90caf9", lineHeight:1.6 }}>
            ℹ️ Les présentes CGV s'appliquent à la souscription d'un abonnement Premium à l'application Mongazon360<sup style={{ fontSize:7 }}>™</sup>. Elles complètent les{" "}
            <span onClick={() => navigate("/cgu")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
              Conditions Générales d'Utilisation
            </span>{" "}qui restent applicables.
          </div>
        </div>

        <Section title="5. Souscription à l'abonnement Premium">
          <SubSection title="a. Formation du contrat">
            L'abonnement Premium souscrit par l'Utilisateur depuis l'Application constitue un contrat conclu à distance, au sens de l'article L. 221-1 du Code de la consommation.<br/><br/>
            L'Utilisateur reconnaît avoir pris connaissance, avant de s'engager, du contenu du présent Contrat, lequel prévoit les informations précontractuelles obligatoires visées à l'article L. 221-5 du Code de la consommation.<br/><br/>
            L'Utilisateur accepte de recevoir un exemplaire du présent Contrat de manière électronique.<br/><br/>
            <strong style={{ color:"#a5d6a7" }}>Lorsque l'abonnement est souscrit depuis le site web ou l'application web</strong>, les étapes de la commande sont les suivantes :<br/><br/>
            1° Depuis son espace utilisateur, sélection de l'abonnement souhaité et la durée (mensuelle ou annuelle) ;<br/>
            2° Renseignement des informations de paiement ;<br/>
            3° Prise de connaissance et acceptation des présentes CGU/CGV et de la politique de confidentialité ;<br/>
            4° Confirmation de la commande en cliquant sur le bouton <strong>« 💳 S'abonner — [montant][période] »</strong>.<br/><br/>
            Jusqu'à l'étape du paiement, l'Utilisateur peut modifier sa commande, notamment les éventuelles erreurs commises lors de la saisie de ses données, en retournant sur les écrans précédents. L'acceptation définitive de la commande s'effectue en confirmant le paiement.<br/><br/>
            <strong style={{ color:"#a5d6a7" }}>Lorsque l'abonnement est souscrit par l'intermédiaire de l'Apple App Store ou du Google Play Store :</strong><br/><br/>
            L'Utilisateur sélectionne l'abonnement souhaité et sa durée depuis l'Application. La souscription est finalisée par l'Utilisateur via l'interface de paiement native de la plateforme concernée (Apple In-App Purchase ou Google Play Billing). En confirmant l'achat sur cette interface, l'Utilisateur accepte les présentes CGU/CGV et la politique de confidentialité de MONGAZON360. La transaction est traitée et encaissée par la plateforme, conformément aux conditions générales propres à celle-ci. MONGAZON360 n'a pas accès aux données de paiement de l'Utilisateur dans le cadre de cette transaction.<br/><br/>
            Que l'abonnement soit souscrit sur les stores ou depuis l'application, une confirmation de la commande est adressée à l'Utilisateur par email. Lorsque l'abonnement est souscrit via l'Apple App Store ou le Google Play Store, un reçu est également émis par la plateforme concernée. L'Utilisateur peut accéder au détail de sa commande depuis son espace utilisateur, et le cas échéant, depuis les réglages de la plateforme.<br/><br/>
            Mongazon360 se réserve la faculté de bloquer une commande, notamment en cas de suspicion de fraude ou de fraude avérée.
          </SubSection>

          <SubSection title="b. Conditions financières">
            Le tarif de l'abonnement Premium en vigueur est celui indiqué sur l'Application lors de la commande.<br/><br/>
            Le tarif est indiqué toutes taxes comprises.<br/><br/>
            Le prix est payable en intégralité au moment de la commande.<br/><br/>
            Le moyen de paiement applicable dépend du canal de souscription :<br/><br/>
            • lorsque l'abonnement est souscrit depuis le site web ou l'application web, le paiement est effectué par carte bancaire par l'intermédiaire du prestataire de paiement <strong>Stripe</strong> ;<br/>
            • lorsque l'abonnement est souscrit par l'intermédiaire de l'Apple App Store, le paiement est effectué via le système Apple In-App Purchase, selon les modalités et moyens de paiement acceptés par Apple ;<br/>
            • lorsque l'abonnement est souscrit par l'intermédiaire du Google Play Store, le paiement est effectué via le système Google Play Billing, selon les modalités et moyens de paiement acceptés par Google.<br/><br/>
            Lorsque le paiement est traité par l'Apple App Store ou le Google Play Store, la transaction est encaissée par la plateforme concernée pour le compte de MONGAZON360. MONGAZON360 n'est pas responsable des incidents de paiement imputables à la plateforme ou au moyen de paiement enregistré par l'Utilisateur auprès de celle-ci.<br/><br/>
            MONGAZON360 peut proposer des tarifs préférentiels. Les conditions et la durée de ces avantages sont présentées sur l'Application ou communiquées à l'Utilisateur par tout autre moyen.<br/><br/>
            L'Utilisateur est informé et consent à recevoir la facture correspondant à sa commande au format électronique.<br/><br/>
            <strong>Révision tarifaire :</strong> le tarif de l'abonnement pourra être révisé à l'initiative de MONGAZON360 à la date anniversaire de l'abonnement. Toute modification du tarif fera l'objet d'une information écrite adressée à l'Utilisateur au moins un (1) mois avant la date d'application de la modification. En cas de désaccord, l'Utilisateur pourra résilier son abonnement dans les conditions prévues au présent article. Lorsque l'abonnement a été souscrit par l'intermédiaire de l'Apple App Store, l'augmentation de prix est soumise aux règles propres à cette plateforme ; en particulier, dans les cas prévus par Apple, l'Utilisateur sera invité à consentir expressément au nouveau tarif, faute de quoi le renouvellement automatique sera désactivé à l'issue de la période en cours. Lorsque l'abonnement a été souscrit par l'intermédiaire du Google Play Store, l'Utilisateur sera informé de la modification de prix conformément aux conditions applicables de la plateforme.
          </SubSection>

          <SubSection title="c. Durée et renouvellement">
            L'abonnement Premium prend effet à compter de la date du paiement et a une durée de 1 mois ou d'un an suivant la formule choisie par l'Utilisateur.<br/><br/>
            À l'issue de la période initiale, l'abonnement se renouvelle automatiquement pour des périodes de même durée, sauf résiliation par l'Utilisateur dans les conditions prévues à l'article 5d des présentes.<br/><br/>
            Toute résiliation notifiée après l'expiration du délai de préavis ne prendra effet qu'à l'issue de la période de renouvellement suivante.<br/><br/>
            <strong style={{ color:"#a5d6a7" }}>Lorsque l'abonnement est souscrit depuis le site web ou l'application web (PWA) :</strong><br/>
            L'Utilisateur peut s'opposer au renouvellement en respectant un préavis d'au moins quarante-huit (48) heures avant la date de renouvellement pour l'abonnement mensuel, et d'au moins quinze (15) jours avant la date de renouvellement pour l'abonnement annuel. Toute résiliation notifiée après l'expiration du délai de préavis ne prendra effet qu'à l'issue de la période de renouvellement suivante.<br/><br/>
            <strong style={{ color:"#a5d6a7" }}>Lorsque l'abonnement est souscrit par l'intermédiaire de l'Apple App Store ou du Google Play Store :</strong><br/>
            Le renouvellement automatique peut être désactivé par l'Utilisateur à tout moment depuis les réglages de la plateforme concernée (Réglages &gt; [identifiant Apple] &gt; Abonnements sur iOS, ou Google Play &gt; Paiements et abonnements sur Android). La désactivation du renouvellement automatique prend effet à l'issue de la période d'abonnement en cours. Pour les abonnements souscrits via l'Apple App Store, les conditions d'utilisation de la plateforme imposent que le renouvellement automatique soit désactivé avant un délai défini par Apple précédant la fin de la période en cours, faute de quoi la période suivante sera facturée. L'Utilisateur est invité à consulter les conditions d'utilisation de l'App Store pour connaître le délai exact applicable. Les préavis contractuels prévus ci-dessus pour le canal web ne s'appliquent pas aux abonnements souscrits via les stores.<br/><br/>
            <strong>Notification de fin de période :</strong> conformément à l'article L. 215-1 du Code de la consommation, Mongazon360 informera l'Utilisateur, par email, au plus tôt trois mois et au plus tard un mois avant le terme de chaque période d'abonnement, de la possibilité de ne pas reconduire l'abonnement et de la date limite de non-reconduction.
          </SubSection>

          <SubSection title="d. Résiliation de l'abonnement par l'Utilisateur">
            L'Utilisateur peut résilier son abonnement Premium à tout moment. La résiliation prend effet à la fin de la période d'abonnement en cours. L'Utilisateur conserve l'accès aux fonctionnalités Premium jusqu'à cette date.<br/><br/>
            <strong style={{ color:"#a5d6a7" }}>Modalités de résiliation :</strong><br/><br/>
            • depuis l'espace utilisateur de l'Application, via la fonctionnalité de résiliation en ligne accessible ;<br/>
            • par courrier électronique adressé à : contact@mongazon360.fr ;<br/>
            • lorsque l'abonnement a été souscrit par l'intermédiaire de l'Apple App Store, depuis les réglages de l'appareil (Réglages &gt; [identifiant Apple] &gt; Abonnements), conformément aux conditions de la plateforme ;<br/>
            • lorsque l'abonnement a été souscrit par l'intermédiaire du Google Play Store, depuis l'application Google Play (Paiements et abonnements &gt; Abonnements), conformément aux conditions de la plateforme.<br/><br/>
            L'Utilisateur est informé que, pour les abonnements souscrits via l'Apple App Store ou le Google Play Store, la résiliation effectuée depuis l'espace utilisateur de l'Application ou par courrier électronique ne dispense pas de la désactivation du renouvellement automatique depuis les réglages de la plateforme concernée, cette dernière étant seule compétente pour interrompre le prélèvement.<br/><br/>
            À l'issue de l'abonnement, le compte de l'Utilisateur est automatiquement basculé en Compte Free. Les données générées par l'Utilisateur dans le cadre de l'utilisation des fonctionnalités Premium (notamment l'historique des diagnostics photo, les recommandations personnalisées et les échanges avec l'assistant conversationnel « Bob ») sont conservées et restent consultables depuis le Compte Free, dans les conditions prévues par la politique de confidentialité, jusqu'à la suppression du compte par l'Utilisateur.
          </SubSection>
        </Section>

        <Section title="8. Droit de rétractation">
          L'Utilisateur a le droit de se rétracter du Contrat sans donner de motif dans un délai de <strong>quatorze (14) jours</strong> à compter de la conclusion du contrat d'abonnement Premium.<br/><br/>
          Pour exercer le droit de rétractation, l'Utilisateur doit notifier au Prestataire sa décision de rétractation du Contrat au moyen d'une déclaration dénuée d'ambiguïté (par exemple, lettre envoyée par la poste ou courrier électronique). L'Utilisateur peut utiliser le modèle de formulaire de rétractation ci-dessous mais ce n'est pas obligatoire.<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Destinataire :</strong><br/>
          Krebs Ayfer — 55 rue Pierre Pflimlin, 68510 Sierentz<br/>
          Email de contact : contact@mongazon360.fr<br/><br/>
          Pour que le délai de rétractation soit respecté, il suffit que l'Utilisateur transmette sa communication relative à l'exercice du droit de rétractation avant l'expiration du délai de quatorze (14) jours.<br/><br/>
          En cas de rétractation, le Prestataire remboursera l'Utilisateur de tous les paiements reçus de lui, sans retard excessif et, en tout état de cause, au plus tard quatorze (14) jours à compter du jour où le Prestataire est informé de sa décision de rétractation du Contrat. Le Prestataire procèdera au remboursement en utilisant le même moyen de paiement que celui que le Client aura utilisé pour la transaction initiale, sauf si l'Utilisateur convient expressément d'un moyen différent ; en tout état de cause, ce remboursement n'occasionnera pas de frais pour l'Utilisateur.<br/><br/>
          Lorsque l'abonnement Premium a été souscrit par l'intermédiaire de l'Apple App Store ou du Google Play Store, le remboursement en cas de rétractation est traité par la plateforme concernée, selon ses propres procédures. L'Utilisateur est invité à adresser sa demande de remboursement directement auprès d'Apple (via l'historique des achats accessible depuis https://reportaproblem.apple.com) ou de Google (via le Centre d'aide Google Play), selon la plateforme utilisée. MONGAZON360 s'engage à coopérer avec la plateforme concernée pour garantir l'effectivité du droit de rétractation de l'Utilisateur.<br/><br/>
          Indépendamment du droit de rétractation, l'Utilisateur est informé que l'Apple App Store et le Google Play Store disposent de leurs propres politiques de remboursement, qui peuvent permettre un remboursement dans des conditions distinctes de celles prévues au présent article.<br/><br/>
          <strong style={{ color:"#fbbf24" }}>Renonciation au droit de rétractation :</strong> conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture d'un contenu numérique sans support matériel si l'exécution a commencé avant la fin du délai de rétractation, après :<br/><br/>
          • l'accord préalable exprès de l'Utilisateur pour commencer l'exécution immédiatement, et<br/>
          • sa renonciation expresse au droit de rétractation.<br/><br/>
          L'abonnement Premium donnant un accès immédiat au service dès la confirmation du paiement, l'Utilisateur est invité, lors de la souscription, à consentir expressément à l'exécution immédiate du service et à reconnaître qu'il perd en conséquence son droit de rétractation.<br/><br/>
          À défaut d'un tel accord et d'une telle renonciation, le Prestataire n'entamera pas l'exécution avant l'expiration du délai de rétractation. Si l'exécution débutait sans ces formalités, l'Utilisateur conserverait son droit de rétractation et aucune somme ne pourrait lui être réclamée à ce titre.

          <SubSection title="Modèle de formulaire de rétractation">
            <em>(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)</em><br/><br/>
            À l'attention de Krebs Ayfer – contact@mongazon360.fr<br/><br/>
            Je/nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la fourniture de contenus numériques ci-dessous :<br/><br/>
            Commandé le (*) :<br/>
            Nom du (des) consommateur(s) :<br/>
            Adresse du (des) consommateur(s) :<br/>
            Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :<br/>
            Date :<br/><br/>
            <em>(*) Rayez la mention inutile.</em>
          </SubSection>
        </Section>

        <Section title="9. Garantie légale de conformité">
          Mongazon360 est tenu à l'égard des Utilisateurs :<br/><br/>
          • de la <strong>garantie légale de conformité</strong> prévue aux articles L.224-25-12 à L.224-25-26 du Code de la consommation, permettant au Client d'obtenir gratuitement la mise en conformité du contenu numérique (ou du service numérique) fourni, ou à défaut, la réduction du prix ou la résolution du contrat ;<br/>
          • de la <strong>garantie contre les vices cachés</strong> prévue aux articles 1641 à 1649 du Code civil, permettant au Client de conserver le produit et obtenir une partie du prix ou de le rendre et se faire restituer le prix.

          <SubSection title="Garantie de conformité (fourniture continue)">
            Le consommateur a droit à la mise en œuvre de la garantie légale de conformité en cas d'apparition d'un défaut de conformité pendant toute la période contractuelle de fourniture du contenu numérique ou du service numérique, à compter de la fourniture du contenu numérique ou du service numérique. Durant ce délai, le consommateur n'est tenu d'établir que l'existence du défaut de conformité et non la date d'apparition de celui-ci.<br/><br/>
            La garantie légale de conformité emporte obligation de fournir toutes les mises à jour nécessaires au maintien de la conformité du contenu numérique ou du service numérique durant toute la période contractuelle de fourniture du contenu numérique ou du service numérique.<br/><br/>
            La garantie légale de conformité donne au consommateur droit à la mise en conformité du contenu numérique ou du service numérique sans retard injustifié suivant sa demande, sans frais et sans inconvénient majeur pour lui.<br/><br/>
            Le consommateur peut obtenir une réduction du prix en conservant le contenu numérique ou le service numérique, ou il peut mettre fin au contrat en se faisant rembourser intégralement contre renoncement au contenu numérique ou au service numérique, si :<br/><br/>
            1° Le professionnel refuse de mettre le contenu numérique ou le service numérique en conformité ;<br/>
            2° La mise en conformité du contenu numérique ou du service numérique est retardée de manière injustifiée ;<br/>
            3° La mise en conformité du contenu numérique ou du service numérique ne peut intervenir sans frais imposés au consommateur ;<br/>
            4° La mise en conformité du contenu numérique ou du service numérique occasionne un inconvénient majeur pour le consommateur ;<br/>
            5° La non-conformité du contenu numérique ou du service numérique persiste en dépit de la tentative de mise en conformité du professionnel restée infructueuse.<br/><br/>
            Le consommateur a également droit à une réduction du prix ou à la résolution du contrat lorsque le défaut de conformité est si grave qu'il justifie que la réduction du prix ou la résolution du contrat soit immédiate. Le consommateur n'est alors pas tenu de demander la mise en conformité du contenu numérique ou du service numérique au préalable.<br/><br/>
            Toute période d'indisponibilité du contenu numérique ou du service numérique en vue de sa remise en conformité suspend la garantie qui restait à courir jusqu'à la fourniture du contenu numérique ou du service numérique de nouveau conforme.<br/><br/>
            Ces droits résultent de l'application des articles L. 224-25-1 à L. 224-25-31 du Code de la consommation.<br/><br/>
            Le professionnel qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie légale de conformité encourt une amende civile d'un montant maximal de 300 000 euros, qui peut être porté jusqu'à 10 % du chiffre d'affaires moyen annuel (article L. 242-18-1 du Code de la consommation).
          </SubSection>

          <SubSection title="Garantie contre les vices cachés">
            Le vendeur est tenu de la garantie à raison des défauts cachés de la chose vendue qui la rendent impropre à l'usage auquel on la destine, ou qui diminuent tellement cet usage que l'acheteur ne l'aurait pas acquise, ou n'en aurait donné qu'un moindre prix, s'il les avait connus.<br/><br/>
            L'action résultant des vices rédhibitoires doit être intentée par l'acquéreur dans un délai de <strong>deux ans</strong> à compter de la découverte du vice.
          </SubSection>

          <SubSection title="Exclusions">
            Les garanties légales ne couvrent pas :<br/><br/>
            • une incompatibilité du contenu numérique avec les équipements ou logiciels du Client, si ceux-ci ne répondent pas aux spécifications indiquées par le Prestataire ;<br/>
            • une mauvaise utilisation, installation ou configuration du contenu numérique par le Client ;<br/>
            • une modification non autorisée du contenu numérique ;<br/>
            • le non-respect des instructions fournies par le Prestataire ;<br/>
            • un défaut de fonctionnement causé par un élément extérieur (connexion internet insuffisante, défaillance matérielle de l'équipement du Client, etc.).<br/><br/>
            <strong>Pour toute demande au titre des garanties légales</strong>, le Client doit contacter le Prestataire à l'adresse suivante : contact@mongazon360.fr
          </SubSection>
        </Section>

        <BackToSettings />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// POLITIQUE DE COOKIES (version simple — basée sur fonctionnement réel app)
// ════════════════════════════════════════════════════════════════════════════
export function Cookies() {
  return (
    <div>
      <PageHeader emoji="🍪" title="Politique de cookies" subtitle="Mise à jour : juin 2026" />
      <div style={scroll}>

        <Section title="Qu'est-ce qu'un cookie ?">
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, téléphone, tablette) lors de votre visite sur un site web ou d'une utilisation d'une application. Il permet au site ou à l'application de mémoriser des informations relatives à votre navigation.<br/><br/>
          L'application Mongazon360<sup style={{ fontSize:8 }}>™</sup> n'utilise pas de cookies au sens strict, mais utilise des <strong>technologies similaires</strong> stockées localement sur votre appareil (<em>localStorage</em>, <em>sessionStorage</em>) pour permettre son fonctionnement.
        </Section>

        <Section title="Technologies utilisées par Mongazon360™">

          <SubSection title="🔒 Technologies strictement nécessaires (sans consentement)">
            Ces technologies sont indispensables au fonctionnement de l'application et ne nécessitent pas votre consentement :<br/><br/>
            • <strong>Authentification (Clerk)</strong> : cookies de session permettant de vous maintenir connecté à votre compte ;<br/>
            • <strong>Préférences utilisateur</strong> : mémorisation de votre profil gazon, des consentements RGPD acceptés et de la complétion de l'onboarding ;<br/>
            • <strong>Suivi technique</strong> : capture de la source d'arrivée (UTM, referer) pour mesurer la performance des campagnes (anonymisé).
          </SubSection>

          <SubSection title="🔔 Technologies soumises à consentement">
            Ces technologies ne sont activées qu'avec votre accord explicite (modifiable depuis <em>Paramètres → Mes consentements</em>) :<br/><br/>
            • <strong>Notifications push</strong> : envoi d'alertes météo, rappels d'entretien, notifications de gamification ;<br/>
            • <strong>Géolocalisation</strong> : utilisation de votre position GPS pour fournir une météo précise ;<br/>
            • <strong>Partage de données anonymisées</strong> : partage avec des partenaires jardinage de données agrégées (jamais nominatives) à des fins d'études de marché ;<br/>
            • <strong>Prospection commerciale</strong> : envoi d'emails de conseils saisonniers et nouveautés Mongazon360<sup style={{ fontSize:7 }}>™</sup>.
          </SubSection>

          <SubSection title="📊 Cookies tiers (Amazon)">
            Lorsque vous cliquez sur un lien d'affiliation Amazon depuis l'application, vous êtes redirigé sur le site Amazon.fr. <strong>Amazon</strong> est alors susceptible de déposer ses propres cookies sur votre terminal, en qualité de responsable de traitement indépendant.<br/><br/>
            Pour gérer ces cookies, consultez directement la{" "}
            <a href="https://www.amazon.fr/gp/help/customer/display.html?nodeId=201909150" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7", textDecoration:"underline" }}>
              Politique de cookies d'Amazon
            </a>.
          </SubSection>
        </Section>

        <Section title="Gérer vos préférences">
          Vous pouvez à tout moment modifier vos consentements depuis l'application :<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Paramètres → Mes consentements</strong><br/><br/>
          Vous y trouverez l'ensemble des consentements optionnels que vous pouvez activer ou désactiver, avec effet immédiat.<br/><br/>
          Vous pouvez également supprimer toutes les données stockées localement sur votre appareil depuis :<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>Paramètres → Supprimer mes données locales</strong>
        </Section>

        <Section title="Durée de conservation">
          Les données stockées localement sur votre appareil sont conservées jusqu'à :<br/><br/>
          • la suppression manuelle par vos soins depuis les Paramètres ;<br/>
          • la suppression du cache de votre navigateur ;<br/>
          • la désinstallation de l'application ;<br/>
          • la suppression de votre compte (cf. Politique de confidentialité, article 5.3).
        </Section>

        <Section title="Contact">
          Pour toute question relative à cette politique de cookies, vous pouvez nous contacter à :<br/><br/>
          <strong style={{ color:"#a5d6a7" }}>contact@mongazon360.fr</strong>
        </Section>

        <BackToSettings />
      </div>
    </div>
  );
}
