import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useProfile } from "../lib/useProfile";
import { isAndroidTWA } from "../lib/platform";
import { planAnnuel, htmlPlanAnnuel, anneePlan, PRIX_PLAN_ANNUEL } from "../lib/planAnnuel";
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

// Plan annuel personnalisé (achat unique, Mon Gazon) : aperçu + achat, puis les 12 mois et leur version PDF
export default function PlanAnnuel() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { profile } = useProfile();
  const [cgv, setCgv] = useState(false);
  const [retractation, setRetractation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const annee = anneePlan();
  const achete = (user?.publicMetadata?.plansAnnuels || []).includes(annee);
  const retourAchat = params.get("achat") === "ok";

  // Retour de Stripe : l'achat est enregistré par le webhook quelques secondes après le paiement
  useEffect(() => {
    if (!retourAchat || achete || !user) return;
    const t = setInterval(() => user.reload(), 3000);
    return () => clearInterval(t);
  }, [retourAchat, achete, user]);

  if (!profile) return null;
  const plan = planAnnuel(profile, annee);

  const acheter = async () => {
    setErreur(""); setEnvoi(true);
    try {
      const r = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${await getToken()}` },
        body: JSON.stringify({ plan: "plan_annuel", email: user?.primaryEmailAddress?.emailAddress }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || "Paiement indisponible");
      window.location.href = d.url;
    } catch (e) { setErreur(e.message); setEnvoi(false); }
  };

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

        {achete ? (
          <>
            <div style={card()}>
              <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.6, marginBottom:10 }}>
                Ton plan suit ton profil (zone, sol, type de gazon, équipement). Les dates sont indicatives : chaque jour, « Aujourd'hui » les ajuste à la météo.
              </div>
              <button onClick={pdf} style={bouton}>📄 Enregistrer en PDF / imprimer</button>
            </div>
            {plan.mois.map(m => <Mois key={m.num} m={m} />)}
          </>
        ) : retourAchat ? (
          <div style={{ ...card(), color:"#a5d6a7", fontSize:13 }}>✅ Paiement reçu, ton plan arrive dans quelques secondes…</div>
        ) : (
          <>
            <div style={card()}>
              <div style={{ fontSize:13, color:"#e8f5e9", lineHeight:1.7 }}>
                Toute l'année d'entretien de <strong>ton</strong> gazon, mois par mois : tontes et hauteurs, arrosage selon ton sol, engrais, scarification ou aération, regarnissage dans les fenêtres de ta zone, travaux d'hiver. À garder en PDF ou à imprimer, idéal aussi à offrir.
              </div>
            </div>
            <div style={{ fontSize:11, color:"#81c784", margin:"0 4px 6px" }}>Aperçu : le mois de {apercu.nom}</div>
            <Mois m={apercu} />

            {isAndroidTWA() ? (
              <div style={{ ...card(), fontSize:13, color:"#c8e6c9", lineHeight:1.6, textAlign:"center" }}>
                L'achat du plan annuel se fait depuis notre site <strong style={{ color:"#a5d6a7" }}>mongazon360.fr</strong>, dans ton navigateur.
              </div>
            ) : (
              <div style={card()}>
                <div style={{ fontSize:18, fontWeight:900, color:"#F1F8F2", textAlign:"center", marginBottom:10 }}>{PRIX_PLAN_ANNUEL} <span style={{ fontSize:12, fontWeight:400, color:"#81c784" }}>achat unique</span></div>
                <label style={{ display:"flex", gap:8, fontSize:11, color:"#c8e6c9", lineHeight:1.5, marginBottom:8 }}>
                  <input type="checkbox" checked={cgv} onChange={() => setCgv(v => !v)} />
                  <span>J'accepte les <a href="/cgv" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7" }}>conditions générales de vente</a>.</span>
                </label>
                <label style={{ display:"flex", gap:8, fontSize:11, color:"#c8e6c9", lineHeight:1.5, marginBottom:12 }}>
                  <input type="checkbox" checked={retractation} onChange={() => setRetractation(v => !v)} />
                  <span>Je demande la fourniture immédiate du plan dès le paiement et reconnais perdre mon droit de rétractation de 14 jours (article L.221-28 du Code de la consommation).</span>
                </label>
                <button onClick={acheter} disabled={!cgv || !retractation || envoi} style={{ ...bouton, opacity: cgv && retractation && !envoi ? 1 : 0.5 }}>
                  {envoi ? "Ouverture du paiement…" : `Obtenir mon plan ${annee}`}
                </button>
                <div style={{ fontSize:10, color:"#4a7c5c", textAlign:"center", marginTop:8 }}>Paiement sécurisé par Stripe · plan envoyé aussi par email</div>
              </div>
            )}
          </>
        )}

        <div onClick={() => navigate("/my-lawn")} style={{ textAlign:"center", fontSize:12, color:"#81c784", textDecoration:"underline", cursor:"pointer", margin:"8px 0 24px" }}>
          Retour à Mon Gazon
        </div>
      </div>
    </div>
  );
}
