// src/components/CarteNouveautes.jsx
// Accueil : carte « Nouveautés » de la refonte (décision de Jordan du 26/10/2026), montrée aux comptes créés avant la
// nouvelle version, jusqu'à ce qu'ils la ferment (sur cet appareil) et au plus 45 jours après la mise en prod.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { OFFRE, offreEnCours, enEuros } from "../lib/offreSaison";
import { isAndroidTWA } from "../lib/platform";
import { card } from "../lib/styles";

// Jour de la mise en prod de la refonte (décision de Jordan du 28/10/2026)
const MISE_EN_PROD = "2026-10-31";
const CLE = "mg360_nouveautes_refonte_vues";

export default function CarteNouveautes({ isPaid }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [vue, setVue] = useState(() => { try { return !!localStorage.getItem(CLE); } catch { return false; } });
  const prod = Date.parse(MISE_EN_PROD);
  const ancienCompte = user?.createdAt && new Date(user.createdAt).getTime() < prod;
  if (vue || !ancienCompte || Date.now() > prod + 45 * 86400000) return null;

  const fermer = () => { setVue(true); try { localStorage.setItem(CLE, "1"); } catch { /* navigation privée */ } };
  const offre = offreEnCours();
  const lignes = [
    "📅 Ton accueil résume ta journée : actions du jour, série et GreenPoints",
    "🧭 4 onglets : Accueil, Aujourd'hui, Diagnostic, Mon gazon, et Quiz pendant la ligue d'hiver",
    "🏅 Classement, badges et historique de tes actions : dans Mon gazon",
    isPaid
      ? "⭐ Ton plan annuel est maintenant inclus dans Premium : Mon gazon → Mon plan gazon"
      : `⭐ Gratuit ou Premium : tout est expliqué dans « Choisir son niveau ». Premium à ${enEuros(OFFRE.prixMensuel)} par mois ou ${enEuros(OFFRE.prixAnnuel)} par an, plan annuel inclus${offre ? ` ; offre ${offre.nom === "hiver" ? "d'hiver" : "d'été"} : ${enEuros(OFFRE.prixOffre)} la 1re année, jusqu'au ${offre.finLabel}` : ""}`,
  ];

  return (
    <div data-tuile="accueil-nouveautes" style={{ ...card(), background:"linear-gradient(135deg,rgba(66,165,245,0.18),rgba(13,43,26,0.85))", border:"1px solid rgba(144,202,249,0.45)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#e3f2fd" }}>🆕 Mongazon360 fait peau neuve</div>
        <button onClick={fermer} aria-label="Fermer" style={{ background:"none", border:"none", color:"#90caf9", fontSize:16, cursor:"pointer", padding:0 }}>✕</button>
      </div>
      {lignes.map(l => <div key={l} style={{ fontSize:12.5, color:"#e8f5e9", lineHeight:1.5, padding:"3px 0" }}>{l}</div>)}
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        {!isPaid && !isAndroidTWA() && (
          <button onClick={() => { fermer(); navigate("/subscribe"); }} style={{ flex:1, background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:900, border:"none", borderRadius:10, cursor:"pointer", padding:"10px", fontSize:12.5 }}>
            Voir les niveaux
          </button>
        )}
        <button onClick={fermer} style={{ flex:1, background:"rgba(255,255,255,0.08)", color:"#e8f5e9", fontWeight:800, border:"1px solid rgba(144,202,249,0.35)", borderRadius:10, cursor:"pointer", padding:"10px", fontSize:12.5 }}>
          J'ai compris
        </button>
      </div>
    </div>
  );
}
