// src/pages/Rappels.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReminders, REMINDER_TYPES } from "../lib/useReminders";
import { useHistory } from "../lib/useHistory";
import { card, scroll } from "../lib/styles";

export default function Rappels() {
  const navigate = useNavigate();
  const { reminders, toggle, setDays, toggleChannel, activeCount, getDueReminders } = useReminders();
  const { history = [] } = useHistory();
  const [expanded, setExpanded] = useState(null);
  const dueReminders = getDueReminders(history);

  return (
    <div>
      {/* Header */}
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Rappels</div>
              <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>
                {activeCount > 0 ? `${activeCount} rappel${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}` : "Aucun rappel actif"}
              </div>
            </div>
          </div>
          <button onClick={() => navigate(-1)} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"6px 14px", color:"#81c784", fontSize:13, cursor:"pointer" }}>
            ← Retour
          </button>
        </div>
      </div>

      <div style={scroll}>

        {dueReminders.length > 0 && (
          <div style={{ ...card(), background:"rgba(244,162,97,0.1)", border:"1px solid rgba(244,162,97,0.4)" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:"#66BB6A", marginBottom:10 }}>⏰ À faire aujourd'hui</div>
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

        <div style={{ ...card(), background:"rgba(102,187,106,0.06)", border:"1px solid rgba(102,187,106,0.18)" }}>
          <div style={{ fontSize:13, color:"#A5D6A7", lineHeight:1.7 }}>
            🔔 Activez vos rappels d'entretien pour recevoir des alertes au bon moment. Chaque rappel se déclenche selon le délai défini depuis votre dernier journal.
          </div>
        </div>

        {REMINDER_TYPES.map(type => {
          const r = reminders[type.id] || {};
          const isActive = !!r.enabled;
          const isExpanded = expanded === type.id;
          const isDue = dueReminders.some(d => d.id === type.id);

          return (
            <div key={type.id} style={{ ...card(), border:`1px solid ${isActive ? "rgba(102,187,106,0.5)" : "rgba(149,213,178,0.25)"}`, background: isActive ? "rgba(102,187,106,0.1)" : "rgba(255,255,255,0.07)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:28, minWidth:36 }}>{type.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontSize:14, fontWeight:700, color: isActive ? "#F1F8F2" : "#e8f5e9" }}>{type.label}</div>
                    {isDue && <span style={{ fontSize:10, fontWeight:800, background:"rgba(244,162,97,0.2)", color:"#f4a261", border:"1px solid rgba(244,162,97,0.4)", borderRadius:8, padding:"1px 6px" }}>DÛ</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#4a7c5c", marginTop:2 }}>
                    {isActive ? `Tous les ${r.days} jours` : type.desc}
                  </div>
                </div>

                <div onClick={() => toggle(type.id)} style={{ width:44, height:24, borderRadius:12, cursor:"pointer", background: isActive ? "#66BB6A" : "rgba(255,255,255,0.15)", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left: isActive ? 23 : 3, transition:"left 0.3s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
                </div>

                {isActive && (
                  <button onClick={() => setExpanded(isExpanded ? null : type.id)} style={{ background:"none", border:"none", color:"#4a7c5c", cursor:"pointer", fontSize:16, padding:"0 4px" }}>
                    {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>

              {isActive && isExpanded && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid rgba(149,213,178,0.18)" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#A5D6A7", marginBottom:10 }}>
                    ⏱️ Tous les <span style={{ fontSize:16, color:"#F1F8F2" }}>{r.days}</span> jours
                  </div>
                  <input type="range" min={1} max={90} value={r.days} onChange={e => setDays(type.id, e.target.value)} style={{ width:"100%", accentColor:"#66BB6A" }} />
                  <div style={{ display:"flex", gap:6, marginTop:10 }}>
                    {[{l:"3j",v:3},{l:"7j",v:7},{l:"14j",v:14},{l:"30j",v:30},{l:"90j",v:90}].map(({l,v}) => (
                      <button key={v} onClick={() => setDays(type.id, v)} style={{ flex:1, background: r.days===v ? "rgba(102,187,106,0.3)" : "rgba(255,255,255,0.05)", border:`1px solid ${r.days===v ? "#66BB6A" : "rgba(149,213,178,0.18)"}`, borderRadius:8, padding:"5px 4px", color: r.days===v ? "#66BB6A" : "#4a7c5c", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    {[{k:"push",i:"📱",l:"Push"},{k:"email",i:"📧",l:"Email"}].map(({k,i,l}) => (
                      <button key={k} onClick={() => toggleChannel(type.id, k)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, background: r[k] ? "rgba(102,187,106,0.2)" : "rgba(255,255,255,0.05)", border:`1px solid ${r[k] ? "#66BB6A" : "rgba(149,213,178,0.18)"}`, borderRadius:10, padding:"8px", color: r[k] ? "#66BB6A" : "#4a7c5c", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                        {i} {l}{r[k] ? " ✓" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
