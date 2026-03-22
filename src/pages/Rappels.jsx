// src/pages/Rappels.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useReminders, REMINDER_TYPES } from "../lib/useReminders";
import { useHistory } from "../lib/useHistory";
import { useProfile } from "../lib/useProfile";
import { calcLawnScore } from "../lib/lawnScore";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

export default function Rappels() {
  const navigate                    = useNavigate();
  const { user }                    = useUser();
  const { reminders, toggle, setDays, toggleChannel, activeCount, getDueReminders } = useReminders();
  const { history = [] }            = useHistory();
  const { profile }                 = useProfile();
  const { weather }                 = useWeather() || {};
  const { isPaid = false }          = useSubscription() || {};
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState("");
  const [expanded, setExpanded]     = useState(null);

  const month    = new Date().getMonth() + 1;
  const { score } = calcLawnScore({ weather, profile, history, month });
  const dueNow   = getDueReminders(history);

  const sendTestEmail = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      setSent("❌ Email non disponible");
      return;
    }
    setSending(true); setSent("");
    try {
      const activeReminders = REMINDER_TYPES.filter(r => reminders[r.id]?.enabled);
      if (!activeReminders.length) { setSent("⚠️ Activez au moins un rappel d'abord"); setSending(false); return; }

      const res  = await fetch("/api/send-reminder", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          reminders:  activeReminders.map(r => ({ ...r, days: reminders[r.id].days })),
          userEmail:  user.primaryEmailAddress.emailAddress,
          userName:   user.firstName || "Jardinier",
          profile:    profile || {},
          score,
        })
      });
      const data = await res.json();
      setSent(data.success ? "✅ Email de rappel envoyé !" : "❌ Erreur : " + data.error);
    } catch (e) { setSent("❌ Erreur : " + e.message); }
    setSending(false);
    setTimeout(() => setSent(""), 5000);
  };

  return (
    <div>
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🔔 Mes rappels</div>
            <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>
              {activeCount} rappel{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={() => navigate("/my-lawn")} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 12px", color:"#81c784", fontSize:12, cursor:"pointer" }}>
            ← Retour
          </button>
        </div>
      </div>

      <div style={scroll}>

        {/* ── RAPPELS DUS AUJOURD'HUI ── */}
        {dueNow.length > 0 && (
          <div style={{ ...card(), background:"rgba(249,168,37,0.1)", border:"1px solid rgba(249,168,37,0.35)" }}>
            <div style={cardTitle}><span>⏰ À faire aujourd'hui ({dueNow.length})</span></div>
            {dueNow.map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:22 }}>{r.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{r.label}</div>
                  <div style={{ fontSize:11, color:"#81c784" }}>{r.desc}</div>
                </div>
                <button onClick={() => navigate("/today")} style={{ background:"rgba(249,168,37,0.25)", border:"1px solid rgba(249,168,37,0.4)", borderRadius:8, padding:"5px 10px", color:"#f9a825", fontSize:11, cursor:"pointer", fontWeight:700 }}>
                  Faire →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── INFO PREMIUM ── */}
        {!isPaid && (
          <div style={{ ...card(), background:"rgba(249,168,37,0.08)", border:"1px solid rgba(249,168,37,0.25)", textAlign:"center", padding:16 }}>
            <div style={{ fontSize:13, color:"#f9a825", fontWeight:700, marginBottom:6 }}>🔒 Rappels — Fonctionnalité Premium</div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
              Les rappels push et email sont disponibles avec l'abonnement Premium.
            </div>
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"8px 20px", fontSize:12 }}>
              ⭐ Passer Premium
            </button>
          </div>
        )}

        {/* ── LISTE DES RAPPELS ── */}
        <div style={card()}>
          <div style={cardTitle}><span>⚙️ Configurer mes rappels</span></div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:12 }}>
            Activez les rappels et choisissez la fréquence selon votre gazon.
          </div>

          {REMINDER_TYPES.map(type => {
            const r          = reminders[type.id];
            const isExpanded = expanded === type.id;
            const isEnabled  = r.enabled;

            return (
              <div key={type.id} style={{ marginBottom:8 }}>
                {/* Ligne principale */}
                <div style={{
                  background: isEnabled ? "rgba(67,160,71,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isEnabled ? "rgba(67,160,71,0.35)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: isExpanded ? "12px 12px 0 0" : 12,
                  padding:"12px 14px",
                  display:"flex", alignItems:"center", gap:12,
                }}>
                  <span style={{ fontSize:22, minWidth:28 }}>{type.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: isEnabled ? "#a5d6a7" : "#e8f5e9" }}>{type.label}</div>
                    <div style={{ fontSize:11, color:"#81c784" }}>
                      {isEnabled ? `Tous les ${r.days} jours` : "Désactivé"}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {isEnabled && (
                      <button onClick={() => setExpanded(isExpanded ? null : type.id)}
                        style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:6, padding:"3px 8px", color:"#81c784", fontSize:11, cursor:"pointer" }}>
                        {isExpanded ? "▲" : "⚙️"}
                      </button>
                    )}
                    {/* Toggle switch */}
                    <div onClick={() => isPaid ? toggle(type.id) : navigate("/subscribe")}
                      style={{
                        width:44, height:24, borderRadius:12, cursor:"pointer",
                        background: isEnabled ? "#43a047" : "rgba(255,255,255,0.15)",
                        position:"relative", transition:"background 0.2s",
                        opacity: isPaid ? 1 : 0.5,
                      }}>
                      <div style={{
                        width:18, height:18, borderRadius:9, background:"#fff",
                        position:"absolute", top:3,
                        left: isEnabled ? 23 : 3,
                        transition:"left 0.2s",
                        boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
                      }} />
                    </div>
                  </div>
                </div>

                {/* Panneau expandé */}
                {isExpanded && isEnabled && (
                  <div style={{
                    background:"rgba(255,255,255,0.03)", border:"1px solid rgba(67,160,71,0.25)",
                    borderTop:"none", borderRadius:"0 0 12px 12px", padding:"12px 14px",
                  }}>
                    {/* Fréquence */}
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11, color:"#81c784", fontWeight:700, marginBottom:8 }}>
                        Fréquence : tous les {r.days} jours
                      </div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {[1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90].map(d => (
                          <button key={d} onClick={() => setDays(type.id, d)} style={{
                            background: r.days === d ? "rgba(67,160,71,0.3)" : "rgba(255,255,255,0.08)",
                            border: `1px solid ${r.days === d ? "#43a047" : "rgba(255,255,255,0.1)"}`,
                            borderRadius:8, padding:"4px 10px", color: r.days === d ? "#a5d6a7" : "#81c784",
                            fontSize:11, cursor:"pointer", fontWeight: r.days === d ? 700 : 400,
                          }}>
                            {d}j
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Canaux */}
                    <div>
                      <div style={{ fontSize:11, color:"#81c784", fontWeight:700, marginBottom:8 }}>Canaux de notification</div>
                      <div style={{ display:"flex", gap:8 }}>
                        {[
                          { key:"push",  label:"📱 Push",  icon:"📱" },
                          { key:"email", label:"📧 Email", icon:"📧" },
                        ].map(ch => (
                          <div key={ch.key} onClick={() => toggleChannel(type.id, ch.key)} style={{
                            flex:1, background: r[ch.key] ? "rgba(67,160,71,0.2)" : "rgba(255,255,255,0.05)",
                            border:`1px solid ${r[ch.key] ? "rgba(67,160,71,0.4)" : "rgba(255,255,255,0.1)"}`,
                            borderRadius:10, padding:"8px", textAlign:"center", cursor:"pointer",
                          }}>
                            <div style={{ fontSize:16 }}>{ch.icon}</div>
                            <div style={{ fontSize:11, color: r[ch.key] ? "#a5d6a7" : "#81c784", marginTop:2, fontWeight: r[ch.key] ? 700 : 400 }}>
                              {r[ch.key] ? "✓ Actif" : "Inactif"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── TEST EMAIL ── */}
        {isPaid && (
          <div style={card()}>
            <div style={cardTitle}><span>📧 Tester les rappels</span></div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
              Envoyez un email de test avec vos rappels actifs à{" "}
              <strong style={{ color:"#a5d6a7" }}>
                {user?.primaryEmailAddress?.emailAddress || "votre email"}
              </strong>
            </div>
            {sent && (
              <div style={{ background: sent.startsWith("✅") ? "rgba(76,175,80,0.2)" : "rgba(198,40,40,0.2)", border:`1px solid ${sent.startsWith("✅") ? "#43a047" : "#c62828"}`, borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color: sent.startsWith("✅") ? "#a5d6a7" : "#ef9a9a" }}>
                {sent}
              </div>
            )}
            <button onClick={sendTestEmail} disabled={sending || activeCount === 0}
              style={{ ...btn.primary, fontSize:13, padding:"12px", opacity: (sending || activeCount === 0) ? 0.5 : 1 }}>
              {sending ? "⌛ Envoi..." : "📧 Envoyer un email de test"}
            </button>
            {activeCount === 0 && (
              <div style={{ fontSize:11, color:"#4a7c5c", textAlign:"center", marginTop:6 }}>
                Activez au moins un rappel pour tester
              </div>
            )}
          </div>
        )}

        {/* ── INFO ── */}
        <div style={{ ...card(), background:"rgba(33,150,243,0.08)", border:"1px solid rgba(66,165,245,0.2)" }}>
          <div style={cardTitle}><span>ℹ️ Comment ça marche ?</span></div>
          {[
            ["🔔 Push", "Notification sur votre téléphone même quand l'app est fermée"],
            ["📧 Email", "Récapitulatif envoyé à votre adresse Clerk"],
            ["⏰ Déclenchement", "Basé sur votre historique d'interventions"],
            ["📅 Fréquence", "Personnalisable de 1 à 90 jours selon le type"],
          ].map(([label, desc]) => (
            <div key={label} style={{ display:"flex", gap:10, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
              <span style={{ fontWeight:700, minWidth:100 }}>{label}</span>
              <span style={{ color:"#81c784" }}>{desc}</span>
            </div>
          ))}
        </div>

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
