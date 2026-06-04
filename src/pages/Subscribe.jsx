import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { appShell, btn, card } from "../lib/styles";

// ════════════════════════════════════════════════════════════════════════════
// SUBSCRIBE — Page de souscription Premium (avant Stripe Checkout)
// ════════════════════════════════════════════════════════════════════════════
// Conforme aux exigences avocat (Cabinet Victoris) :
//   Mention 2 — Checkbox renonciation droit de rétractation 14j (décochée par défaut)
//
// Article L.221-28 du Code de la consommation :
//   Pour un service entièrement exécuté avant 14 jours (= accès Premium dès paiement),
//   le client doit EXPLICITEMENT renoncer à son droit de rétractation.
//   Sans cette renonciation, il peut annuler et demander remboursement sous 14 jours.
// ════════════════════════════════════════════════════════════════════════════

const PLANS = [
  { id: "monthly", label: "Mensuel", price: "4,99€",  priceNum: 4.99,  period: "/mois", desc: "Sans engagement", highlight: false },
  { id: "yearly",  label: "Annuel",  price: "39,99€", priceNum: 39.99, period: "/an",   desc: "Économisez 20%",   highlight: true  },
];

const FEATURES_FREE = [
  "📅 Plan mensuel d'entretien",
  "💧 Calcul d'arrosage de base",
  "✅ Historique limité (5 entrées)",
  "📍 Météo du jour",
];

const FEATURES_PREMIUM = [
  "🤖 Recommandations IA personnalisées",
  "📍 Météo temps réel + alertes",
  "💧 Calcul d'arrosage intelligent",
  "📅 Planning 7 jours adapté météo",
  "✅ Historique illimité",
  "⚠️ Alertes gel, canicule, orages",
  "📱 Installable sur téléphone",
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Consentements pré-paiement (mention 2 avocat) ──────────────────────────
  // DÉCOCHÉS PAR DÉFAUT — l'utilisateur DOIT cocher explicitement
  const [acceptedCgv,         setAcceptedCgv]         = useState(false);
  const [acceptedRetractation, setAcceptedRetractation] = useState(false);

  const selectedPlan = PLANS.find(p => p.id === selected);
  const canSubscribe = acceptedCgv && acceptedRetractation;

  const handleSubscribe = async () => {
    if (!canSubscribe) {
      setError("Vous devez accepter les CGV et renoncer au droit de rétractation pour souscrire.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan:  selected,
          email: user?.primaryEmailAddress?.emailAddress,
          // Traces des consentements pour conformité légale (récupérables côté serveur si besoin)
          cgv_accepted_at:           new Date().toISOString(),
          retractation_waived_at:    new Date().toISOString(),
          cgv_version:               "1.0",
        }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const { url, error: apiError } = await res.json();
      if (apiError) throw new Error(apiError);
      if (url) window.location.href = url;
      else throw new Error("URL de paiement manquante");
    } catch (e) {
      setError("Erreur : " + e.message + ". Vérifiez la configuration Stripe.");
    }
    setLoading(false);
  };

  return (
    <div style={{ ...appShell, fontFamily:"'Nunito','Segoe UI',sans-serif", padding:"48px 20px 40px", overflowY:"auto" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <img src="/mg360-mascot-transparent.png" alt="Mongazon360" style={{ width:72, height:72, objectFit:"contain", marginBottom:4 }} />
        <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7", marginTop:8 }}>
          Choisissez votre accès
        </div>
        <div style={{ fontSize:11, color:"#81c784", marginTop:4 }}>
          Mongazon360<sup style={{ fontSize:7 }}>™</sup>
        </div>
      </div>

      {/* ── Comparaison Free / Premium ──────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
        {/* Free */}
        <div style={{ ...card(), border:"1px solid rgba(165,214,167,0.15)" }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#81c784", marginBottom:10 }}>🆓 Gratuit</div>
          {FEATURES_FREE.map(f => (
            <div key={f} style={{ fontSize:11, color:"#e8f5e9", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{f}</div>
          ))}
          <button onClick={() => navigate("/")} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"10px", color:"#e8f5e9", cursor:"pointer", fontSize:12, fontWeight:700, width:"100%", marginTop:12 }}>
            Continuer gratuit
          </button>
        </div>

        {/* Premium */}
        <div style={{ ...card(), border:"1px solid rgba(76,175,80,0.4)", background:"rgba(76,175,80,0.1)" }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#a5d6a7", marginBottom:10 }}>⭐ Premium</div>
          {FEATURES_PREMIUM.map(f => (
            <div key={f} style={{ fontSize:11, color:"#e8f5e9", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{f}</div>
          ))}
        </div>
      </div>

      {/* ── Sélecteur de plan ──────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {PLANS.map(p => (
          <button key={p.id} onClick={() => setSelected(p.id)} style={{
            flex:1, background: selected===p.id ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.05)",
            border:`2px solid ${selected===p.id ? "#43a047" : "rgba(255,255,255,0.1)"}`,
            borderRadius:16, padding:"14px 8px", cursor:"pointer", color:"#e8f5e9", textAlign:"center", position:"relative",
          }}>
            {p.highlight && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"#43a047", borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>⭐ Populaire</div>}
            <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>{p.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>{p.price}</div>
            <div style={{ fontSize:11, color:"#81c784" }}>{p.period}</div>
            <div style={{ fontSize:11, color:"#43a047", marginTop:4, fontWeight:600 }}>{p.desc}</div>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MENTIONS LÉGALES OBLIGATOIRES (mention 2 avocat) — AVANT STRIPE      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...card(), background:"rgba(33,150,243,0.06)", border:"1px solid rgba(33,150,243,0.25)", marginBottom:16, padding:16 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#90caf9", letterSpacing:0.8, marginBottom:10, textTransform:"uppercase" }}>
          ⚖️ Avant de souscrire
        </div>

        {/* Récap de la commande */}
        <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"10px 12px", marginBottom:14, fontSize:12, color:"#e8f5e9" }}>
          Vous allez souscrire à <strong style={{ color:"#a5d6a7" }}>Mongazon360<sup style={{ fontSize:7 }}>™</sup> Premium {selectedPlan.label}</strong> au prix de <strong style={{ color:"#a5d6a7" }}>{selectedPlan.price}{selectedPlan.period}</strong>.
          {selected === "monthly" ? " Renouvellement automatique chaque mois." : " Renouvellement automatique chaque année."} Résiliable à tout moment.
        </div>

        {/* ── Case 1 : CGV ────────────────────────────────────────────────── */}
        <div style={{ background: acceptedCgv ? "rgba(76,175,80,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${acceptedCgv ? "#43a047" : "rgba(255,255,255,0.1)"}`, borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
          <label style={{ display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={acceptedCgv} onChange={() => setAcceptedCgv(p => !p)}
              style={{ marginTop:3, width:16, height:16, cursor:"pointer", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>
                📋 J'accepte les CGV <span style={{ color:"#ef9a9a" }}>*</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:3, lineHeight:1.5 }}>
                J'ai lu et j'accepte les{" "}
                <span onClick={(e) => { e.preventDefault(); navigate("/cgv"); }} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
                  Conditions Générales de Vente
                </span>{" "}de Mongazon360<sup style={{ fontSize:7 }}>™</sup>.
              </div>
            </div>
          </label>
        </div>

        {/* ── Case 2 : Renonciation droit de rétractation (mention 2 AVOCAT) ── */}
        <div style={{ background: acceptedRetractation ? "rgba(76,175,80,0.08)" : "rgba(245,158,11,0.05)", border: `1px solid ${acceptedRetractation ? "#43a047" : "rgba(245,158,11,0.3)"}`, borderRadius:10, padding:"10px 12px" }}>
          <label style={{ display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={acceptedRetractation} onChange={() => setAcceptedRetractation(p => !p)}
              style={{ marginTop:3, width:16, height:16, cursor:"pointer", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>
                ⚖️ Je renonce au droit de rétractation de 14 jours <span style={{ color:"#ef9a9a" }}>*</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:3, lineHeight:1.5 }}>
                Je demande expressément la fourniture immédiate de Mongazon360<sup style={{ fontSize:7 }}>™</sup> Premium dès le paiement, et reconnais que cette demande entraîne la <strong style={{ color:"#fbbf24" }}>perte de mon droit de rétractation de 14 jours</strong> prévu à l'article L.221-28 du Code de la consommation.
                <br/><br/>
                <span style={{ color:"#81c784", fontStyle:"italic" }}>
                  Sans cette renonciation, l'abonnement ne peut pas démarrer immédiatement.
                </span>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* ── Erreur affichée ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{ background:"rgba(211,47,47,0.2)", border:"1px solid rgba(229,57,53,0.4)", borderRadius:12, padding:"12px 16px", marginBottom:12, fontSize:12, color:"#ef9a9a" }}>
          {error}
        </div>
      )}

      {/* ── Bouton de souscription (désactivé tant que cases pas cochées) ──── */}
      <button
        onClick={handleSubscribe}
        disabled={loading || !canSubscribe}
        style={{
          ...btn.primary,
          opacity: (loading || !canSubscribe) ? 0.5 : 1,
          cursor: (loading || !canSubscribe) ? "not-allowed" : "pointer",
        }}
      >
        {loading
          ? "⌛ Redirection vers Stripe..."
          : !canSubscribe
            ? "🔒 Acceptez les conditions ci-dessus"
            : `💳 S'abonner — ${selectedPlan.price}${selectedPlan.period}`
        }
      </button>

      {/* ── Mentions de paiement ────────────────────────────────────────────── */}
      <div style={{ textAlign:"center", fontSize:11, color:"#81c784", marginTop:10, opacity:0.7, lineHeight:1.6 }}>
        🔒 Paiement sécurisé par Stripe<br/>
        Résiliation possible à tout moment depuis vos Paramètres
      </div>

      {/* ── Champ obligatoire ──────────────────────────────────────────────── */}
      <div style={{ textAlign:"center", fontSize:10, color:"#4a7c5c", marginTop:8 }}>
        <span style={{ color:"#ef9a9a" }}>*</span> Champs obligatoires
      </div>

      {/* ── Mention marque déposée EUIPO ───────────────────────────────────── */}
      <div style={{ fontSize:9, color:"#3a5c44", textAlign:"center", marginTop:20, lineHeight:1.6 }}>
        © {new Date().getFullYear()} Mongazon360<sup style={{ fontSize:7 }}>™</sup> — Marque déposée à l'EUIPO
      </div>
    </div>
  );
}
