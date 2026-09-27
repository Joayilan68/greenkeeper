import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";
import { useDiagnostics } from "../lib/useDiagnostics";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { anneeDuBilan, calculerBilan, imageBilan } from "../lib/bilanSaison";
import { euros } from "../lib/depenses";
import { card, scroll } from "../lib/styles";

const LIEN = "https://mongazon360.fr/?utm_source=bilan&utm_medium=partage";

// Toutes les actions notées de l'année (l'historique de l'app n'en garde que 60)
async function actionsDeLAnnee(userId, annee) {
  const lignes = [];
  for (let de = 0; de < 5000; de += 1000) {
    const { data, error } = await supabase.from("histories").select("action")
      .eq("user_id", userId).gte("created_at", `${annee}-01-01`).lt("created_at", `${annee + 1}-01-01`)
      .order("created_at").range(de, de + 999);
    if (error) throw error;
    lignes.push(...data);
    if (data.length < 1000) break;
  }
  return lignes;
}

export default function Bilan() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { user } = useUser();
  const { profile } = useProfile();
  const { diagnostics = [] } = useDiagnostics() || {};
  const { total: greenPoints = 0 } = useGreenPoints();
  const { record: streakRecord = 0 } = useStreak();
  const annee = anneeDuBilan();
  const [actions, setActions] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [partage, setPartage] = useState("");

  useEffect(() => {
    if (!userId) return;
    actionsDeLAnnee(userId, annee).then(setActions).catch(() => setErreur("Impossible de charger tes actions pour le moment."));
  }, [userId, annee]);

  const b = actions && calculerBilan({ annee, actions, diagnostics, profile, greenPoints, streakRecord });
  const prenom = user?.firstName || "";

  const partager = async () => {
    setPartage("");
    const blob = await imageBilan(b, prenom);
    const fichier = new File([blob], `bilan-gazon-${annee}.png`, { type: "image/png" });
    const texte = `Ma saison gazon ${annee} avec Mongazon360 : ${b.lignes.map(l => `${l.n} ${l.label}`).join(", ")} 🌿`;
    try {
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], text: `${texte} ${LIEN}` });
        return;
      }
    } catch (e) { if (e?.name === "AbortError") return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = fichier.name; a.click();
    URL.revokeObjectURL(a.href);
    setPartage("Image enregistrée : publie-la sur tes réseaux avec le lien mongazon360.fr 🌿");
  };

  const tuile = (icone, valeur, label) => (
    <div key={label} style={{ background:"rgba(255,255,255,0.06)", borderRadius:14, padding:"14px 8px", textAlign:"center" }}>
      <div style={{ fontSize:22 }}>{icone}</div>
      <div style={{ fontSize:22, fontWeight:900, color:"#F1F8F2", marginTop:4 }}>{valeur}</div>
      <div style={{ fontSize:11, color:"#81c784" }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>🏆 Ton bilan de saison {annee}</div>
        <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>Tout ce que tu as fait pour ton gazon cette année</div>
      </div>
      <div style={scroll}>
        {erreur && <div style={{ ...card(), color:"#ef9a9a", fontSize:13 }}>{erreur}</div>}
        {!b && !erreur && <div style={{ ...card(), color:"#81c784", fontSize:13 }}>Calcul de ton bilan…</div>}
        {b && (
          <>
            <div style={card()}>
              {b.actions === 0 ? (
                <div style={{ fontSize:13, color:"#a5d6a7", lineHeight:1.6 }}>
                  Aucune action notée en {annee}. Valide tes actions dans « Aujourd'hui » : elles alimentent ton bilan.
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {b.lignes.map(l => tuile(l.icone, l.n, l.label))}
                  {b.scorePhoto && tuile("📸", `${b.scorePhoto.debut} → ${b.scorePhoto.fin}`, "score du diagnostic photo")}
                  {tuile("⭐", b.greenPoints, "GreenPoints")}
                  {b.streakRecord > 1 && tuile("🔥", `${b.streakRecord} j`, "meilleure série")}
                  {b.depenses > 0 && tuile("💰", euros(b.depenses), "dépensés pour le gazon")}
                </div>
              )}
            </div>

            {b.badges.length > 0 && (
              <div style={card()}>
                <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2", marginBottom:8 }}>🏅 Badges gagnés en {annee}</div>
                {b.badges.map(badge => (
                  <div key={badge.id} style={{ fontSize:13, color:"#e8f5e9", padding:"4px 0" }}>{badge.emoji} {badge.nom}</div>
                ))}
              </div>
            )}

            {b.actions > 0 && (
              <div style={{ ...card(), textAlign:"center" }}>
                <button onClick={partager} style={{ background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", border:"none", borderRadius:12, padding:"12px 22px", fontSize:14, fontWeight:800, cursor:"pointer" }}>
                  📤 Partager mon bilan
                </button>
                <div style={{ fontSize:11, color:"#81c784", marginTop:8, lineHeight:1.5 }}>
                  {partage || "Une image de ton bilan, prête pour tes réseaux ou tes proches."}
                </div>
              </div>
            )}

            <div onClick={() => navigate("/")} style={{ textAlign:"center", fontSize:12, color:"#81c784", textDecoration:"underline", cursor:"pointer", margin:"8px 0 24px" }}>
              Retour au tableau de bord
            </div>
          </>
        )}
      </div>
    </div>
  );
}
