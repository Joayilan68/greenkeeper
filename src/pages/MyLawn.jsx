import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { useReminders } from "../lib/useReminders";
import { calcLawnScore } from "../lib/lawnScore";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage } from "../lib/lawn";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

const PRODUCTS = [
  { name:"Anti-mousse liquide",    score:"+15", price:"18,50€", icon:"🌿", reason:"Mousse détectée" },
  { name:"Engrais azoté NPK",      score:"+10", price:"24,90€", icon:"🌱", reason:"Carence nutriments" },
  { name:"Biostimulant racinaire", score:"+8",  price:"29,90€", icon:"💧", reason:"Stress hydrique" },
];

export default function MyLawn() {
  const navigate = useNavigate();
  const { profile }          = useProfile();
  const { history = [] }     = useHistory();
  const { weather }          = useWeather() || {};
  const { isPaid = false }   = useSubscription() || {};
  const { activeCount }      = useReminders();
  const [period, setPeriod]  = useState("7j");

  const month = new Date().getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const arros = profile && weather ? calcArrosage(month, profile, weather) : null;
  const { score, potential, label, color, issues, strengths } = calcLawnScore({ weather, profile, history, month });

  const scoreLastWeek = Math.max(0, score - Math.floor(Math.random() * 8 + 2));
  const scoreDiff     = score - scoreLastWeek;

  const countAction = (kw) => history.filter(h => h.action.toLowerCase().includes(kw)).length;

  const actionsDisponibles = issues.reduce((acc, i) => acc + Math.abs(i.impact), 0);
  const projectionScore    = Math.min(100, score + Math.round(actionsDisponibles * 0.6));
  const projectionDays     = issues.length <= 2 ? 7 : 14;

  const generateScoreHistory = () => {
    const points = [];
    for (let i = 6; i >= 0; i--) {
      const variation = Math.floor(Math.random() * 6) - 2;
      points.push(Math.max(0, Math.min(100, score - i * 1.5 + variation)));
    }
    points[6] = score;
    return points;
  };
  const scoreHistory = generateScoreHistory();
  const maxScore = Math.max(...scoreHistory);
  const minScore = Math.min(...scoreHistory);

  return (
    <div>
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🌿 Mon Gazon</div>
            <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>Centre de pilotage</div>
          </div>
          <button onClick={() => navigate("/rappels")} style={{ background:"rgba(67,160,71,0.15)", border:"1px solid rgba(67,160,71,0.35)", borderRadius:10, padding:"7px 12px", color:"#a5d6a7", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            🔔 Rappels
            {activeCount > 0 && (
              <span style={{ background:"#43a047", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div style={scroll}>

        {/* ── 1. SCORE HÉRO ── */}
        <div style={{ ...card(), background:`linear-gradient(135deg, rgba(27,94,32,0.5), rgba(13,43,26,0.7))`, border:`2px solid ${color}55`, padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1, marginBottom:6 }}>🌿 SCORE SANTÉ</div>
              <div style={{ fontSize:56, fontWeight:900, color, lineHeight:1 }}>{score}</div>
              <div style={{ fontSize:13, color, fontWeight:700, marginTop:2 }}>/100 — {label}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{scoreDiff >= 0 ? "📈" : "📉"}</div>
              <div style={{ fontSize:13, fontWeight:700, color: scoreDiff >= 0 ? "#a5d6a7" : "#ef9a9a" }}>
                {scoreDiff >= 0 ? "+" : ""}{scoreDiff} pts
              </div>
              <div style={{ fontSize:10, color:"#81c784" }}>vs 7 jours</div>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#81c784", marginBottom:4 }}>
              <span>0</span><span>Score actuel</span><span>100</span>
            </div>
            <div style={{ height:10, background:"rgba(255,255,255,0.1)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ width:`${score}%`, height:"100%", background:`linear-gradient(90deg, ${color}, #a5d6a7)`, borderRadius:10, transition:"width 1s ease" }} />
            </div>
          </div>

          <div style={{ marginTop:14, background:"rgba(249,168,37,0.15)", borderRadius:12, padding:"10px 14px", border:"1px solid rgba(249,168,37,0.3)" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#f9a825" }}>🎯 Projection personnalisée</div>
            <div style={{ fontSize:13, color:"#e8f5e9", marginTop:4 }}>
              En suivant le plan → <span style={{ fontWeight:800, color:"#a5d6a7" }}>{projectionScore}/100</span> dans <span style={{ fontWeight:800 }}>{projectionDays} jours</span>
            </div>
          </div>
        </div>

        {/* ── 2. DÉTAIL DU SCORE ── */}
        <div style={card()}>
          <div style={cardTitle}><span>📊 Détail du score</span>{!isPaid && <span style={{ fontSize:10, color:"#f9a825" }}>🔒 Premium</span>}</div>
          {[
            { icon:"🌱", label:"Entretien régulier", val: Math.min(100, 40 + countAction("tonte") * 10),    weight:40 },
            { icon:"💧", label:"Hydratation",         val: weather ? Math.max(20, 100 - weather.temp_max * 2) : 60, weight:25 },
            { icon:"🧪", label:"Nutriments",          val: Math.min(100, 50 + countAction("engrais") * 15), weight:20 },
            { icon:"🌿", label:"Sol & aération",      val: profile?.sol === "argileux" ? 55 : 75,            weight:15 },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                <span>{item.icon} {item.label}</span>
                {isPaid || i < 2 ? (
                  <span style={{ fontWeight:700, color: item.val >= 70 ? "#a5d6a7" : item.val >= 50 ? "#f9a825" : "#ef9a9a" }}>
                    {item.val}/100
                  </span>
                ) : (
                  <span style={{ color:"#f9a825", fontSize:11 }}>🔒 Premium</span>
                )}
              </div>
              {(isPaid || i < 2) && (
                <div style={{ height:6, background:"rgba(255,255,255,0.1)", borderRadius:6, overflow:"hidden" }}>
                  <div style={{ width:`${item.val}%`, height:"100%", background: item.val >= 70 ? "#43a047" : item.val >= 50 ? "#f9a825" : "#c62828", borderRadius:6 }} />
                </div>
              )}
            </div>
          ))}
          {!isPaid && (
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, fontSize:12, padding:"8px 16px", width:"auto", marginTop:4 }}>
              ⭐ Voir le détail complet
            </button>
          )}
        </div>

        {/* ── 3. PROBLÈMES PRIORITAIRES ── */}
        {issues.length > 0 && (
          <div style={card()}>
            <div style={cardTitle}><span>⚠️ Problèmes prioritaires</span></div>
            {(isPaid ? issues : issues.slice(0,2)).map((issue, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"rgba(239,108,0,0.1)", borderRadius:10, marginBottom:6, border:"1px solid rgba(239,108,0,0.2)" }}>
                <span style={{ fontSize:13 }}>{issue.icon} {issue.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#ef9a9a" }}>{issue.impact} pts</span>
              </div>
            ))}
            {!isPaid && issues.length > 2 && (
              <div style={{ fontSize:12, color:"#f9a825", textAlign:"center", marginTop:6 }}>
                🔒 +{issues.length - 2} problème{issues.length-2>1?"s":""} masqué{issues.length-2>1?"s":""} — <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={() => navigate("/subscribe")}>Premium</span>
              </div>
            )}
          </div>
        )}

        {/* ── 4. ACTIONS DU JOUR ── */}
        <div style={{ ...card(), background:"rgba(76,175,80,0.08)", border:"1px solid rgba(76,175,80,0.25)" }}>
          <div style={cardTitle}><span>🎯 Actions recommandées aujourd'hui</span></div>
          {[
            ...(arros ? [{ icon:"💧", text:`Arroser ${arros.minutes} min`, gain:"+5 pts", route:"/today" }] : []),
            { icon:"✂️", text:`Tondre à ${plan?.hauteur || "4"} cm`, gain:"+3 pts", route:"/today" },
            ...(plan?.engrais ? [{ icon:"🌱", text:"Appliquer engrais", gain:"+8 pts", route:"/today" }] : []),
          ].slice(0,3).map((action, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize:13 }}>{action.icon} {action.text}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:"#a5d6a7", fontWeight:700 }}>{action.gain}</span>
                <button onClick={() => navigate(action.route)} style={{ background:"rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer", fontWeight:700 }}>
                  Faire →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── 5. PLAN DU MOIS ── */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 Plan {MONTHS_FR[month]}</span></div>
          <div style={{ fontSize:13, color:"#f9a825", fontWeight:700, marginBottom:8 }}>{plan?.label}</div>
          {[
            { icon:"✂️", label:"Tonte",    val:plan?.tonte },
            { icon:"🌱", label:"Engrais",  val:plan?.engrais || "Aucun ce mois" },
            { icon:"🔧", label:"Verticut", val:plan?.verticut ? "À prévoir" : "Non requis" },
            { icon:"🌀", label:"Aération", val:plan?.aeration ? "Recommandée" : "Non requise" },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize:16, minWidth:24 }}>{icon}</span>
              <div>
                <div style={{ fontSize:10, color:"#81c784", fontWeight:700 }}>{label}</div>
                <div style={{ fontSize:12 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 6. ÉVOLUTION DU SCORE ── */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>📈 Évolution du score</span>
            <div style={{ display:"flex", gap:6 }}>
              {["7j","30j"].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{ background: period===p ? "rgba(76,175,80,0.3)" : "none", border:`1px solid ${period===p ? "#43a047" : "rgba(255,255,255,0.2)"}`, borderRadius:8, padding:"2px 8px", color: period===p ? "#a5d6a7" : "#81c784", fontSize:11, cursor:"pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position:"relative", height:80, marginTop:8 }}>
            <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#43a047" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#43a047" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {(() => {
                const pts    = scoreHistory;
                const range  = maxScore - minScore || 1;
                const coords = pts.map((v, i) => ({
                  x: (i / (pts.length-1)) * 300,
                  y: 70 - ((v - minScore) / range) * 60
                }));
                const pathD = coords.map((p,i) => `${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
                const areaD = pathD + ` L 300 70 L 0 70 Z`;
                return (
                  <>
                    <path d={areaD} fill="url(#scoreGrad)"/>
                    <path d={pathD} fill="none" stroke="#43a047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {coords.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#43a047"/>)}
                    <text x={coords[coords.length-1].x - 15} y={coords[coords.length-1].y - 8} fill="#a5d6a7" fontSize="10" fontWeight="bold">{score}</text>
                  </>
                );
              })()}
            </svg>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#81c784", marginTop:4 }}>
            <span>Il y a 7 jours</span><span>Aujourd'hui</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
            {[
              { icon:"✂️", label:"Tontes",    val:countAction("tonte") },
              { icon:"💧", label:"Arrosages", val:countAction("arrosage") },
              { icon:"🌱", label:"Engrais",   val:countAction("engrais") },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px", textAlign:"center" }}>
                <div style={{ fontSize:18 }}>{icon}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#a5d6a7" }}>{val}</div>
                <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7. DERNIER DIAGNOSTIC ── */}
        <div style={{ ...card(), background:"rgba(33,150,243,0.08)", border:"1px solid rgba(33,150,243,0.25)" }}>
          <div style={cardTitle}><span>🔬 Dernier diagnostic</span></div>
          <div style={{ textAlign:"center", padding:"12px 0" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
            <div style={{ fontSize:13, color:"#81c784", marginBottom:12 }}>Aucun diagnostic photo effectué</div>
            <button onClick={() => navigate("/diagnostic")} style={{ ...btn.primary, width:"auto", padding:"10px 24px", fontSize:13 }}>
              🔬 Faire un diagnostic →
            </button>
          </div>
        </div>

        {/* ── 8. PRODUITS RECOMMANDÉS ── */}
        <div style={card()}>
          <div style={cardTitle}><span>🛒 Produits recommandés</span></div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:10, fontStyle:"italic" }}>Sélectionnés selon votre score</div>
          {PRODUCTS.slice(0, isPaid ? 3 : 1).map((p, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:24 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700 }}>{p.name}</div>
                  <div style={{ fontSize:10, color:"#81c784" }}>{p.reason}</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, color:"#a5d6a7", fontWeight:700 }}>{p.score} pts</div>
                <div style={{ fontSize:11, color:"#f9a825" }}>{p.price}</div>
              </div>
            </div>
          ))}
          {!isPaid && (
            <div style={{ fontSize:12, color:"#f9a825", textAlign:"center", marginTop:8 }}>
              🔒 +{PRODUCTS.length-1} produits masqués — <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={() => navigate("/subscribe")}>Premium</span>
            </div>
          )}
          <button onClick={() => navigate("/products")} style={{ ...btn.primary, marginTop:12, fontSize:12, padding:"8px" }}>
            Voir tous les produits →
          </button>
        </div>

        {/* ── 9. BLOC PREMIUM ── */}
        {!isPaid && (
          <div style={{ ...card(), background:"linear-gradient(135deg, rgba(249,168,37,0.15), rgba(230,81,0,0.1))", border:"1px solid rgba(249,168,37,0.4)", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>⭐</div>
            <div style={{ fontSize:15, fontWeight:800, color:"#f9a825", marginBottom:8 }}>Passez Premium</div>
            {["Détail complet du score","Diagnostic illimité","Arrosage précis calculé","Produits personnalisés","Rappels push + email"].map(f => (
              <div key={f} style={{ fontSize:12, color:"#e8f5e9", padding:"3px 0" }}>✔ {f}</div>
            ))}
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, marginTop:14, padding:"12px 28px", fontSize:14 }}>
              ⭐ Améliorer mon gazon — 4,99€/mois
            </button>
          </div>
        )}

        {/* ── 10. PRÉDICTION IA ── */}
        {isPaid && (
          <div style={{ ...card(), background:"linear-gradient(135deg, rgba(27,94,32,0.3), rgba(13,43,26,0.5))", border:"1px solid rgba(165,214,167,0.3)", textAlign:"center", padding:20 }}>
            <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1, marginBottom:8 }}>🧠 PRÉDICTION IA</div>
            <div style={{ fontSize:14, color:"#e8f5e9", lineHeight:1.6 }}>Si tu suis le plan cette semaine</div>
            <div style={{ fontSize:32, fontWeight:900, color:"#a5d6a7", margin:"8px 0" }}>{projectionScore}</div>
            <div style={{ fontSize:13, color:"#81c784" }}>Score estimé dans <strong style={{ color:"#a5d6a7" }}>{projectionDays} jours</strong></div>
            <div style={{ fontSize:12, color:"#f9a825", marginTop:8 }}>+{projectionScore - score} pts en suivant le plan ↗</div>
          </div>
        )}

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
