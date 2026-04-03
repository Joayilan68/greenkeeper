// src/pages/Rappels.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReminders, REMINDER_TYPES } from "../lib/useReminders";
import { useHistory } from "../lib/useHistory";

export default function Rappels() {
  const navigate = useNavigate();
  const { reminders, toggle, setDays, toggleChannel, activeCount, getDueReminders } = useReminders();
  const { history = [] } = useHistory();
  const [expanded, setExpanded] = useState(null);
  const dueReminders = getDueReminders(history);

  const s = {
    page:    { fontFamily:"'Nunito','Segoe UI',sans-serif", background:"linear-gradient(160deg,#0d2b1a 0%,#1a4731 40%,#0f3320 100%)", minHeight:"100vh", maxWidth:430, margin:"0 auto", color:"#e8f5e9", position:"relative" },
    header:  { padding:"48px 20px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
    scroll:  { padding:"0 16px 100px" },
    card:    { background:"rgba(255,255,255,0.08)", borderRadius:20, border:"1px solid rgba(165,214,167,0.2)", padding:18, marginBottom:12 },
    title:   { fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:"#81c784", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" },
    primary: { background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", border:"none", borderRadius:14, padding:"12px 20px", fontSize:14, fontWeight:700, cursor:"pointer", width:"100%" },
  };

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🔔 Rappels</div>
            <div style={{ fontSize:12, color:"#81c784" }}>
              {activeCount > 0 ? `${activeCount} rappel${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}` : "Aucun rappel actif"}
            </div>
          </div>
        </div>
        <button onClick={() => navigate(-1)} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"6px 14px", color:"#81c784", fontSize:13, cursor:"pointer" }}>
          ← Retour
        </button>
      </div>

      <div style={s.scroll}>

        {/* Rappels dus aujourd'hui */}
        {dueReminders.length > 0 && (
          <div style={{ ...s.card, background:"rgba(244,162,97,0.1)", border:"1px solid rgba(244,162,97,0.4)" }}>
            <div style={s.title}><span>⏰ À faire aujourd'hui</span></div>
            {dueReminders.map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:24 }}>{r.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#f4c88a" }}>{r.label}</div>
                </div>
                <button onClick={() => navigate("/today")} style={{ background:"rgba(244,162,97,0.3)", border:"none", borderRadius:10, padding:"6px 12px", color:"#f4a261", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  Journaliser →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Intro */}
        <div style={{ ...s.card, background:"rgba(82,183,136,0.06)" }}>
          <div style={{ fontSize:13, color:"#95d5b2", lineHeight:1.7 }}>
            🔔 Activez vos rappels d'entretien pour recevoir des alertes au bon moment. Chaque rappel se déclenche selon le délai défini depuis votre dernier journal.
          </div>
        </div>

        {/* Liste rappels */}
        {REMINDER_TYPES.map(type => {
          const r          = reminders[type.id] || {};
          const isActive   = !!r.enabled;
          const isExpanded = expanded === type.id;
          const isDue      = dueReminders.some(d => d.id === type.id);

          return (
            <div key={type.id} style={{ ...s.card, border:`1px solid ${isActive ? "rgba(82,183,136,0.5)" : "rgba(149,213,178,0.25)"}`, background: isActive ? "rgba(82,183,136,0.1)" : "rgba(255,255,255,0.06)" }}>

              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:28, minWidth:36 }}>{type.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontSize:14, fontWeight:700, color: isActive ? "#95d5b2" : "#e8f5e9" }}>{type.label}</div>
                    {isDue && <span style={{ fontSize:10, fontWeight:800, background:"rgba(244,162,97,0.2)", color:"#f4a261", border:"1px solid rgba(244,162,97,0.4)", borderRadius:8, padding:"1px 6px" }}>DÛ</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#4a7c5c", marginTop:2 }}>
                    {isActive ? `Tous les ${r.days} jours` : type.desc}
                  </div>
                </div>

                {/* Toggle */}
                <div onClick={() => toggle(type.id)} style={{ width:44, height:24, borderRadius:12, cursor:"pointer", background: isActive ? "#52b788" : "rgba(255,255,255,0.1)", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left: isActive ? 23 : 3, transition:"left 0.3s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
                </div>

                {isActive && (
                  <button onClick={() => setExpanded(isExpanded ? null : type.id)} style={{ background:"none", border:"none", color:"#4a7c5c", cursor:"pointer", fontSize:16, padding:"0 4px" }}>
                    {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>

              {/* Détails */}
              {isActive && isExpanded && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid rgba(149,213,178,0.18)" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#95d5b2", marginBottom:10 }}>
                    ⏱️ Fréquence — tous les <span style={{ color:"#95d5b2", fontSize:14 }}>{r.days}</span> jours
                  </div>
                  <input type="range" min={1} max={90} step={1} value={r.days} onChange={e => setDays(type.id, e.target.value)} style={{ width:"100%", accentColor:"#52b788" }} />
                  <div style={{ display:"flex", gap:6, marginTop:10 }}>
                    {[{l:"3j",v:3},{l:"7j",v:7},{l:"14j",v:14},{l:"30j",v:30},{l:"90j",v:90}].map(({l,v}) => (
                      <button key={v} onClick={() => setDays(type.id, v)} style={{ flex:1, background: r.days===v ? "rgba(82,183,136,0.3)" : "rgba(255,255,255,0.05)", border:`1px solid ${r.days===v ? "#52b788" : "rgba(149,213,178,0.18)"}`, borderRadius:8, padding:"5px 4px", color: r.days===v ? "#95d5b2" : "#4a7c5c", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    {[{k:"push",i:"📱",l:"Push"},{k:"email",i:"📧",l:"Email"}].map(({k,i,l}) => (
                      <button key={k} onClick={() => toggleChannel(type.id, k)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, background: r[k] ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.05)", border:`1px solid ${r[k] ? "#52b788" : "rgba(149,213,178,0.18)"}`, borderRadius:10, padding:"8px", color: r[k] ? "#95d5b2" : "#4a7c5c", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                        {i} {l} {r[k] ? "✓" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ ...s.card, textAlign:"center", padding:14, background:"rgba(255,255,255,0.03)" }}>
          <div style={{ fontSize:12, color:"#4a7c5c", lineHeight:1.7 }}>
            📱 Notifications push : activez-les dans le Dashboard<br/>
            📧 Email : envoyé à votre adresse Clerk
          </div>
        </div>

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
