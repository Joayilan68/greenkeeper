import { useNavigate } from "react-router-dom";
import { useClassement, LIGUES } from "../lib/useClassement";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { useSaison } from "../lib/useSaison";
import { card, scroll, header } from "../lib/styles";

export default function Classement() {
  const navigate   = useNavigate();
  const { classementActif, label: saisonLabel, emoji: saisonEmoji, isHivernal } = useSaison();
  const {
    ligueActuelle, ligues, classement, position, totalJoueurs,
    pointsSemaine, pointsSaison, enZonePromotion, enZoneRetrogradation,
    joursRestants, messageClassement, historiqueLigues, meilleurClassement,
    classementSauvegarde,
  } = useClassement();
  const { total: gpTotal, palier } = useGreenPoints();
  const { actuel: streak, modeHiver } = useStreak();

  // ── Mode hivernal ──────────────────────────────────────────────────────────
  if (!classementActif) {
    return (
      <div>
        <div style={{ ...header, textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#81c784", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
            🏆 Classement
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>
            Saison terminée
          </div>
        </div>

        <div style={scroll}>

          {/* Message hivernal */}
          <div style={{ ...card(), textAlign:"center", padding:24 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>❄️</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#a5d6a7", marginBottom:8 }}>
              Classement en pause
            </div>
            <div style={{ fontSize:13, color:"#81c784", lineHeight:1.6, marginBottom:16 }}>
              Le classement reprend en février avec la nouvelle saison.
              Profite de l'hiver pour préparer ton retour !
            </div>
            <div style={{ background:"rgba(21,101,192,0.15)", border:"1px solid rgba(66,165,245,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#90caf9", fontWeight:600, marginBottom:4 }}>
                🛡️ Streak protégé cet hiver
              </div>
              <div style={{ fontSize:24, fontWeight:800, color:"#a5d6a7" }}>
                {streak} jours
              </div>
              <div style={{ fontSize:11, color:"#81c784" }}>
                1 connexion/semaine suffit pour le garder
              </div>
            </div>
          </div>

          {/* Classement de fin de saison */}
          {classementSauvegarde && (
            <div style={card()}>
              <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:12 }}>
                🏅 Ton classement final de la saison
              </div>
              <div style={{ display:"flex", gap:12 }}>
                {[
                  { label:"Ligue finale", val:`${classementSauvegarde.ligue}`, icone:"🏆" },
                  { label:"Points saison", val:classementSauvegarde.points?.toLocaleString("fr-FR"), icone:"🌿" },
                  { label:"Meilleure position", val:`${classementSauvegarde.meilleur}e`, icone:"⭐" },
                ].map(({ label, val, icone }) => (
                  <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{icone}</div>
                    <div style={{ fontSize:14, fontWeight:800, color:"#a5d6a7" }}>{val}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ligues disponibles */}
          <div style={card()}>
            <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:12 }}>
              🌿 Les ligues de la saison prochaine
            </div>
            {LIGUES.map((ligue, i) => (
              <div key={ligue.id} style={{
                display:      "flex",
                alignItems:   "center",
                gap:          12,
                padding:      "10px 12px",
                background:   `${ligue.couleurBg}33`,
                border:       `1px solid ${ligue.couleur}33`,
                borderRadius: 10,
                marginBottom: 6,
              }}>
                <span style={{ fontSize:24 }}>{ligue.icone}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color: ligue.couleur, fontSize:14 }}>
                    Ligue {ligue.label}
                  </div>
                  <div style={{ fontSize:11, color:"#81c784" }}>{ligue.description}</div>
                </div>
                <div style={{ fontSize:11, color:"#81c784" }}>
                  {ligue.taille} joueurs
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // ── Mode actif ─────────────────────────────────────────────────────────────
  const zoneCouleur = enZonePromotion
    ? { bg:"rgba(76,175,80,0.15)",  border:"rgba(76,175,80,0.3)",  txt:"#a5d6a7" }
    : enZoneRetrogradation
      ? { bg:"rgba(230,81,0,0.15)", border:"rgba(239,108,0,0.3)",  txt:"#ef9a9a" }
      : { bg:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.1)", txt:"#81c784" };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ ...header, textAlign:"center" }}>
        <div style={{ fontSize:11, color:"#81c784", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
          🏆 Classement
        </div>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>
          {ligueActuelle?.icone} Ligue {ligueActuelle?.label}
        </div>
        <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>
          {saisonEmoji} {saisonLabel} · {joursRestants} jour{joursRestants > 1 ? "s" : ""} restant{joursRestants > 1 ? "s" : ""}
        </div>
      </div>

      <div style={scroll}>

        {/* ── Ma position ────────────────────────────────────────────────────── */}
        <div style={{ ...card(), background:"linear-gradient(135deg, rgba(27,94,32,0.4), rgba(13,43,26,0.6))" }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
            {/* Position */}
            <div style={{ textAlign:"center", minWidth:70 }}>
              <div style={{ fontSize:44, fontWeight:800, color:"#a5d6a7", lineHeight:1 }}>
                {position}
              </div>
              <div style={{ fontSize:11, color:"#81c784" }}>/ {totalJoueurs}</div>
            </div>

            {/* Stats */}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:6 }}>
                Toi cette semaine
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { val:pointsSemaine, label:"pts semaine", icone:"🌿" },
                  { val:gpTotal.toLocaleString("fr-FR"), label:"pts total", icone:"⭐" },
                  { val:`${streak}j`, label:"streak", icone:"🔥" },
                ].map(({ val, label, icone }) => (
                  <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"6px 4px", textAlign:"center" }}>
                    <div style={{ fontSize:11 }}>{icone}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:"#e8f5e9" }}>{val}</div>
                    <div style={{ fontSize:9, color:"#81c784" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zone promotion/rétrogradation */}
          <div style={{
            padding:      "10px 12px",
            background:   zoneCouleur.bg,
            border:       `1px solid ${zoneCouleur.border}`,
            borderRadius: 10,
            color:        zoneCouleur.txt,
            fontSize:     12,
            fontWeight:   500,
          }}>
            {messageClassement}
            {joursRestants <= 2 && (
              <span style={{ fontWeight:700, color:"#f9a825" }}> — ⏰ Plus que {joursRestants}j !</span>
            )}
          </div>
        </div>

        {/* ── Tableau classement ─────────────────────────────────────────────── */}
        <div style={card()}>
          <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:12 }}>
            📊 Classement de la semaine
          </div>

          {classement.map((joueur, idx) => {
            const rang      = idx + 1;
            const isUser    = joueur.isUser;
            const isTop3    = rang <= 3;
            const medailles = ["🥇","🥈","🥉"];
            const taille    = classement.length;
            const top30     = Math.ceil(taille * 0.3);
            const bot30     = Math.floor(taille * 0.7);
            const promo     = rang <= top30;
            const retro     = rang > bot30;

            return (
              <div key={joueur.id} style={{
                display:      "flex",
                alignItems:   "center",
                gap:          10,
                padding:      "10px 12px",
                marginBottom: 4,
                borderRadius: 10,
                background:   isUser
                  ? "rgba(76,175,80,0.2)"
                  : isTop3
                    ? "rgba(249,168,37,0.08)"
                    : "rgba(255,255,255,0.03)",
                border:       isUser
                  ? "1px solid rgba(76,175,80,0.4)"
                  : "1px solid transparent",
                position:     "relative",
              }}>
                {/* Indicateur zone */}
                {promo && (
                  <div style={{
                    position:     "absolute",
                    left:         0,
                    top:          "50%",
                    transform:    "translateY(-50%)",
                    width:        3,
                    height:       "70%",
                    background:   "#43a047",
                    borderRadius: "0 3px 3px 0",
                  }}/>
                )}
                {retro && (
                  <div style={{
                    position:     "absolute",
                    left:         0,
                    top:          "50%",
                    transform:    "translateY(-50%)",
                    width:        3,
                    height:       "70%",
                    background:   "#e65100",
                    borderRadius: "0 3px 3px 0",
                  }}/>
                )}

                {/* Rang */}
                <div style={{
                  minWidth:   28,
                  textAlign:  "center",
                  fontSize:   isTop3 ? 20 : 13,
                  fontWeight: 700,
                  color:      isTop3 ? undefined : "#81c784",
                }}>
                  {isTop3 ? medailles[rang-1] : rang}
                </div>

                {/* Avatar */}
                <div style={{
                  width:        36,
                  height:       36,
                  borderRadius: "50%",
                  background:   isUser
                    ? "linear-gradient(135deg, #43a047, #1b5e20)"
                    : `hsl(${(joueur.id.charCodeAt(joueur.id.length-1) * 47) % 360}, 40%, 35%)`,
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  fontSize:     14,
                  fontWeight:   700,
                  color:        "white",
                  flexShrink:   0,
                  border:       isUser ? "2px solid #43a047" : "none",
                }}>
                  {isUser ? "🌿" : joueur.prenom.charAt(0)}
                </div>

                {/* Nom */}
                <div style={{ flex:1 }}>
                  <div style={{
                    fontSize:   13,
                    fontWeight: isUser ? 700 : 500,
                    color:      isUser ? "#a5d6a7" : "#e8f5e9",
                  }}>
                    {isUser ? "Vous" : joueur.prenom}
                    {isUser && <span style={{ fontSize:10, color:"#81c784", marginLeft:6 }}>← toi</span>}
                  </div>
                  {isTop3 && (
                    <div style={{ fontSize:10, color:"#f9a825" }}>
                      {rang === 1 ? "Champion" : rang === 2 ? "Finaliste" : "Podium"}
                    </div>
                  )}
                </div>

                {/* Score */}
                <div style={{ textAlign:"right" }}>
                  <div style={{
                    fontSize:   14,
                    fontWeight: 700,
                    color:      isUser ? "#a5d6a7" : "#e8f5e9",
                  }}>
                    {joueur.score.toLocaleString("fr-FR")}
                  </div>
                  <div style={{ fontSize:10, color:"#81c784" }}>pts</div>
                </div>
              </div>
            );
          })}

          {/* Légende zones */}
          <div style={{ display:"flex", gap:12, marginTop:12, padding:"8px 0", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:3, height:16, background:"#43a047", borderRadius:2 }}/>
              <span style={{ fontSize:11, color:"#81c784" }}>Zone promotion</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:3, height:16, background:"#e65100", borderRadius:2 }}/>
              <span style={{ fontSize:11, color:"#81c784" }}>Zone rétrogradation</span>
            </div>
          </div>
        </div>

        {/* ── Ligues disponibles ─────────────────────────────────────────────── */}
        <div style={card()}>
          <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:12 }}>
            🌿 Toutes les ligues
          </div>
          {LIGUES.map((ligue) => {
            const isActive = ligue.id === ligueActuelle?.id;
            return (
              <div key={ligue.id} style={{
                display:      "flex",
                alignItems:   "center",
                gap:          10,
                padding:      "10px 12px",
                background:   isActive ? `${ligue.couleurBg}66` : "rgba(255,255,255,0.03)",
                border:       isActive ? `1px solid ${ligue.couleur}66` : "1px solid transparent",
                borderRadius: 10,
                marginBottom: 4,
              }}>
                <span style={{ fontSize:22 }}>{ligue.icone}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:isActive?700:500, color:isActive?ligue.couleur:"#81c784", fontSize:13 }}>
                    Ligue {ligue.label}
                    {isActive && <span style={{ marginLeft:8, fontSize:10, background:`${ligue.couleur}33`, color:ligue.couleur, borderRadius:10, padding:"1px 6px" }}>Ta ligue</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#4a7c5c" }}>{ligue.description}</div>
                </div>
                <div style={{ fontSize:11, color:"#4a7c5c" }}>{ligue.taille} joueurs</div>
              </div>
            );
          })}
        </div>

        {/* ── Historique ligues ──────────────────────────────────────────────── */}
        {historiqueLigues.length > 0 && (
          <div style={card()}>
            <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:12 }}>
              📈 Historique des semaines
            </div>
            {historiqueLigues.slice(-5).reverse().map((h, i) => {
              const ligue = LIGUES.find(l => l.id === h.ligue);
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16 }}>{ligue?.icone || "🌿"}</span>
                    <span style={{ fontSize:12, color:"#81c784" }}>
                      Ligue {ligue?.label || h.ligue}
                    </span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#a5d6a7" }}>
                    {h.points.toLocaleString("fr-FR")} pts
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign:"center", padding:"8px 0 24px" }}>
          <div style={{ fontSize:10, color:"#2d4a35", fontStyle:"italic" }}>
            🌿 Le classement se remet à zéro chaque lundi — Bonne chance !
          </div>
        </div>

      </div>
    </div>
  );
}
