import { useNavigate } from "react-router-dom";
import { useClassement, LIGUES } from "../lib/useClassement";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { useSaison } from "../lib/useSaison";

// Styles inline complets — aucune dépendance externe
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0a1f0f 0%, #0d2b1a 100%)",
    color: "#e8f5e9",
    fontFamily: "Arial, sans-serif",
    paddingBottom: 100,
  },
  header: {
    background: "rgba(13,43,26,0.95)",
    borderBottom: "1px solid rgba(165,214,167,0.15)",
    padding: "16px 16px 12px",
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  scroll: {
    padding: "12px 16px",
    overflowY: "auto",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(165,214,167,0.15)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
};

export default function Classement() {
  const navigate = useNavigate();

  // Hooks avec valeurs par défaut sécurisées
  let saisonData = { classementActif: true, label: "Mars", emoji: "🌱", isHivernal: false };
  let classementData = {
    ligueActuelle: LIGUES[0],
    ligues: LIGUES,
    classement: [],
    position: 1,
    totalJoueurs: 30,
    pointsSemaine: 0,
    pointsSaison: 0,
    enZonePromotion: false,
    enZoneRetrogradation: false,
    joursRestants: 4,
    messageClassement: "Continue à enregistrer tes actions !",
    historiqueLigues: [],
    meilleurClassement: null,
    classementSauvegarde: null,
  };
  let gpData = { total: 0, palier: { icone: "🌱", label: "Semis", couleur: "#81c784" } };
  let streakData = { actuel: 0, modeHiver: false };

  try { saisonData    = useSaison(); }    catch(e) { console.error("useSaison:", e); }
  try { classementData = useClassement(); } catch(e) { console.error("useClassement:", e); }
  try { gpData        = useGreenPoints(); } catch(e) { console.error("useGreenPoints:", e); }
  try { streakData    = useStreak(); }    catch(e) { console.error("useStreak:", e); }

  const {
    classementActif, label: saisonLabel, emoji: saisonEmoji,
  } = saisonData;

  const {
    ligueActuelle, classement, position, totalJoueurs,
    pointsSemaine, enZonePromotion, enZoneRetrogradation,
    joursRestants, messageClassement, historiqueLigues,
    classementSauvegarde,
  } = classementData;

  const { total: gpTotal, palier } = gpData;
  const { actuel: streak, modeHiver } = streakData;

  // ── Mode hivernal ──────────────────────────────────────────────────────────
  if (!classementActif) {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <div style={{ fontSize: 11, color: "#81c784", letterSpacing: 2, textTransform: "uppercase" }}>
            🏆 Classement
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#a5d6a7", marginTop: 4 }}>
            Saison terminée
          </div>
        </div>
        <div style={S.scroll}>
          <div style={S.card}>
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❄️</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#a5d6a7", marginBottom: 8 }}>
                Classement en pause
              </div>
              <div style={{ fontSize: 13, color: "#81c784", lineHeight: 1.6 }}>
                Le classement reprend en février.
                Ton streak de {streak} jours est protégé !
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode actif ─────────────────────────────────────────────────────────────
  const zoneBg    = enZonePromotion ? "rgba(76,175,80,0.2)"  : enZoneRetrogradation ? "rgba(230,81,0,0.2)"  : "rgba(255,255,255,0.05)";
  const zoneTxt   = enZonePromotion ? "#a5d6a7"              : enZoneRetrogradation ? "#ef9a9a"             : "#81c784";

  return (
    <div style={S.page}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={{ fontSize: 11, color: "#81c784", letterSpacing: 2, textTransform: "uppercase" }}>
          🏆 Classement
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#a5d6a7", marginTop: 4 }}>
          {ligueActuelle?.icone} Ligue {ligueActuelle?.label}
        </div>
        <div style={{ fontSize: 11, color: "#81c784", marginTop: 2 }}>
          {saisonEmoji} {saisonLabel} · {joursRestants} jour{joursRestants > 1 ? "s" : ""} restant{joursRestants > 1 ? "s" : ""}
        </div>
      </div>

      <div style={S.scroll}>

        {/* ── Ma position ─────────────────────────────────────────────────── */}
        <div style={{ ...S.card, background: "linear-gradient(135deg, rgba(27,94,32,0.5), rgba(13,43,26,0.7))" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ textAlign: "center", minWidth: 64 }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#a5d6a7", lineHeight: 1 }}>
                {position}
              </div>
              <div style={{ fontSize: 11, color: "#81c784" }}>/ {totalJoueurs}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a5d6a7", marginBottom: 8 }}>
                Ta position cette semaine
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { val: pointsSemaine, label: "pts semaine", icone: "🌿" },
                  { val: gpTotal.toLocaleString("fr-FR"), label: "pts total", icone: "⭐" },
                  { val: `${streak}j`, label: "streak", icone: "🔥" },
                ].map(({ val, label, icone }) => (
                  <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 11 }}>{icone}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#e8f5e9" }}>{val}</div>
                    <div style={{ fontSize: 9, color: "#81c784" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zone */}
          <div style={{ padding: "10px 12px", background: zoneBg, borderRadius: 10, color: zoneTxt, fontSize: 12, fontWeight: 500 }}>
            {messageClassement}
            {joursRestants <= 2 && <span style={{ fontWeight: 700, color: "#f9a825" }}> — ⏰ Plus que {joursRestants}j !</span>}
          </div>
        </div>

        {/* ── Info points ─────────────────────────────────────────────────── */}
        {pointsSemaine === 0 && (
          <div style={{ ...S.card, border: "1px solid rgba(249,168,37,0.3)", background: "rgba(249,168,37,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>💡</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f9a825", marginBottom: 4 }}>
                  Gagne des points pour grimper !
                </div>
                <div style={{ fontSize: 12, color: "#81c784", lineHeight: 1.5 }}>
                  Enregistre tes actions dans "Aujourd'hui" pour accumuler des GreenPoints et monter dans le classement.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/today")}
              style={{ marginTop: 12, width: "100%", background: "rgba(249,168,37,0.2)", color: "#f9a825", border: "1px solid rgba(249,168,37,0.3)", borderRadius: 10, padding: "9px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              📅 Aller dans Aujourd'hui →
            </button>
          </div>
        )}

        {/* ── Tableau classement ───────────────────────────────────────────── */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#a5d6a7", marginBottom: 12 }}>
            📊 Classement de la semaine
          </div>

          {classement.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#81c784", fontSize: 13 }}>
              Chargement du classement...
            </div>
          ) : (
            classement.map((joueur, idx) => {
              const rang    = idx + 1;
              const isUser  = joueur.isUser;
              const isTop3  = rang <= 3;
              const medailles = ["🥇", "🥈", "🥉"];
              const taille  = classement.length;
              const top30   = Math.ceil(taille * 0.3);
              const bot30   = Math.floor(taille * 0.7);
              const promo   = rang <= top30;
              const retro   = rang > bot30;

              return (
                <div key={joueur.id} style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          10,
                  padding:      "10px 10px",
                  marginBottom: 4,
                  borderRadius: 10,
                  background:   isUser ? "rgba(76,175,80,0.2)" : isTop3 ? "rgba(249,168,37,0.06)" : "rgba(255,255,255,0.03)",
                  border:       isUser ? "1px solid rgba(76,175,80,0.4)" : "1px solid transparent",
                  position:     "relative",
                }}>
                  {/* Indicateur zone */}
                  {promo && <div style={{ position: "absolute", left: 0, top: "15%", width: 3, height: "70%", background: "#43a047", borderRadius: "0 3px 3px 0" }}/>}
                  {retro && <div style={{ position: "absolute", left: 0, top: "15%", width: 3, height: "70%", background: "#e65100", borderRadius: "0 3px 3px 0" }}/>}

                  {/* Rang */}
                  <div style={{ minWidth: 28, textAlign: "center", fontSize: isTop3 ? 20 : 13, fontWeight: 700, color: "#81c784" }}>
                    {isTop3 ? medailles[rang - 1] : rang}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: isUser ? "linear-gradient(135deg, #43a047, #1b5e20)" : "rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0,
                    border: isUser ? "2px solid #43a047" : "1px solid rgba(255,255,255,0.1)",
                  }}>
                    {isUser ? "🌿" : joueur.prenom?.charAt(0) || "?"}
                  </div>

                  {/* Nom */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: isUser ? 700 : 500, color: isUser ? "#a5d6a7" : "#e8f5e9" }}>
                      {isUser ? "Vous" : joueur.prenom}
                      {isUser && <span style={{ fontSize: 10, color: "#81c784", marginLeft: 6 }}>← toi</span>}
                    </div>
                    {isTop3 && <div style={{ fontSize: 10, color: "#f9a825" }}>{rang === 1 ? "Champion" : rang === 2 ? "Finaliste" : "Podium"}</div>}
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isUser ? "#a5d6a7" : "#e8f5e9" }}>
                      {joueur.score.toLocaleString("fr-FR")}
                    </div>
                    <div style={{ fontSize: 10, color: "#81c784" }}>pts</div>
                  </div>
                </div>
              );
            })
          )}

          {/* Légende */}
          <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 3, height: 14, background: "#43a047", borderRadius: 2 }}/>
              <span style={{ fontSize: 10, color: "#81c784" }}>Zone promotion</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 3, height: 14, background: "#e65100", borderRadius: 2 }}/>
              <span style={{ fontSize: 10, color: "#81c784" }}>Zone rétrogradation</span>
            </div>
          </div>
        </div>

        {/* ── Toutes les ligues ────────────────────────────────────────────── */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#a5d6a7", marginBottom: 12 }}>
            🌿 Toutes les ligues
          </div>
          {LIGUES.map((ligue) => {
            const isActive = ligue.id === ligueActuelle?.id;
            return (
              <div key={ligue.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                background:  isActive ? "rgba(76,175,80,0.15)" : "rgba(255,255,255,0.03)",
                border:      isActive ? "1px solid rgba(76,175,80,0.3)" : "1px solid transparent",
              }}>
                <span style={{ fontSize: 22 }}>{ligue.icone}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isActive ? 700 : 500, color: isActive ? "#a5d6a7" : "#81c784", fontSize: 13 }}>
                    Ligue {ligue.label}
                    {isActive && <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(76,175,80,0.2)", color: "#a5d6a7", borderRadius: 10, padding: "1px 8px" }}>Ta ligue</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a7c5c" }}>{ligue.description}</div>
                </div>
                <div style={{ fontSize: 11, color: "#4a7c5c" }}>{ligue.taille} joueurs</div>
              </div>
            );
          })}
        </div>

        {/* ── Historique ───────────────────────────────────────────────────── */}
        {historiqueLigues?.length > 1 && (
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a5d6a7", marginBottom: 12 }}>
              📈 Historique des semaines
            </div>
            {historiqueLigues.slice(-5).reverse().map((h, i) => {
              const ligue = LIGUES.find(l => l.id === h.ligue);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{ligue?.icone || "🌿"}</span>
                    <span style={{ fontSize: 12, color: "#81c784" }}>Ligue {ligue?.label || h.ligue}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#a5d6a7" }}>
                    {h.points.toLocaleString("fr-FR")} pts
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <div style={{ fontSize: 10, color: "#2d4a35", fontStyle: "italic" }}>
            🌿 Le classement se remet à zéro chaque lundi — Bonne chance !
          </div>
        </div>

      </div>
    </div>
  );
}
