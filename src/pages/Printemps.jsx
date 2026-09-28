import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useSubscription } from "../lib/useSubscription";
import { trackAmazonClick } from "../lib/useAmazonProducts";
import { getBudgetTier } from "../lib/selectionProduits";
import { planPrintemps, faitsPlan, marquerPlan } from "../lib/printemps";
import { ajouterAchat, retirerAchat, totalAnnee, plafondBudget, euros } from "../lib/depenses";
import { card, scroll } from "../lib/styles";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const quand = (e) => e.date
  ? `vers le ${e.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
  : e.mois.length > 1 ? `${MOIS[e.mois[0] - 1]}-${MOIS[e.mois[e.mois.length - 1] - 1]}` : `en ${MOIS[e.mois[0] - 1]}`;

// Plan de printemps : calendrier de la zone et liste d'achats (liens partenaires Amazon), du tableau de bord
// (compte à rebours), de l'onglet Produits en hiver et de la notification de fin d'hiver
export default function Printemps() {
  const navigate = useNavigate();
  const { isPaid } = useSubscription();
  const { profile, saveProfile } = useProfile();
  if (!profile) return null;

  const tier = isPaid ? getBudgetTier(profile.budget) : "standard";
  const plan = planPrintemps(profile, tier);
  const faits = faitsPlan(profile, plan.annee);
  const aAcheter = plan.achats.filter(a => !faits[a.cle]);
  const reste = Math.round(aAcheter.reduce((t, a) => t + a.prix, 0) * 100) / 100;
  const plafond = plafondBudget(profile);
  const budgetRestant = plafond === null ? null
    : plan.annee === new Date().getFullYear() ? Math.max(0, plafond - totalAnnee(profile)) : plafond;

  const acheter = (a) => {
    const p = ajouterAchat(profile, {
      label: `${a.label} · ${a.produit.label}${a.quantite > 1 ? ` ×${a.quantite}` : ""}`, prix: a.prix, cle: a.cle, kit: `printemps-${plan.annee}`,
    });
    saveProfile(marquerPlan(p, plan.annee, a.cle, { statut: "achete", achat: p.achats[p.achats.length - 1].id }));
  };
  const annuler = (a) => {
    const p = faits[a.cle]?.achat ? retirerAchat(profile, faits[a.cle].achat) : profile;
    saveProfile(marquerPlan(p, plan.annee, a.cle, null));
  };

  const lien = { background:"none", border:"none", padding:0, color:"#a5d6a7", fontSize:11, cursor:"pointer", textDecoration:"underline" };

  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>🌱 Mon plan de printemps {plan.annee}</div>
        <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>Zone {plan.zone} · {plan.surface} m²</div>
      </div>
      <div style={scroll}>
        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:4 }}>📅 Le calendrier</div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:8, lineHeight:1.5 }}>
            Dates indicatives de ta zone : le jour venu, « Aujourd'hui » te dit si la météo s'y prête.
          </div>
          {plan.etapes.map(e => (
            <div key={e.cle} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.06)", opacity: e.passee ? 0.45 : 1 }}>
              <span style={{ fontSize:18 }}>{e.icone}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>{e.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#a5d6a7", whiteSpace:"nowrap" }}>{quand(e)}</span>
                </div>
                <div style={{ fontSize:11, color:"#81c784", lineHeight:1.5, marginTop:2 }}>{e.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:4 }}>🛒 Ma liste d'achats</div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:6, lineHeight:1.5 }}>
            Quantités pour {plan.surface} m², gamme selon {isPaid ? "ton budget" : "le catalogue standard"}. Coche ce que tu as déjà : la liste et le budget s'ajustent.
          </div>
          <div style={{ fontSize:10, color:"#fde68a", marginBottom:6, lineHeight:1.5 }}>
            Liens partenaires Amazon : Mongazon360<sup style={{ fontSize:7 }}>®</sup> perçoit une commission sur les achats éligibles, sans surcoût pour toi. Prix indicatifs, le prix réel est celui d'Amazon.
          </div>
          {plan.achats.map(a => {
            const fait = faits[a.cle];
            return (
              <div key={a.cle} style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, opacity: fait ? 0.5 : 1 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9", textDecoration: fait ? "line-through" : "none" }}>
                      {a.label}{a.quantite > 1 ? ` ×${a.quantite}` : ""}{a.optionnel ? <span style={{ fontWeight:400, color:"#81c784" }}> · {a.optionnel}</span> : null}
                    </div>
                    <div style={{ fontSize:11, color:"#81c784", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.produit.label}</div>
                    {a.zones && <div style={{ fontSize:10, color:"#66BB6A" }}>Pour les zones abîmées (~30 % de la pelouse)</div>}
                    {a.phyto && <div style={{ fontSize:10, color:"#ef9a9a" }}>Lire l'étiquette et respecter les doses (gamme jardin EAJ)</div>}
                  </div>
                  <span style={{ fontSize:12, color:"#a5d6a7", fontWeight:700, whiteSpace:"nowrap" }}>~{euros(a.prix)}</span>
                  {!fait && (
                    <button onClick={() => { trackAmazonClick(a.cle, null, 0); window.open(a.produit.url, "_blank", "noopener,noreferrer"); }}
                      style={{ background:"#FF9900", border:"none", borderRadius:8, padding:"7px 10px", color:"#111", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      🛒 Amazon
                    </button>
                  )}
                </div>
                <div style={{ display:"flex", gap:14, marginTop:6 }}>
                  {fait ? (
                    <>
                      <span style={{ fontSize:11, color:"#66BB6A", fontWeight:700 }}>
                        {fait.statut === "achete" ? "✓ Acheté, noté dans tes dépenses" : a.optionnel ? "✓ Pas besoin ou déjà là" : "✓ Tu en as déjà"}
                      </span>
                      <button onClick={() => annuler(a)} style={lien}>Annuler</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => acheter(a)} style={lien}>✓ Je l'ai acheté</button>
                      <button onClick={() => saveProfile(marquerPlan(profile, plan.annee, a.cle, { statut: "deja" }))} style={lien}>
                        {a.optionnel ? "Pas besoin / j'en ai déjà" : "J'en ai déjà"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:10, fontSize:13, fontWeight:800, color:"#F1F8F2" }}>
            {aAcheter.length ? `Reste à acheter ~${euros(reste)}` : "✅ Tout est prêt pour le printemps"}
          </div>
          {budgetRestant !== null && (
            <div style={{ fontSize:11, color: reste > budgetRestant ? "#f9a825" : "#81c784", marginTop:4, lineHeight:1.5 }}>
              {plan.annee === new Date().getFullYear() ? `Budget restant cette année : ${euros(budgetRestant)}.` : `Ton budget ${plan.annee} : ${euros(plafond)}.`}
              {reste > budgetRestant && aAcheter.length ? " La liste le dépasse : l'essentiel d'abord (engrais, semences), le matériel peut attendre ou s'emprunter." : ""}
            </div>
          )}
        </div>

        <div onClick={() => navigate("/")} style={{ textAlign:"center", fontSize:12, color:"#81c784", textDecoration:"underline", cursor:"pointer", margin:"8px 0 24px" }}>
          Retour au tableau de bord
        </div>
      </div>
    </div>
  );
}
