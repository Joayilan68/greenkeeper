// src/pages/Rappels.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReminders, REMINDER_TYPES } from "../lib/useReminders";
import { useHistory } from "../lib/useHistory";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

const C = {
  freshGreen: "#52b788",
  lightGreen: "#95d5b2",
  orange:     "#f4a261",
  border:     "rgba(149,213,178,0.18)",
  text:       "#e8f5e9",
  textSoft:   "#95d5b2",
  textMuted:  "#4a7c5c",
};

export default function Rappels() {
  const navigate = useNavigate();
  const { reminders, toggle, setDays, toggleChannel, activeCount, getDueReminders } = useReminders();
  const { history = [] } = useHistory();
  const [expanded, setExpanded] = useState(null);

  const dueReminders = getDueReminders(history);

  return (
    <div>
      {/* ── Header ── */}
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🔔 Rappels</div>
              <div style={{ fontSize:12, color:"#81c784", opacity:0.7 }}>
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

        {/* ── Rappels dus aujourd'hui ── */}
        {dueReminders.length > 0 && (
          <div style={{ ...card(), background:"rgba(244,162,97,0.1)", border:"1px solid rgba(244,162,97,0.4)" }}>
            <div style={cardTitle}><span>⏰ À faire aujourd'hui</span></div>
            {dueReminders.map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:24 }}>{r.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#f4c88a" }}>{r.label}</div>
                  <div style={{ fontSize:11, color:"#95d5b2" }}>{r.desc}</div>
                </div>
                <button onClick={() => navigate("/today")} style={{ background:"rgba(244,162,97,0.3)", border:"1px solid rgba(244,162,97,0.5)", borderRadius:10, padding:"6px 12px", color:"#f4a261", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  Journaliser →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Intro ── */}
        <div style={{ ...card(), background:"rgba(82,183,136,0.06)", border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13, color:C.textSoft, lineHeight:1.7 }}>
            🔔 Activez vos rappels d'entretien pour recevoir des alertes au bon moment. Chaque rappel se déclenche selon le délai que vous définissez depuis votre dernier journal.
          </div>
        </div>

        {/* ── Liste des rappels ── */}
        {REMINDER_TYPES.map(type => {
          const r          = reminders[type.id];
          const isActive   = r?.enabled;
          const isExpanded = expanded === type.id;
          const isDue      = dueReminders.some(d => d.id === type.id);

          return (
            <div key={type.id} style={{ ...card(), border:`1px solid ${isActive ? "rgba(82,183,136,0.4)" : C.border}`, background: isActive ? "rgba(82,183,136,0.06)" : "rgba(255,255,255,0.03)" }}>

              {/* ── Ligne principale ── */}
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:28, minWidth:36 }}>{type.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontSize:14, fontWeight:700, color: isActive ? C.lightGreen : C.text }}>{type.label}</div>
                    {isDue && <span style={{ fontSize:10, fontWeight:800, background:"rgba(244,162,97,0.2)", color:"#f4a261", border:"1px solid rgba(244,162,97,0.4)", borderRadius:8, padding:"1px 6px" }}>DÛ</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>
                    {isActive ? `Tous les ${r.days} jours` : type.desc}
                  </div>
                </div>

                {/* Toggle ON/OFF */}
                <div
                  onClick={() => toggle(type.id)}
                  style={{
                    width:44, height:24, borderRadius:12, cursor:"pointer",
                    background: isActive ? C.freshGreen : "rgba(255,255,255,0.1)",
                    position:"relative", transition:"background 0.3s", flexShrink:0,
                  }}
                >
                  <div style={{
                    width:18, height:18, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:3,
                    left: isActive ? 23 : 3,
                    transition:"left 0.3s",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
                  }} />
                </div>

                {/* Expand */}
                {isActive && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : type.id)}
                    style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:16, padding:"0 4px" }}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>

              {/* ── Détails expandés ── */}
              {isActive && isExpanded && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>

                  {/* Fréquence */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.textSoft, marginBottom:10 }}>
                      ⏱️ Fréquence — tous les <span style={{ color:C.lightGreen, fontSize:14 }}>{r.days}</span> jours
                    </div>
                    <input
                      type="range"
                      min={1} max={90} step={1}
                      value={r.days}
                      onChange={e => setDays(type.id, e.target.value)}
                      style={{ width:"100%", accentColor:C.freshGreen }}
                    />
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.textMuted, marginTop:4 }}>
                      <span>1 jour</span>
                      <span>30 jours</span>
                      <span>90 jours</span>
                    </div>

                    {/* Raccourcis fréquence */}
                    <div style={{ display:"flex", gap:6, marginTop:10 }}>
                      {[
                        { label:"3j",  val:3 },
                        { label:"7j",  val:7 },
                        { label:"14j", val:14 },
                        { label:"30j", val:30 },
                        { label:"90j", val:90 },
                      ].map(({ label, val }) => (
                        <button key={val} onClick={() => setDays(type.id, val)}
                          style={{ flex:1, background: r.days === val ? "rgba(82,183,136,0.3)" : "rgba(255,255,255,0.05)", border:`1px solid ${r.days === val ? C.freshGreen : C.border}`, borderRadius:8, padding:"5px 4px", color: r.days === val ? C.lightGreen : C.textMuted, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Canaux de notification */}
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.textSoft, marginBottom:10 }}>📬 Canaux de notification</div>
                    <div style={{ display:"flex", gap:8 }}>
                      {[
                        { key:"push",  icon:"📱", label:"Push" },
                        { key:"email", icon:"📧", label:"Email" },
                      ].map(({ key, icon, label }) => (
                        <button key={key} onClick={() => toggleChannel(type.id, key)}
                          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, background: r[key] ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.05)", border:`1px solid ${r[key] ? C.freshGreen : C.border}`, borderRadius:10, padding:"8px", color: r[key] ? C.lightGreen : C.textMuted, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                          <span>{icon}</span>{label}
                          {r[key] ? " ✓" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Note push ── */}
        <div style={{ ...card(), background:"rgba(255,255,255,0.03)", textAlign:"center", padding:14 }}>
          <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.7 }}>
            📱 Les notifications push nécessitent que vous ayez activé les alertes dans le Dashboard.<br/>
            📧 Les notifications email sont envoyées à votre adresse Clerk.
          </div>
        </div>

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
