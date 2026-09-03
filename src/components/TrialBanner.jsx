// src/components/TrialBanner.jsx
// Bannière d'essai Premium : compte à rebours pendant les 7 jours + relance
// « Garder mon Premium » à la fin. Affichée en haut de toutes les pages (Layout).
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";

export default function TrialBanner() {
  const { isTrial, trialDaysLeft, trialEnded, isAdmin } = useSubscription();
  const navigate = useNavigate();

  if (isAdmin) return null;

  // ── Pendant l'essai : compte à rebours + CTA garder Premium ──────────────
  if (isTrial) {
    const j = trialDaysLeft;
    const urgent = j <= 2;
    return (
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
        padding:"10px 14px",
        background: urgent
          ? "linear-gradient(135deg,#E65100,#F57C00)"
          : "linear-gradient(135deg,#43A047,#2E7D32)",
        color:"#fff",
      }}>
        <div style={{ display:"flex", flexDirection:"column", lineHeight:1.25 }}>
          <span style={{ fontSize:13, fontWeight:800 }}>
            ⭐ Premium offert — {j} jour{j > 1 ? "s" : ""} restant{j > 1 ? "s" : ""}
          </span>
          <span style={{ fontSize:11, opacity:0.9 }}>
            {urgent ? "Ne perds pas ton accès complet" : "Diagnostic, arrosage précis & Bob inclus"}
          </span>
        </div>
        <button
          onClick={() => navigate("/subscribe")}
          style={{
            flexShrink:0, background:"#fff", color:"#1b5e20", border:"none",
            borderRadius:10, padding:"8px 14px", fontSize:12.5, fontWeight:800,
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
          }}>
          Garder mon Premium
        </button>
      </div>
    );
  }

  // ── Après l'essai (compte redevenu gratuit) : relance abonnement ─────────
  if (trialEnded) {
    return (
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
        padding:"10px 14px",
        background:"rgba(249,168,37,0.14)",
        borderBottom:"1px solid rgba(249,168,37,0.35)",
        color:"#F1F8F2",
      }}>
        <div style={{ display:"flex", flexDirection:"column", lineHeight:1.25 }}>
          <span style={{ fontSize:13, fontWeight:800, color:"#f9a825" }}>
            Ton essai Premium est terminé
          </span>
          <span style={{ fontSize:11, color:"#81c784" }}>
            Repasse Premium pour retrouver le diagnostic de Bob
          </span>
        </div>
        <button
          onClick={() => navigate("/subscribe")}
          style={{
            flexShrink:0, background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff",
            border:"none", borderRadius:10, padding:"8px 14px", fontSize:12.5, fontWeight:800,
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
          }}>
          Repasser Premium
        </button>
      </div>
    );
  }

  return null;
}
