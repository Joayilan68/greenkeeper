// src/pages/Pilotage.jsx
// Dashboard de pilotage — réservé admin

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";
import { card, cardTitle, btn, scroll, header, appShell } from "../lib/styles";

function safeGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function daysSince(isoStr) {
  if (!isoStr) return 999;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}

function Bar({ value, max = 100, color = "#43a047" }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:6, height:6, width:"100%", overflow:"hidden", marginTop:4 }}>
      <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:6 }} />
    </div>
  );
}

const SEV_STYLE = {
  error:   { bg:"rgba(198,40,40,0.2)",  border:"rgba(229,57,53,0.4)",  color:"#ef9a9a",  label:"🔴 Critique" },
  warning: { bg:"rgba(230,81,0,0.2)",   border:"rgba(239,108,0,0.4)",  color:"#ffcc80",  label:"🟠 Warning"  },
  info:    { bg:"rgba(21,101,192,0.15)", border:"rgba(66,165,245,0.3)", color:"#90caf9",  label:"🔵 Info"     },
};

export default function Pilotage() {
  const navigate               = useNavigate();
  const { isAdmin }            = useSubscription() || {};
  const [stats, setStats]      = useState(null);
  const [logs, setLogs]        = useState([]);
  const [sending, setSending]  = useState(false);
  const [sent, setSent]        = useState("");
  const [lastUpdate, setLastUpdate] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    compute();
    const t = setInterval(compute, 30000);
    return () => clearInterval(t);
  }, [isAdmin]);

  function compute() {
    const diagnostics = safeGet("gk_diagnostics", []);
    const history     = safeGet("gk_history",     []);
    const profile     = safeGet("gk_profile",     null);
    const consents    = safeGet("gk_consents",    {});
    const alertLogs   = safeGet("gk_pilotage_logs", []);

    const diagScores  = diagnostics.map(d => d.analysis?.score_visuel).filter(Boolean);
    const diagAvg     = diagScores.length ? Math.round(diagScores.reduce((a,b)=>a+b,0)/diagScores.length) : 0;
    const diagProbs   = diagnostics.flatMap(d => d.analysis?.problemes || []);
    const probCount   = {};
    diagProbs.forEach(p => { probCount[p.nom] = (probCount[p.nom]||0)+1; });
    const topProbs    = Object.entries(probCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const hist7j = history.filter(h => {
      try { const [d,m,y]=h.date.split("/"); return daysSince(new Date(y,m-1,d).toISOString())<=7; } catch { return false; }
    }).length;

    const errors7j   = alertLogs.filter(l => daysSince(l.date)<=7 && l.severity==="error").length;
    const warnings7j = alertLogs.filter(l => daysSince(l.date)<=7 && l.severity==="warning").length;

    setStats({
      diagnostics:  { total:diagnostics.length, avg:diagAvg, topProbs, ce7j:diagnostics.filter(d=>daysSince(d.date)<=7).length },
      history:      { total:history.length, ce7j:hist7j },
      profile,
      consents,
      errors7j,
      warnings7j,
      services: [
        { name:"Vercel",          status:"✅", ok:true,  detail:"Déployé" },
        { name:"Groq Vision IA",  status:"✅", ok:true,  detail:"Llama 4 Scout" },
        { name:"Cloudinary",      status:"✅", ok:true,  detail:"25GB gratuit" },
        { name:"Stripe",          status:"✅", ok:true,  detail:"Paiements actifs" },
        { name:"Open-Meteo",      status:"✅", ok:true,  detail:"Météo temps réel" },
        { name:"Anthropic",       status:"⚠️", ok:false, detail:"Crédits à recharger" },
        { name:"Gemini",          status:"⚠️", ok:false, detail:"Quota limité" },
        { name:"Resend Email",    status:"✅", ok:true,  detail:"Alertes actives" },
      ],
      roadmap: [
        { phase:"Phase 1",      pct:100, color:"#43a047" },
        { phase:"Phase 2",      pct:100, color:"#43a047" },
        { phase:"Juridique",    pct:64,  color:"#ec407a" },
        { phase:"Phase 3",      pct:0,   color:"#e65100" },
        { phase:"Phase 4",      pct:0,   color:"#6a1b9a" },
      ],
    });
    setLogs(alertLogs.slice(0, 20));
    setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
  }

  // Envoyer le rapport maintenant
  const sendReportNow = async () => {
    setSending(true); setSent("");
    try {
      const res  = await fetch("/api/weekly-report");
      const data = await res.json();
      if (data.success) setSent("✅ Rapport envoyé à jordankrebs1@gmail.com !");
      else setSent("❌ Erreur : " + data.error);
    } catch (e) {
      setSent("❌ Erreur réseau : " + e.message);
    } finally {
      setSending(false);
      setTimeout(() => setSent(""), 5000);
    }
  };

  // Tester l'alerte bug
  const sendTestAlert = async () => {
    setSending(true); setSent("");
    try {
      const res  = await fetch("/api/send-alert", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          type:     "Test alerte manuelle",
          message:  "Ceci est un test du système d'alerte MG360. Si vous recevez cet email, le système fonctionne correctement.",
          details:  { "Déclencheur":"Manuel depuis Dashboard Pilotage", "Heure": new Date().toLocaleString("fr-FR") },
          severity: "info"
        })
      });
      const data = await res.json();
      if (data.success) setSent("✅ Alerte test envoyée à jordankrebs1@gmail.com !");
      else setSent("❌ Erreur : " + data.error);
    } catch (e) {
      setSent("❌ Erreur : " + e.message);
    } finally {
      setSending(false);
      setTimeout(() => setSent(""), 5000);
    }
  };

  // Effacer les logs
  const clearLogs = () => {
    localStorage.removeItem("gk_pilotage_logs");
    setLogs([]);
  };

  // ── Accès non autorisé ───────────────────────────────────────────────────
  if (!isAdmin) return (
    <div style={{ ...appShell, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, color:"#ef9a9a", marginBottom:8 }}>Accès restreint</div>
      <div style={{ fontSize:13, color:"#81c784", marginBottom:24 }}>Ce dashboard est réservé à l'administrateur.</div>
      <button onClick={() => navigate("/admin")} style={{ ...btn.primary, width:"auto", padding:"10px 24px" }}>🔐 Se connecter Admin</button>
      <button onClick={() => navigate("/")} style={{ ...btn.ghost, marginTop:10, width:"auto", padding:"8px 20px" }}>← Retour</button>
    </div>
  );

  return (
    <div>
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"#f9a825" }}>📊 Pilotage</div>
            <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>Mis à jour : {lastUpdate}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={compute} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 10px", color:"#81c784", fontSize:11, cursor:"pointer" }}>🔄</button>
            <button onClick={() => navigate("/")} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 10px", color:"#81c784", fontSize:11, cursor:"pointer" }}>🏠</button>
          </div>
        </div>
      </div>

      <div style={scroll}>
        {!stats ? (
          <div style={{ textAlign:"center", padding:40, color:"#81c784" }}>🔄 Chargement...</div>
        ) : (
          <>
            {/* ── KPIs GLOBAUX ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:4 }}>
              {[
                { icon:"🐛", val:stats.errors7j,   label:"Bugs 7j",     color:"#ef9a9a" },
                { icon:"⚠️", val:stats.warnings7j,  label:"Warnings 7j", color:"#ffcc80" },
                { icon:"📸", val:stats.diagnostics.ce7j, label:"Diag 7j", color:"#90caf9" },
              ].map(({ icon, val, label, color }) => (
                <div key={label} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:20 }}>{icon}</div>
                  <div style={{ fontSize:22, fontWeight:800, color, marginTop:4 }}>{val}</div>
                  <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* ── ACTIONS RAPIDES ── */}
            <div style={card()}>
              <div style={cardTitle}><span>⚡ Actions</span></div>
              {sent && (
                <div style={{ background: sent.startsWith("✅") ? "rgba(76,175,80,0.2)" : "rgba(198,40,40,0.2)", border:`1px solid ${sent.startsWith("✅")?"#43a047":"#c62828"}`, borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:12, color: sent.startsWith("✅") ? "#a5d6a7" : "#ef9a9a" }}>
                  {sent}
                </div>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={sendReportNow} disabled={sending} style={{ ...btn.primary, fontSize:13, padding:"12px", opacity:sending?0.7:1 }}>
                  {sending ? "⌛ Envoi..." : "📧 Envoyer rapport maintenant"}
                </button>
                <button onClick={sendTestAlert} disabled={sending} style={{ ...btn.ghost, fontSize:13, padding:"10px", opacity:sending?0.7:1 }}>
                  🧪 Tester l'alerte email
                </button>
                <button onClick={clearLogs} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"8px", color:"#81c784", fontSize:12, cursor:"pointer" }}>
                  🗑️ Effacer les logs
                </button>
              </div>
              <div style={{ fontSize:10, color:"#4a7c5c", marginTop:10, textAlign:"center" }}>
                📅 Rapport automatique chaque lundi à 8h00 → jordankrebs1@gmail.com
              </div>
            </div>

            {/* ── STATUT SERVICES ── */}
            <div style={card()}>
              <div style={cardTitle}><span>⚙️ Services</span></div>
              {stats.services.map(s => (
                <div key={s.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span>{s.status}</span>
                    <span style={{ fontSize:12, fontWeight:700 }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize:10, color: s.ok ? "#81c784" : "#ffcc80" }}>{s.detail}</span>
                </div>
              ))}
            </div>

            {/* ── AVANCEMENT ROADMAP ── */}
            <div style={card()}>
              <div style={cardTitle}><span>🗺️ Roadmap</span></div>
              {stats.roadmap.map(r => (
                <div key={r.phase} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                    <span style={{ fontWeight:700 }}>{r.phase}</span>
                    <span style={{ color:r.color, fontWeight:700 }}>{r.pct}%</span>
                  </div>
                  <Bar value={r.pct} color={r.color} />
                </div>
              ))}
            </div>

            {/* ── DIAGNOSTICS ── */}
            {stats.diagnostics.total > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🔬 Diagnostics photo</span></div>
                <div style={{ display:"flex", justifyContent:"space-around", marginBottom:12 }}>
                  {[
                    { val:stats.diagnostics.total, label:"Total",      color:"#90caf9" },
                    { val:stats.diagnostics.ce7j,  label:"7 derniers", color:"#a5d6a7" },
                    { val:stats.diagnostics.avg||0, label:"Score moy.", color:"#f9a825" },
                  ].map(({ val, label, color }) => (
                    <div key={label} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color }}>{val}</div>
                      <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
                    </div>
                  ))}
                </div>
                {stats.diagnostics.topProbs.length > 0 && (
                  <>
                    <div style={{ fontSize:11, color:"#81c784", marginBottom:6 }}>Top problèmes détectés</div>
                    {stats.diagnostics.topProbs.map(([nom, count]) => (
                      <div key={nom} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:11 }}>
                        <span>{nom}</span>
                        <span style={{ background:"rgba(239,83,80,0.2)", color:"#ef9a9a", borderRadius:20, padding:"1px 7px", fontSize:10 }}>{count}x</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── LOGS D'ALERTES ── */}
            <div style={card()}>
              <div style={cardTitle}>
                <span>🐛 Logs d'alertes ({logs.length})</span>
              </div>
              {logs.length === 0 ? (
                <div style={{ textAlign:"center", fontSize:12, color:"#81c784", padding:"12px 0" }}>
                  ✅ Aucune alerte enregistrée
                </div>
              ) : (
                logs.map((log, i) => {
                  const s = SEV_STYLE[log.severity] || SEV_STYLE.error;
                  return (
                    <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:"10px 12px", marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{log.type}</span>
                        <span style={{ fontSize:10, color:"#81c784" }}>{new Date(log.date).toLocaleString("fr-FR")}</span>
                      </div>
                      <div style={{ fontSize:11, color:"#e8f5e9", lineHeight:1.5 }}>{log.message}</div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div style={{ marginTop:6 }}>
                          {Object.entries(log.details).map(([k,v]) => (
                            <span key={k} style={{ fontSize:9, color:"#81c784", marginRight:8 }}>{k}: {v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ paddingBottom:32 }} />
          </>
        )}
      </div>
    </div>
  );
}
