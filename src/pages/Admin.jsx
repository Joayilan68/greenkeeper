import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";
import { appShell, btn, card, cardTitle, scroll, header } from "../lib/styles";

function safeGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function daysSince(isoStr) {
  if (!isoStr) return 999;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}

function formatEur(n) {
  return (Math.round(n * 100) / 100).toFixed(2) + "€";
}

function Bar({ value, max = 100, color = "#43a047" }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:6, height:8, width:"100%", overflow:"hidden" }}>
      <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:6, transition:"width 0.6s" }} />
    </div>
  );
}

function KPI({ label, value, sub, color = "#a5d6a7", icon }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"14px 12px", textAlign:"center" }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontSize:24, fontWeight:800, color, marginTop:4 }}>{value}</div>
      <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:"#4a7c5c", marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function Admin() {
  const [code, setCode]       = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [view, setView]       = useState("login");
  const [stats, setStats]     = useState(null);
  const [lastUpdate, setLastUpdate] = useState("");

  const { activateAdmin } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (view !== "dashboard") return;
    computeStats();
    const interval = setInterval(computeStats, 30000);
    return () => clearInterval(interval);
  }, [view]);

  function computeStats() {
    const diagnostics = safeGet("gk_diagnostics", []);
    const history     = safeGet("gk_history",     []);
    const profile     = safeGet("gk_profile",     null);
    const consents    = safeGet("gk_consents",    {});
    const subscription= safeGet("gk_subscription",null);

    const diagScores  = diagnostics.map(d => d.analysis?.score_visuel).filter(Boolean);
    const diagAvg     = diagScores.length ? Math.round(diagScores.reduce((a,b)=>a+b,0)/diagScores.length) : null;
    const diagProbs   = diagnostics.flatMap(d => d.analysis?.problemes || []);
    const probCount   = {};
    diagProbs.forEach(p => { probCount[p.nom] = (probCount[p.nom]||0)+1; });
    const topProblems = Object.entries(probCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const hist7j = history.filter(h => {
      try { const [d,m,y]=h.date.split("/"); return daysSince(new Date(y,m-1,d).toISOString())<=7; } catch { return false; }
    }).length;

    const isPremium = subscription === "premium" || subscription === "admin";

    setStats({
      diagnostics: { total:diagnostics.length, ce7j:diagnostics.filter(d=>daysSince(d.date)<=7).length, avgScore:diagAvg, topProblems },
      history:     { total:history.length, ce7j:hist7j },
      profile, consents, isPremium,
      mrr: isPremium ? 4.99 : 0,
      apiStatuses: [
        { name:"Vercel",         status:"✅", ok:true,  detail:"Déployé" },
        { name:"Groq Vision IA", status:"✅", ok:true,  detail:"Llama 4 Scout" },
        { name:"Cloudinary",     status:"✅", ok:true,  detail:"25GB gratuit" },
        { name:"Stripe",         status:"✅", ok:true,  detail:"Paiements actifs" },
        { name:"Open-Meteo",     status:"✅", ok:true,  detail:"Météo temps réel" },
        { name:"Anthropic",      status:"⚠️", ok:false, detail:"Crédits à recharger" },
        { name:"Resend Email",   status:"✅", ok:true,  detail:"Alertes actives" },
      ],
    });
    setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
  }

  function exportData() {
    const data = {
      exportDate:  new Date().toISOString(),
      diagnostics: safeGet("gk_diagnostics", []),
      history:     safeGet("gk_history", []),
      profile:     safeGet("gk_profile", null),
      consents:    safeGet("gk_consents", {}),
      location:    safeGet("gk_location_name", null),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "mg360-admin-export.json"; a.click();
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const ok = activateAdmin(code);
    if (ok) {
      setSuccess(true);
      setTimeout(() => { setView("dashboard"); setSuccess(false); }, 1000);
    } else {
      setError("Code incorrect. Réessayez.");
    }
  };

  if (view === "login") return (
    <div style={{ ...appShell, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontSize:52 }}>🔐</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7", marginTop:8 }}>Accès Admin</div>
        <div style={{ fontSize:13, color:"#81c784", marginTop:6 }}>Entrez votre code secret</div>
      </div>
      {success ? (
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48 }}>✅</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#a5d6a7", marginTop:12 }}>Accès Admin activé !</div>
          <div style={{ fontSize:13, color:"#81c784", marginTop:6 }}>Chargement du dashboard...</div>
        </div>
      ) : (
        <div style={{ width:"100%", maxWidth:320 }}>
          <input type="password" placeholder="Code secret" value={code}
            onChange={e => { setCode(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:`1px solid ${error?"#ef5350":"rgba(165,214,167,0.3)"}`, borderRadius:14, padding:"14px 16px", color:"#e8f5e9", fontSize:16, fontWeight:600, outline:"none", fontFamily:"inherit", marginBottom:8, boxSizing:"border-box" }}
          />
          {error && <div style={{ color:"#ef9a9a", fontSize:12, marginBottom:12, textAlign:"center" }}>{error}</div>}
          <button onClick={handleSubmit} style={{ ...btn.primary, marginTop:8 }}>🔓 Accéder</button>
          <button onClick={() => navigate("/")} style={{ ...btn.ghost, marginTop:10 }}>← Retour</button>
        </div>
      )}
    </div>
  );

  // ── DASHBOARD ADMIN ────────────────────────────────────────────────────────
  return (
    <div>
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"#f9a825" }}>👑 Dashboard Admin</div>
            <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>Mis à jour : {lastUpdate}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={computeStats} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 10px", color:"#81c784", fontSize:11, cursor:"pointer" }}>🔄</button>
            <button onClick={() => navigate("/")} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 10px", color:"#81c784", fontSize:11, cursor:"pointer" }}>🏠</button>
          </div>
        </div>
      </div>

      <div style={scroll}>
        {!stats ? (
          <div style={{ textAlign:"center", padding:40, color:"#81c784" }}>🔄 Chargement...</div>
        ) : (
          <>
            {/* ── KPIs ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
              <KPI icon="📸" label="Diagnostics total" value={stats.diagnostics.total} sub={`+${stats.diagnostics.ce7j} cette semaine`} color="#90caf9" />
              <KPI icon="📋" label="Interventions" value={stats.history.total} sub={`+${stats.history.ce7j} cette semaine`} color="#a5d6a7" />
              <KPI icon="💰" label="MRR estimé" value={formatEur(stats.mrr)} sub={stats.isPremium?"Premium actif":"Compte gratuit"} color="#f9a825" />
              <KPI icon="⭐" label="Statut" value={stats.isPremium?"Premium":"Gratuit"} sub="Abonnement actuel" color={stats.isPremium?"#43a047":"#81c784"} />
            </div>

            {/* ── PROFIL ── */}
            <div style={card()}>
              <div style={cardTitle}><span>👤 Profil utilisateur</span></div>
              {stats.profile ? (
                [["Type de gazon", stats.profile.pelouse], ["Type de sol", stats.profile.sol], ["Surface", stats.profile.surface+" m²"]].map(([label, val]) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                    <span style={{ color:"#81c784" }}>{label}</span>
                    <span style={{ fontWeight:700 }}>{val}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize:12, color:"#81c784", textAlign:"center", padding:8 }}>Profil non configuré</div>
              )}
            </div>

            {/* ── DIAGNOSTICS ── */}
            {stats.diagnostics.total > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🔬 Diagnostics photo</span></div>
                <div style={{ display:"flex", justifyContent:"space-around", marginBottom:12 }}>
                  {[{val:stats.diagnostics.total,label:"Total",color:"#90caf9"},{val:stats.diagnostics.ce7j,label:"7 derniers jours",color:"#a5d6a7"},{val:stats.diagnostics.avgScore??0,label:"Score moyen",color:"#f9a825"}].map(({val,label,color})=>(
                    <div key={label} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color }}>{val}</div>
                      <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
                    </div>
                  ))}
                </div>
                {stats.diagnostics.avgScore && <Bar value={stats.diagnostics.avgScore} color={stats.diagnostics.avgScore>=70?"#43a047":stats.diagnostics.avgScore>=50?"#f9a825":"#ef5350"} />}
                {stats.diagnostics.topProblems.length > 0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, color:"#81c784", marginBottom:6 }}>Problèmes les plus fréquents</div>
                    {stats.diagnostics.topProblems.map(([nom, count]) => (
                      <div key={nom} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:11 }}>
                        <span>🔬 {nom}</span>
                        <span style={{ background:"rgba(239,83,80,0.2)", color:"#ef9a9a", borderRadius:20, padding:"2px 8px", fontSize:10 }}>{count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SERVICES ── */}
            <div style={card()}>
              <div style={cardTitle}><span>⚙️ Statut des services</span></div>
              {stats.apiStatuses.map(s => (
                <div key={s.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                  <span style={{ fontWeight:700 }}>{s.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:10, color: s.ok?"#81c784":"#ffcc80" }}>{s.detail}</span>
                    <span>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── ACTIONS ADMIN ── */}
            <div style={card()}>
              <div style={cardTitle}><span>⚡ Actions admin</span></div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <button onClick={() => navigate("/pilotage")} style={{ ...btn.primary, fontSize:13, padding:"12px" }}>
                  📊 Dashboard Pilotage
                </button>
                <button onClick={exportData} style={{ ...btn.ghost, fontSize:13 }}>
                  📥 Exporter toutes les données (JSON)
                </button>
                <button onClick={() => navigate("/diagnostic")} style={{ ...btn.ghost, fontSize:13 }}>
                  🔬 Voir les diagnostics
                </button>
                <button onClick={() => navigate("/parametres")} style={{ ...btn.ghost, fontSize:13 }}>
                  ⚙️ Paramètres & données
                </button>
                <button onClick={() => { localStorage.removeItem("gk_diagnostics"); computeStats(); }}
                  style={{ background:"rgba(198,40,40,0.15)", border:"1px solid rgba(198,40,40,0.3)", borderRadius:12, padding:"10px", color:"#ef9a9a", fontSize:12, cursor:"pointer", fontWeight:700 }}>
                  🗑️ Réinitialiser diagnostics (test)
                </button>
              </div>
            </div>

            <div style={{ paddingBottom:32 }} />
          </>
        )}
      </div>
    </div>
  );
}
