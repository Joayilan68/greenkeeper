import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { card } from "../lib/styles";
import { achatsAnnee, totalAnnee, plafondBudget, euros, ajouterAchat, retirerAchat } from "../lib/depenses";

// Onglet Produits : dépenses gazon de l'année déclarées par l'utilisateur, comparées à son budget
export default function BudgetDepenses({ profile, saveProfile }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(false);
  const [label, setLabel]   = useState("");
  const [prix, setPrix]     = useState("");

  const achats   = achatsAnnee(profile);
  const total    = totalAnnee(profile);
  const plafond  = plafondBudget(profile);
  const ratio    = plafond ? total / plafond : 0;
  const couleur  = ratio > 1 ? "#ef5350" : ratio >= 0.8 ? "#f9a825" : "#43a047";
  const annee    = new Date().getFullYear();
  const prixOk   = Number(prix.replace(",", ".")) > 0;

  const ajouter = () => {
    if (!label.trim() || !prixOk) return;
    saveProfile(ajouterAchat(profile, { label, prix: Number(prix.replace(",", ".")) }));
    setLabel(""); setPrix("");
  };

  const champ = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"8px 10px", color:"#e8f5e9", fontSize:12, minWidth:0 };

  return (
    <div style={card()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2" }}>💰 Mes dépenses {annee}</div>
        <div style={{ fontSize:13, fontWeight:800, color:couleur }}>
          {euros(total)}{plafond ? ` / ${euros(plafond)}` : ""}
        </div>
      </div>

      {plafond ? (
        <>
          <div style={{ height:8, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden" }}>
            <div style={{ width:`${Math.min(100, ratio * 100)}%`, height:"100%", background:couleur, borderRadius:6, transition:"width 0.4s" }} />
          </div>
          <div style={{ fontSize:11, color:"#81c784", marginTop:6 }}>
            {ratio > 1 ? `Budget dépassé de ${euros(total - plafond)}` : `Il vous reste ${euros(plafond - total)} sur votre budget annuel`}
          </div>
        </>
      ) : (
        <div style={{ fontSize:11, color:"#81c784" }}>
          {profile?.budget === "600+" ? "Budget déclaré : plus de 600 € par an." : (
            <>Indiquez votre budget annuel pour suivre vos dépenses.{" "}
              <span onClick={() => navigate("/setup")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>Compléter mon profil</span></>
          )}
        </div>
      )}

      <div style={{ display:"flex", gap:6, marginTop:12 }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Achat (engrais, semences…)" maxLength={80} style={{ ...champ, flex:2 }} />
        <input value={prix} onChange={e => setPrix(e.target.value)} placeholder="Prix €" inputMode="decimal" style={{ ...champ, flex:1, width:0 }} />
        <button onClick={ajouter} disabled={!label.trim() || !prixOk} style={{ background: label.trim() && prixOk ? "#43a047" : "rgba(255,255,255,0.08)", border:"none", borderRadius:8, padding:"0 12px", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer" }}>+</button>
      </div>
      <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
        Notez vos achats gazon, ici comme en jardinerie, ou avec « Je l'ai acheté » sous chaque produit. Le compteur repart de zéro le 1er janvier.
      </div>

      {achats.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div onClick={() => setDetail(d => !d)} style={{ fontSize:12, color:"#a5d6a7", cursor:"pointer", fontWeight:700 }}>
            {detail ? "▾" : "▸"} {achats.length} achat{achats.length > 1 ? "s" : ""} noté{achats.length > 1 ? "s" : ""}
          </div>
          {detail && [...achats].reverse().map(a => (
            <div key={a.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color:"#81c784", fontSize:11, flexShrink:0 }}>{a.date.slice(8, 10)}/{a.date.slice(5, 7)}</span>
              <span style={{ flex:1, color:"#e8f5e9", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.label}</span>
              <span style={{ color:"#a5d6a7", fontWeight:700 }}>{euros(a.prix)}</span>
              <button onClick={() => saveProfile(retirerAchat(profile, a.id))} aria-label={`Retirer ${a.label}`} style={{ background:"none", border:"none", color:"#ef9a9a", cursor:"pointer", fontSize:13, padding:"0 2px" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
