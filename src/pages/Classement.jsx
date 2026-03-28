import { useNavigate } from "react-router-dom";
import { useClassement, LIGUES } from "../lib/useClassement";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { useSaison } from "../lib/useSaison";
import { card, cardTitle, scroll, header } from "../lib/styles";

export default function Classement() {
  const navigate = useNavigate();

  const { classementActif, label: saisonLabel, emoji: saisonEmoji } = useSaison();
  const { total: gpTotal, palier } = useGreenPoints();
  const { actuel: streak } = useStreak();
  const {
    ligueActuelle, classement, position, totalJoueurs,
    pointsSemaine, enZonePromotion, enZoneRetrogradation,
    joursRestants, messageClassement, historiqueLigues,
  } = useClassement();

  const zoneBg  = enZonePromotion ? "rgba(76,175,80,0.2)" : enZoneRetrogradation ? "rgba(230,81,0,0.2)" : "rgba(255,255,255,0.05)";
  const zoneTxt = enZonePromotion ? "#a5d6a7" : enZoneRetrogradation ? "#ef9a9a" : "#81c784";

  return (
    <div>
      {/* Header — même pattern que Dashboard */}
      <div style={header}>
        <div style={{ fontSize: 11, color: "#81c784", letterSpacing: 2, textTransform: "uppercase" }}>
          🏆 Classement
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#a5d6a7", marginTop: 4 }}>
          {classementActif ? `${ligueActuelle?.icone} Ligue ${ligueActuelle?.label}` : "Saison en pause"}
        </div>
        {classementActif && (
          <div style={{ fontSize: 11, color: "#81c784", marginTop: 2 }}>
            {saisonEmoji} {saisonLabel} · {joursRestants} jour{joursRestants > 1 ? "s" : ""} restant{joursRestants > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Scroll — même pattern que Dashboard */}
      <div style={scroll}>

        {/* Mode hivernal */}
        {!classementActif && (
          <div style={card()}>
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❄️</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#a5d6a7", marginBottom: 8 }}>
                Classement en pause
              </div>
              <div style={{ fontSize: 13, color: "#81c784", lineHeight: 1.6 }}>
                Reprend en février. Ton streak de {streak} jours est protégé !
              </div>
            </div>
          </div>
        )}

        {/* Mode actif */}
        {classementActif && (
          <>
            {/* Ma position */}
            <div style={{ ...card(), background: "linear-gradient(135deg, rgba(27,94,32,0.4), rgba(13,43,26,0.6))" }}>
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
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{val}</div>
                        <div style={{ fontSize: 9, color: "#81c784" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: "10px 12px", background: zoneBg, borderRadius: 10, color: zoneTxt, fontSize: 12, fontWeight: 500 }}>
                {messageClassement}
              </div>
            </div>

            {/* Conseil si 0 pts */}
            {pointsSemaine === 0 && (
              <div style={{ ...card(), border: "1px solid rgba(249,168,37,0.3)", background: "rgba(249,168,37,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>💡</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f9a825", marginBottom: 4 }}>
                      Enregistre tes actions pour grimper !
                    </div>
                    <div style={{ fontSize: 12, color: "#81c784" }}>
                      Chaque action dans "Aujourd'hui" te donne des points de classement.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/today")}
                  style={{ marginTop: 12, width: "100%", background: "rgba(249,168,37,0.2)", color: "#f9a825", border: "1px solid rgba(249,168,37,0.3)", borderRadius: 10, padding: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  📅 Aller dans Aujourd'hui →
                </button>
              </div>
            )}

            {/* Tableau classement */}
            <div style={card()}>
              <div style={cardTitle}>
                <span>📊 Classement de la semaine</span>
              </div>
              {classement.map((joueur, idx) => {
                const rang     = idx + 1;
                const isUser   = joueur.isUser;
                const isTop3   = rang <= 3;
                const medailles = ["🥇", "🥈", "🥉"];
                const taille   = classement.length;
                const promo    = rang <= Math.ceil(taille * 0.3);
                const retro    = rang > Math.floor(taille * 0.7);

                return (
                  <div key={joueur.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 10px", marginBottom: 4, borderRadius: 10,
                    background: isUser ? "rgba(76,175,80,0.2)" : isTop3 ? "rgba(249,168,37,0.06)" : "rgba(255,255,255,0.03)",
                    border: isUser ? "1px solid rgba(76,175,80,0.4)" : "1px solid transparent",
                    position: "relative",
                  }}>
                    {promo && <div style={{ position: "absolute", left: 0, top: "15%", width: 3, height: "70%", background: "#43a047", borderRadius: "0 3px 3px 0" }}/>}
                    {retro && <div style={{ position: "absolute", left: 0, top: "15%", width: 3, height: "70%", background: "#e65100", borderRadius: "0 3px 3px 0" }}/>}

                    <div style={{ minWidth: 28, textAlign: "center", fontSize: isTop3 ? 20 : 13, fontWeight: 700, color: "#81c784" }}>
                      {isTop3 ? medailles[rang - 1] : rang}
                    </div>

                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: isUser ? "linear-gradient(135deg,#43a047,#1b5e20)" : "rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0,
                      border: isUser ? "2px solid #43a047" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                      {isUser ? "🌿" : (joueur.prenom ? joueur.prenom.charAt(0) : "?")}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: isUser ? 700 : 500, color: isUser ? "#a5d6a7" : "#e8f5e9" }}>
                        {isUser ? "Vous" : joueur.prenom}
                        {isUser && <span style={{ fontSize: 10, color: "#81c784", marginLeft: 6 }}>← toi</span>}
                      </div>
                      {isTop3 && <div style={{ fontSize: 10, color: "#f9a825" }}>{rang === 1 ? "Champion" : rang === 2 ? "Finaliste" : "Podium"}</div>}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isUser ? "#a5d6a7" : "#e8f5e9" }}>
                        {joueur.score.toLocaleString("fr-FR")}
                      </div>
                      <div style={{ fontSize: 10, color: "#81c784" }}>pts</div>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 3, height: 14, background: "#43a047", borderRadius: 2 }}/>
                  <span style={{ fontSize: 10, color: "#81c784" }}>Promotion</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 3, height: 14, background: "#e65100", borderRadius: 2 }}/>
                  <span style={{ fontSize: 10, color: "#81c784" }}>Rétrogradation</span>
                </div>
              </div>
            </div>

            {/* Ligues */}
            <div style={card()}>
              <div style={cardTitle}><span>🌿 Toutes les ligues</span></div>
              {LIGUES.map((ligue) => {
                const isActive = ligue.id === ligueActuelle?.id;
                return (
                  <div key={ligue.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                    background: isActive ? "rgba(76,175,80,0.15)" : "rgba(255,255,255,0.03)",
                    border: isActive ? "1px solid rgba(76,175,80,0.3)" : "1px solid transparent",
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
          </>
        )}

        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <div style={{ fontSize: 10, color: "#4a7c5c", fontStyle: "italic" }}>
            🌿 Classement remis à zéro chaque lundi
          </div>
        </div>

      </div>
    </div>
  );
}
