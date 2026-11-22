// src/components/CarteNouveautes.jsx
// Accueil : carte « Nouveautés » de la mise en prod du 22/11/2026 (conseils dans l'app, partages en image, « Besoin d'un
// pro ? » ; ligne des CGU et de la politique de confidentialité mises à jour le 10/11 : demande de Jordan du 10/11),
// montrée aux comptes créés avant cette mise en prod, jusqu'à ce qu'ils la ferment (sur cet appareil) et au plus 30 jours.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { card } from "../lib/styles";

const MISE_EN_PROD = "2026-11-22";
const CLE = "mg360_nouveautes_2211_vues";
const LIGNES = [
  "📖 Les conseils se lisent dans l'app : « Le conseil de la semaine » sur l'accueil et « Lire l'article » sous tes actions du jour",
  "📤 Partage ton score et ton résultat du quiz en image : Mon gazon → Partager, et l'onglet Quiz",
  "🧑‍🌾 Besoin d'un pro ? Sous le résultat d'un diagnostic, inscris-toi pour être prévenu de l'ouverture de « Trouver un pro » au printemps",
];

const lien = { background:"none", border:"none", padding:0, color:"#90caf9", textDecoration:"underline", font:"inherit", cursor:"pointer" };

export default function CarteNouveautes() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [vue, setVue] = useState(() => { try { return !!localStorage.getItem(CLE); } catch { return false; } });
  const prod = Date.parse(MISE_EN_PROD);
  const ancienCompte = user?.createdAt && new Date(user.createdAt).getTime() < prod;
  if (vue || !ancienCompte || Date.now() > prod + 30 * 86400000) return null;

  const fermer = () => { setVue(true); try { localStorage.setItem(CLE, "1"); } catch { /* navigation privée */ } };

  return (
    <div data-tuile="accueil-nouveautes" style={{ ...card(), background:"linear-gradient(135deg,rgba(66,165,245,0.18),rgba(13,43,26,0.85))", border:"1px solid rgba(144,202,249,0.45)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#e3f2fd" }}>🆕 Nouveautés</div>
        <button onClick={fermer} aria-label="Fermer" style={{ background:"none", border:"none", color:"#90caf9", fontSize:16, cursor:"pointer", padding:0 }}>✕</button>
      </div>
      {LIGNES.map(l => <div key={l} style={{ fontSize:12.5, color:"#e8f5e9", lineHeight:1.5, padding:"3px 0" }}>{l}</div>)}
      <div style={{ fontSize:12.5, color:"#e8f5e9", lineHeight:1.5, padding:"3px 0" }}>
        📜 Nos <button onClick={() => navigate("/cgu")} style={lien}>CGU</button> et notre{" "}
        <button onClick={() => navigate("/confidentialite")} style={lien}>politique de confidentialité</button> ont été mises à jour le
        10 novembre : règles des GreenPoints et conservation de l'historique des messages
      </div>
      <button onClick={fermer} style={{ width:"100%", marginTop:10, background:"rgba(255,255,255,0.08)", color:"#e8f5e9", fontWeight:800, border:"1px solid rgba(144,202,249,0.35)", borderRadius:10, cursor:"pointer", padding:"10px", fontSize:12.5 }}>
        J'ai compris
      </button>
    </div>
  );
}
