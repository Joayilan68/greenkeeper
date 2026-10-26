import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useProfile } from "../lib/useProfile";
import { isAndroidTWA } from "../lib/platform";
import { useSubscription } from "../lib/useSubscription";
import { planAnnuel, htmlPlanAnnuel, anneePlan } from "../lib/planAnnuel";
import { card, scroll } from "../lib/styles";

const bouton = { width:"100%", background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", border:"none", borderRadius:12, padding:"12px 16px", fontSize:14, fontWeight:800, cursor:"pointer" };

function Mois({ m }) {
  return (
    <div style={card()}>
      <div style={{ fontSize:15, fontWeight:800, color:"#F1F8F2", textTransform:"capitalize", marginBottom:6 }}>{m.nom}</div>
      {m.items.map((i, k) => (
        <div key={k} style={{ display:"flex", gap:8, padding:"6px 0", borderTop: k ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
          <span style={{ fontSize:16 }}>{i.icone}</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>{i.titre}</div>
            <div style={{ fontSize:11, color:"#81c784", lineHeight:1.5 }}>{i.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Plan annuel personnalisé (Mon gazon), inclus dans Premium (décision de Jordan du 26/10/2026) : les 12 mois et leur
// version PDF pour un compte Premium ou un plan acheté à l'unité quand cette vente existait ; sinon un aperçu.
export default function PlanAnnuel() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { profile } = useProfile();
  const { isPaid = false } = useSubscription() || {};
  const [erreur, setErreur] = useState("");
  const annee = anneePlan();
  const acces = isPaid || (user?.publicMetadata?.plansAnnuels || []).includes(annee);

  if (!profile) return null;
  const plan = planAnnuel(profile, annee);

  const pdf = () => {
    const w = window.open("", "_blank");
    if (!w) return setErreur("Autorise l'ouverture de fenêtres pour enregistrer le PDF.");
    w.document.write(htmlPlanAnnuel(plan, user?.firstName));
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const apercu = plan.mois[new Date().getMonth()];

  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>📅 Mon plan gazon {annee}</div>
        <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>Zone {plan.zone}{plan.surface ? ` · ${plan.surface} m²` : ""} · les 12 mois de ton gazon</div>
      </div>
      <div style={scroll}>
        {erreur && <div style={{ ...card(), color:"#ef9a9a", fontSize:12 }}>⚠️ {erreur}</div>}

        {acces ? (
          <>
            <div style={card()}>
              <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.6, marginBottom:10 }}>
                Ton plan suit ton profil (zone, sol, type de gazon, équipement). Les dates sont indicatives : chaque jour, « Aujourd'hui » les ajuste à la météo.
              </div>
              <button onClick={pdf} style={bouton}>📄 Enregistrer en PDF / imprimer</button>
            </div>
            {plan.mois.map(m => <Mois key={m.num} m={m} />)}
          </>
        ) : (
          <>
            <div style={card()}>
              <div style={{ fontSize:13, color:"#e8f5e9", lineHeight:1.7 }}>
                Toute l'année d'entretien de <strong>ton</strong> gazon, mois par mois : tontes et hauteurs, arrosage selon ton sol, engrais, scarification ou aération, regarnissage dans les fenêtres de ta zone, travaux d'hiver. À garder en PDF ou à imprimer.
              </div>
            </div>
            <div style={{ fontSize:11, color:"#81c784", margin:"0 4px 6px" }}>Aperçu : le mois de {apercu.nom}</div>
            <Mois m={apercu} />
            <div style={{ ...card(), textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#ffe082", marginBottom:6 }}>⭐ Inclus dans Premium</div>
              <div style={{ fontSize:12, color:"#c8e6c9", lineHeight:1.6, marginBottom: isAndroidTWA() ? 0 : 12 }}>
                Les 12 mois de ton plan, et leur version PDF, font partie de Premium.
              </div>
              {!isAndroidTWA() && <button onClick={() => navigate("/subscribe")} style={bouton}>Découvrir Premium</button>}
            </div>
          </>
        )}

        <div onClick={() => navigate("/my-lawn")} style={{ textAlign:"center", fontSize:12, color:"#81c784", textDecoration:"underline", cursor:"pointer", margin:"8px 0 24px" }}>
          Retour à Mon gazon
        </div>
      </div>
    </div>
  );
}
