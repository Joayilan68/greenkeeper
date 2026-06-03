// src/pages/Pilotage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useSubscription } from "../lib/useSubscription";
import { card, cardTitle, btn, scroll, header, appShell } from "../lib/styles";
import { supabase } from "../lib/supabase";

function safeGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function daysSince(isoStr) {
  if (!isoStr) return 999;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}
function eur(n) { return (Math.round((n||0)*100)/100).toFixed(2) + "€"; }

function Bar({ value, max = 100, color = "#43a047" }) {
  const pct = Math.min(100, Math.round((value / (max||1)) * 100));
  return (
    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:6, height:6, width:"100%", overflow:"hidden", marginTop:4 }}>
      <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:6, transition:"width 0.6s" }} />
    </div>
  );
}

function MiniChart({ data, valueKey, color = "#43a047", unit = "" }) {
  if (!data?.length) return null;
  const max  = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const W    = 280; const H = 60; const BAR = Math.floor((W - data.length * 2) / data.length);
  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={H + 20} style={{ display:"block" }}>
        {data.map((d, i) => {
          const h   = Math.max(2, Math.round((d[valueKey] / max) * H));
          const x   = i * (BAR + 2);
          const y   = H - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={BAR} height={h} fill={color} opacity={0.8} rx={2} />
              <text x={x + BAR/2} y={H + 14} textAnchor="middle" fill="#81c784" fontSize={8}>{d.label}</text>
              {d[valueKey] > 0 && <text x={x + BAR/2} y={y - 2} textAnchor="middle" fill="#e8f5e9" fontSize={8}>{d[valueKey]}{unit}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function KPI({ icon, label, value, sub, color = "#a5d6a7" }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
      <div style={{ fontSize:20 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color, marginTop:4 }}>{value}</div>
      <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:9, color:"#4a7c5c", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ✅ FIX 01/06/2026 — Composant pour afficher les sources UTM
// Affiche les sources avec icône, label et compteur, masque celles à 0
const SOURCE_META = {
  direct:    { icon: "🔗", label: "Direct",    color: "#a5d6a7" },
  instagram: { icon: "📸", label: "Instagram", color: "#f48fb1" },
  tiktok:    { icon: "🎵", label: "TikTok",    color: "#80deea" },
  facebook:  { icon: "📘", label: "Facebook",  color: "#90caf9" },
  twitter:   { icon: "🐦", label: "Twitter/X", color: "#81d4fa" },
  youtube:   { icon: "📺", label: "YouTube",   color: "#ef9a9a" },
  google:    { icon: "🔍", label: "Google",    color: "#ffcc80" },
  email:     { icon: "✉️", label: "Email",     color: "#ce93d8" },
  linkedin:  { icon: "💼", label: "LinkedIn",  color: "#9fa8da" },
  autre:     { icon: "🌐", label: "Autre",     color: "#bcaaa4" },
};

function SourceBreakdown({ sources, title }) {
  if (!sources) return null;
  const entries = Object.entries(sources)
    .filter(([_, count]) => count > 0)
    .sort(([,a], [,b]) => b - a);

  if (entries.length === 0) {
    return (
      <div style={card()}>
        <div style={cardTitle}><span>{title}</span></div>
        <div style={{ fontSize:11, color:"#4a7c5c", textAlign:"center", padding:"12px 0" }}>
          Aucune donnée pour l'instant
        </div>
      </div>
    );
  }

  const total = entries.reduce((s, [,c]) => s + c, 0);

  return (
    <div style={card()}>
      <div style={cardTitle}><span>{title}</span><span style={{ fontSize:11, color:"#81c784" }}>{total} total</span></div>
      {entries.map(([src, count]) => {
        const m   = SOURCE_META[src] || SOURCE_META.autre;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={src} style={{ padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
              <span style={{ fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                <span>{m.icon}</span>
                <span style={{ color:"#e8f5e9", fontWeight:600 }}>{m.label}</span>
              </span>
              <span style={{ fontSize:11, fontWeight:700, color:m.color }}>
                {count} <span style={{ fontSize:9, color:"#81c784" }}>({pct}%)</span>
              </span>
            </div>
            <Bar value={pct} color={m.color} />
          </div>
        );
      })}
    </div>
  );
}

const SEV_STYLE = {
  error:   { bg:"rgba(198,40,40,0.2)",  border:"rgba(229,57,53,0.4)",  color:"#ef9a9a" },
  warning: { bg:"rgba(230,81,0,0.2)",   border:"rgba(239,108,0,0.4)",  color:"#ffcc80" },
  info:    { bg:"rgba(21,101,192,0.15)", border:"rgba(66,165,245,0.3)", color:"#90caf9" },
};

export default function Pilotage() {
  const navigate              = useNavigate();
  const { getToken }          = useAuth();
  const { isAdmin }           = useSubscription() || {};
  const [users, setUsers]     = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [local, setLocal]     = useState(null);
  const [logs, setLogs]       = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [loadingUsers, setLoadingUsers]     = useState(false);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [tab, setTab]         = useState("activite");
  const [preinscriptions, setPreinscriptions] = useState([]);
  const [preinscLoading, setPreinscLoading]   = useState(false);
  const [preinscTotal, setPreinscTotal]       = useState(0);
  const [purging, setPurging]             = useState(false);
  const [purgeResult, setPurgeResult]     = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});

  // ── Roadmap Google Sheets ──────────────────────────────────────────────────
  const SHEETS_EDIT_URL = "https://docs.google.com/spreadsheets/d/1RzCsdKNeBtYjWkAUXPm7X7Xg1nA1dufq6ka2jzhMJBM/edit";
  const [roadmap, setRoadmap]           = useState([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError]     = useState(null);
  const [roadmapMeta, setRoadmapMeta]       = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
    const t = setInterval(fetchAll, 60000);
    return () => clearInterval(t);
  }, [isAdmin]);

  async function fetchAll() {
    computeLocal();
    fetchUsers();
    fetchRevenue();
    fetchPreinscriptions();
    fetchRoadmap();
    setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
  }

  async function fetchRoadmap() {
    setRoadmapLoading(true);
    setRoadmapError(null);
    try {
      const SHEET_ID  = "1RzCsdKNeBtYjWkAUXPm7X7Xg1nA1dufq6ka2jzhMJBM";
      const API_KEY   = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      const RANGE     = encodeURIComponent("📊 Tableau de bord!A1:H200");
      const apiUrl    = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const rows = json.values || [];

      if (!rows.length) throw new Error("Feuille vide");

      const dateLine  = (rows[1]?.[0] || "");
      const dateMatch = dateLine.match(/Mis à jour le (\d{2}\/\d{2}\/\d{4})/);
      const majDate   = dateMatch ? dateMatch[1] : null;

      const headerIdx = rows.findIndex(r => r[0] === "Phase");
      if (headerIdx < 0) throw new Error("Format inattendu — colonne Phase introuvable");

      const dataRows  = rows.slice(headerIdx + 1);
      const tasks     = [];
      let pctGlobal   = null;

      for (const cols of dataRows) {
        const [phase="", etape="", desc="", statut="", priorite="", dateCible="", notes="", pctRaw=""] = cols;
        if (!phase.trim()) continue;

        if (phase.includes("TOTAL")) {
          const pctStr = (pctRaw || "").replace(/[^0-9,.]/g, "").replace(",", ".");
          pctGlobal = parseFloat(pctStr) || null;
          continue;
        }

        const pct = parseInt((pctRaw || "0").replace(/[^0-9]/g, "")) || 0;
        tasks.push({
          phase:     phase.trim(),
          etape:     etape.trim(),
          desc:      desc.trim(),
          statut:    statut.trim(),
          priorite:  priorite.trim(),
          dateCible: dateCible.trim(),
          notes:     notes.trim(),
          pct,
        });
      }

      setRoadmap(tasks);
      setRoadmapMeta({ date: majDate, pctGlobal });
    } catch (e) {
      setRoadmapError("Impossible de charger la roadmap : " + e.message);
    }
    setRoadmapLoading(false);
  }

  async function fetchPreinscriptions() {
    setPreinscLoading(true);
    try {
      const { data, count, error } = await supabase
        .from('preinscriptions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) {
        setPreinscriptions(data || []);
        setPreinscTotal(count || 0);
      }
    } catch {}
    setPreinscLoading(false);
  }

  function exportCSV() {
    if (!preinscriptions.length) return;
    const header = 'Email,Source,Date\n';
    const rows = preinscriptions.map(p =>
      `${p.email},${p.source},${new Date(p.created_at).toLocaleDateString('fr-FR')}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `MG360_preinscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function purgeDiagnostics() {
    setPurging(true); setPurgeResult(null);
    try {
      const token = await getToken();
      const res   = await fetch("/api/analyze-lawn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "purge" }),
      });
      const data  = await res.json();
      setPurgeResult(data.message || `${data.deleted} photo(s) supprimée(s)`);
    } catch (e) {
      setPurgeResult("Erreur : " + e.message);
    }
    setPurging(false);
  }

  function computeLocal() {
    const diagnostics = safeGet("gk_diagnostics", []);
    const history     = safeGet("gk_history", []);
    const alertLogs   = safeGet("gk_pilotage_logs", []);
    const diagScores  = diagnostics.map(d => d.analysis?.score_visuel).filter(Boolean);
    const diagAvg     = diagScores.length ? Math.round(diagScores.reduce((a,b)=>a+b,0)/diagScores.length) : 0;
    const diagProbs   = diagnostics.flatMap(d => d.analysis?.problemes || []);
    const probCount   = {};
    diagProbs.forEach(p => { probCount[p.nom] = (probCount[p.nom]||0)+1; });
    const topProbs    = Object.entries(probCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const hist7j      = history.filter(h => {
      try { const [d,m,y]=h.date.split("/"); return daysSince(new Date(y,m-1,d).toISOString())<=7; } catch { return false; }
    }).length;
    setLocal({ diagnostics:{ total:diagnostics.length, ce7j:diagnostics.filter(d=>daysSince(d.date)<=7).length, avg:diagAvg, topProbs }, history:{ total:history.length, ce7j:hist7j }, errors7j:alertLogs.filter(l=>daysSince(l.date)<=7&&l.severity==="error").length, warnings7j:alertLogs.filter(l=>daysSince(l.date)<=7&&l.severity==="warning").length });
    setLogs(alertLogs.slice(0, 20));
  }

  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const res  = await fetch("/api/stats?type=users");
      const data = await res.json();
      if (data.success) setUsers(data);
    } catch {}
    setLoadingUsers(false);
  }

  async function fetchRevenue() {
    setLoadingRevenue(true);
    try {
      const res  = await fetch("/api/stats?type=revenue");
      const data = await res.json();
      if (data.success) setRevenue(data);
    } catch {}
    setLoadingRevenue(false);
  }

  const sendReportNow = async () => {
    setSending(true); setSent("");
    try {
      const res  = await fetch("/api/weekly-report");
      const data = await res.json();
      setSent(data.success ? "✅ Rapport envoyé à mongazon360@gmail.com !" : "❌ Erreur : " + data.error);
    } catch (e) { setSent("❌ Erreur : " + e.message); }
    setSending(false);
    setTimeout(() => setSent(""), 5000);
  };

  const sendTestAlert = async () => {
    setSending(true); setSent("");
    try {
      const res  = await fetch("/api/send-alert", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ type:"Test alerte manuelle", message:"Test du système d'alerte MG360 — tout fonctionne correctement.", details:{ "Déclencheur":"Manuel", "Heure":new Date().toLocaleString("fr-FR") }, severity:"info" })
      });
      const data = await res.json();
      setSent(data.success ? "✅ Alerte test envoyée !" : "❌ Erreur : " + data.error);
    } catch (e) { setSent("❌ Erreur : " + e.message); }
    setSending(false);
    setTimeout(() => setSent(""), 5000);
  };

  if (!isAdmin) return (
    <div style={{ ...appShell, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, color:"#ef9a9a", marginBottom:8 }}>Accès restreint</div>
      <div style={{ fontSize:13, color:"#81c784", marginBottom:24 }}>Ce dashboard est réservé à l'administrateur.</div>
      <button onClick={() => navigate("/admin")} style={{ ...btn.primary, width:"auto", padding:"10px 24px" }}>🔐 Se connecter Admin</button>
    </div>
  );

  const tabs = [
    { id:"activite",        label:"👥 Activité" },
    { id:"finances",        label:"💰 Finances" },
    { id:"roadmap",         label:"📊 Roadmap" },
    { id:"services",        label:"⚙️ Services" },
    { id:"bugs",            label:"🐛 Bugs" },
    { id:"preinscriptions", label:"📬 Pré-inscrits" },
  ];

  const PHASE_ORDER = ["Phase 1","Juridique","Phase 2","Phase 3","Tech","Stores","Growth J1-J30","Growth J30-J90","Marketing","Sprint IA","Phase 4","Sécurité","Branding"];
  const PHASE_COLORS = {
    "Phase 1":         "#43a047", "Phase 2":   "#1565c0",
    "Phase 3":         "#00897b", "Phase 4":   "#6a1b9a",
    "Juridique":       "#e65100", "Sécurité":  "#558b2f",
    "Branding":        "#ad1457", "Tech":      "#c62828",
    "Stores":          "#00838f", "Marketing": "#ec407a",
    "Sprint IA":       "#0288d1", "Growth J1-J30": "#fbc02d",
    "Growth J30-J90":  "#f9a825",
  };
  const STATUT_STYLE = {
    "✅ Terminé":   { bg:"rgba(67,160,71,0.15)",  border:"rgba(67,160,71,0.4)",   color:"#a5d6a7" },
    "⚠️ En cours": { bg:"rgba(230,81,0,0.15)",   border:"rgba(230,81,0,0.4)",    color:"#ffcc80" },
    "🟡 En cours": { bg:"rgba(230,81,0,0.15)",   border:"rgba(230,81,0,0.4)",    color:"#ffcc80" },
    "🔵 Partiel":   { bg:"rgba(21,101,192,0.15)", border:"rgba(66,165,245,0.35)", color:"#90caf9" },
    "❌ À faire":   { bg:"rgba(198,40,40,0.12)",  border:"rgba(229,57,53,0.3)",   color:"#ef9a9a" },
  };

  const phaseStats = PHASE_ORDER.map(phase => {
    const tasks  = roadmap.filter(t => t.phase === phase);
    if (!tasks.length) return null;
    const done   = tasks.filter(t => t.statut === "✅ Terminé").length;
    const pct    = Math.round((done / tasks.length) * 100);
    return { phase, tasks, done, total: tasks.length, pct };
  }).filter(Boolean);

  return (
    <div>
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
          <div>
            {/* ✅ Le ™ ne s'applique qu'à "Mongazon360" (marque déposée EUIPO), pas aux noms d'écrans génériques */}
            <div style={{ fontSize:18, fontWeight:800, color:"#f9a825" }}>📊 Pilotage</div>
            <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>Mis à jour : {lastUpdate}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={fetchAll} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 10px", color:"#81c784", fontSize:11, cursor:"pointer" }}>🔄</button>
            <button onClick={() => navigate("/")} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 10px", color:"#81c784", fontSize:11, cursor:"pointer" }}>🏠</button>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, padding:"0 12px 12px", overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab===t.id ? "rgba(249,168,37,0.25)" : "rgba(255,255,255,0.06)", border: tab===t.id ? "1px solid rgba(249,168,37,0.5)" : "1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"6px 14px", color: tab===t.id ? "#f9a825" : "#81c784", fontSize:12, fontWeight: tab===t.id ? 700 : 400, cursor:"pointer", whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={scroll}>

        {/* ════════════════ TAB ACTIVITÉ ════════════════ */}
        {tab === "activite" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
              <KPI icon="👥" label="Total inscrits" value={loadingUsers ? "..." : (users?.total ?? "—")} sub="Tous comptes" color="#a5d6a7" />
              <KPI icon="🆕" label="Nouveaux 7j" value={loadingUsers ? "..." : (users?.newLast7 ?? "—")} sub={users?.newLast30 ? `+${users.newLast30} ce mois` : ""} color="#90caf9" />
              <KPI icon="✅" label="Actifs 30j" value={loadingUsers ? "..." : (users?.activeL30 ?? "—")} sub="Connectés ce mois" color="#a5d6a7" />
              <KPI icon="📸" label="Diagnostics" value={local?.diagnostics.total ?? "—"} sub={`+${local?.diagnostics.ce7j ?? 0} cette semaine`} color="#ce93d8" />
            </div>

            {/* ✅ FIX 01/06/2026 — Sources des inscrits Clerk (UTM first-touch) */}
            <SourceBreakdown
              sources={users?.clerkSources}
              title="🎯 Sources d'inscription (comptes créés)"
            />

            {users?.weeks && (
              <div style={card()}>
                <div style={cardTitle}><span>📈 Inscriptions — 8 semaines</span></div>
                <MiniChart data={users.weeks} valueKey="count" color="#43a047" />
              </div>
            )}
            {users?.months && (
              <div style={card()}>
                <div style={cardTitle}><span>📅 Inscriptions — 6 mois</span></div>
                <MiniChart data={users.months} valueKey="count" color="#1565c0" />
              </div>
            )}
            {local?.diagnostics.topProbs?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🔬 Top problèmes détectés</span></div>
                {local.diagnostics.topProbs.map(([nom, count]) => (
                  <div key={nom} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                    <span>{nom}</span>
                    <span style={{ background:"rgba(239,83,80,0.2)", color:"#ef9a9a", borderRadius:20, padding:"2px 8px", fontSize:10 }}>{count}x</span>
                  </div>
                ))}
              </div>
            )}
            {loadingUsers && (
              <div style={{ textAlign:"center", color:"#81c784", fontSize:12, padding:16 }}>🔄 Chargement données Clerk...</div>
            )}
          </>
        )}

        {/* ════════════════ TAB FINANCES ════════════════ */}
        {tab === "finances" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
              <KPI icon="💰" label="MRR" value={loadingRevenue ? "..." : eur(revenue?.mrr)} sub="Revenus mensuels récurrents" color="#f9a825" />
              <KPI icon="📆" label="ARR" value={loadingRevenue ? "..." : eur(revenue?.arr)} sub="Revenus annuels projetés" color="#ffcc80" />
              <KPI icon="📅" label="Premium mensuel" value={loadingRevenue ? "..." : (revenue?.premiumMonthly ?? "—")} sub="Abonnés @ 4,99€/mois" color="#a5d6a7" />
              <KPI icon="🗓️" label="Premium annuel" value={loadingRevenue ? "..." : (revenue?.premiumYearly ?? "—")} sub="Abonnés @ 39,99€/an" color="#90caf9" />
            </div>
            {revenue?.balance && (
              <div style={{ ...card(), background:"rgba(249,168,37,0.08)", border:"1px solid rgba(249,168,37,0.25)" }}>
                <div style={cardTitle}><span>🏦 Solde Stripe</span></div>
                <div style={{ display:"flex", justifyContent:"space-around" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:800, color:"#f9a825" }}>{eur(revenue.balance.available)}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>Disponible</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:800, color:"#ffcc80" }}>{eur(revenue.balance.pending)}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>En attente</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>{revenue?.totalPremium ?? "—"}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>Abonnés total</div>
                  </div>
                </div>
              </div>
            )}
            {revenue?.weeks && (
              <div style={card()}>
                <div style={cardTitle}><span>📈 Revenus — 8 semaines (€)</span></div>
                <MiniChart data={revenue.weeks} valueKey="revenue" color="#f9a825" unit="€" />
              </div>
            )}
            {revenue?.months && (
              <div style={card()}>
                <div style={cardTitle}><span>📅 Revenus — 6 mois (€)</span></div>
                <MiniChart data={revenue.months} valueKey="revenue" color="#e65100" unit="€" />
              </div>
            )}
            <div style={card()}>
              <div style={cardTitle}><span>💎 Sources de revenus</span></div>
              {[
                { label:"Abonnements mensuel", val:revenue ? eur((revenue.premiumMonthly||0)*4.99) : "—", statut:"✅ Actif", color:"#a5d6a7" },
                { label:"Abonnements annuel",  val:revenue ? eur((revenue.premiumYearly||0)*39.99)  : "—", statut:"✅ Actif", color:"#a5d6a7" },
                { label:"Affiliation Amazon",  val:"0€", statut:"✅ Actif", color:"#a5d6a7" },
                { label:"Données anonymisées", val:"0€", statut:"⏳ Phase 4", color:"#f9a825" },
                { label:"Marque propre MG360", val:"0€", statut:"⏳ Phase 4", color:"#f9a825" },
              ].map(({ label, val, statut, color }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                  <span>{label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:700, color }}>{val}</span>
                    <span style={{ fontSize:10, color:"#81c784" }}>{statut}</span>
                  </div>
                </div>
              ))}
            </div>
            {loadingRevenue && (
              <div style={{ textAlign:"center", color:"#81c784", fontSize:12, padding:16 }}>🔄 Chargement données Stripe...</div>
            )}
          </>
        )}

        {/* ════════════════ TAB ROADMAP ════════════════ */}
        {tab === "roadmap" && (
          <>
            <div style={{ ...card(), background:"rgba(249,168,37,0.06)", border:"1px solid rgba(249,168,37,0.2)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#f9a825" }}>📊 Suivi de Projet MG360</div>
                  {roadmapMeta?.date && (
                    <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>Mis à jour le {roadmapMeta.date} — Google Sheets live</div>
                  )}
                </div>
                <div style={{ textAlign:"right" }}>
                  {roadmapMeta?.pctGlobal != null && (
                    <div style={{ fontSize:22, fontWeight:900, color:"#f9a825" }}>{roadmapMeta?.pctGlobal?.toFixed(0)}%</div>
                  )}
                  <div style={{ fontSize:10, color:"#81c784" }}>Avancement global</div>
                </div>
              </div>
              <button onClick={fetchRoadmap} disabled={roadmapLoading} style={{ marginTop:10, width:"100%", background:"rgba(249,168,37,0.1)", border:"1px solid rgba(249,168,37,0.25)", borderRadius:8, padding:"7px", color:"#f9a825", fontSize:11, cursor:"pointer", opacity: roadmapLoading ? 0.6 : 1 }}>
                {roadmapLoading ? "🔄 Synchronisation..." : "↻ Synchroniser depuis Google Sheets"}
              </button>
              <button
                onClick={() => window.open(SHEETS_EDIT_URL, "_blank", "noopener,noreferrer")}
                style={{ marginTop:6, width:"100%", background:"rgba(52,168,83,0.12)", border:"1px solid rgba(52,168,83,0.3)", borderRadius:8, padding:"7px", color:"#52d48a", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
              >
                <span style={{ fontSize:14 }}>📝</span> Modifier dans Google Sheets
              </button>
              {roadmapError && (
                <div style={{ marginTop:8, fontSize:11, color:"#ef9a9a", background:"rgba(198,40,40,0.1)", borderRadius:8, padding:"6px 10px" }}>{roadmapError}</div>
              )}
            </div>

            {phaseStats.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🗺️ Avancement par phase</span></div>
                {phaseStats.map(({ phase, done, total, pct }) => (
                  <div key={phase} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                      <span style={{ fontWeight:700 }}>{phase}</span>
                      <span style={{ color: PHASE_COLORS[phase] || "#a5d6a7", fontWeight:700 }}>{done}/{total} — {pct}%</span>
                    </div>
                    <Bar value={pct} color={PHASE_COLORS[phase] || "#43a047"} />
                  </div>
                ))}
              </div>
            )}

            {phaseStats.map(({ phase, tasks }) => {
              const urgent    = tasks.filter(t => t.statut !== "✅ Terminé");
              const isExpanded = expandedPhases[phase] || false;
              return (
                <div key={phase} style={card()}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: isExpanded ? 12 : 0 }}>
                    <div>
                      <span style={{ fontSize:13, fontWeight:800, color: PHASE_COLORS[phase] || "#a5d6a7" }}>{phase}</span>
                      {urgent.length > 0 && (
                        <span style={{ marginLeft:8, fontSize:10, color:"#f9a825", background:"rgba(249,168,37,0.15)", borderRadius:20, padding:"2px 7px" }}>
                          {urgent.length} en attente
                        </span>
                      )}
                    </div>
                    <button onClick={() => setExpandedPhases(p => ({ ...p, [phase]: !p[phase] }))} style={{ background:"none", border:"none", color:"#81c784", fontSize:12, cursor:"pointer" }}>
                      {isExpanded ? "▲ Masquer" : "▼ Voir"}
                    </button>
                  </div>
                  {isExpanded && tasks.map((t, i) => {
                    const s = STATUT_STYLE[t.statut] || STATUT_STYLE["❌ À faire"];
                    return (
                      <div key={i} style={{ padding:"8px 10px", marginBottom:4, borderRadius:8, background:s.bg, border:`1px solid ${s.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>{t.etape}</div>
                            {t.desc && t.desc !== "nan" && (
                              <div style={{ fontSize:10, color:"#81c784", marginTop:2, lineHeight:1.4 }}>{t.desc}</div>
                            )}
                            {t.dateCible && t.dateCible !== "nan" && (
                              <div style={{ fontSize:9, color:"#4a7c5c", marginTop:3 }}>📅 {t.dateCible}</div>
                            )}
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:s.color, whiteSpace:"nowrap", flexShrink:0 }}>{t.statut}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {roadmapLoading && !roadmap.length && (
              <div style={{ textAlign:"center", color:"#81c784", fontSize:13, padding:32 }}>
                🔄 Chargement depuis Google Sheets...
              </div>
            )}
          </>
        )}

        {/* ════════════════ TAB SERVICES ════════════════ */}
        {tab === "services" && (
          <>
            <div style={card()}>
              <div style={cardTitle}><span>⚙️ Statut des services</span></div>
              {[
                { name:"Vercel",         status:"✅", ok:true,  detail:"Déployé — mongazon360.fr" },
                { name:"Groq Vision IA", status:"✅", ok:true,  detail:"Llama 4 Scout 17B — Gratuit" },
                { name:"Cloudinary",     status:"✅", ok:true,  detail:"Stockage photos 25GB gratuit" },
                { name:"Stripe",         status:"✅", ok:true,  detail:"Paiements actifs" },
                { name:"Open-Meteo",     status:"✅", ok:true,  detail:"Météo temps réel — Gratuit" },
                { name:"Clerk",          status:"✅", ok:true,  detail:"Authentification — Mode production" },
                { name:"Resend",         status:"✅", ok:true,  detail:"Emails alertes actifs" },
                { name:"Supabase",       status:"✅", ok:true,  detail:"Pré-inscrits + Rate limiting actifs" },
                { name:"Anthropic",      status:"⚠️", ok:false, detail:"Crédits à recharger" },
                { name:"Gemini",         status:"⚠️", ok:false, detail:"Quota limité" },
              ].map(s => (
                <div key={s.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span>{s.status}</span>
                    <span style={{ fontSize:12, fontWeight:700 }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize:10, color: s.ok ? "#81c784" : "#ffcc80", maxWidth:180, textAlign:"right" }}>{s.detail}</span>
                </div>
              ))}
            </div>

            <div style={card()}>
              <div style={cardTitle}><span>🗺️ Avancement Roadmap</span></div>
              {[
                { phase:"Phase 1 — Fondations",      pct:100, color:"#43a047" },
                { phase:"Phase 2 — Diagnostic IA",   pct:100, color:"#43a047" },
                { phase:"Juridique RGPD + Marque",    pct:85,  color:"#ec407a" },
                { phase:"Phase 3 — Officialisation",  pct:95,  color:"#e65100" },
                { phase:"Tech & Migration serveur",   pct:30,  color:"#c62828" },
                { phase:"Phase 4 — Monétisation",     pct:10,  color:"#6a1b9a" },
              ].map(r => (
                <div key={r.phase} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                    <span style={{ fontWeight:700 }}>{r.phase}</span>
                    <span style={{ color:r.color, fontWeight:700 }}>{r.pct}%</span>
                  </div>
                  <Bar value={r.pct} color={r.color} />
                </div>
              ))}
            </div>

            <div style={card()}>
              <div style={cardTitle}><span>🗑️ Purge Cloudinary</span></div>
              <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
                Supprime les photos de diagnostic de plus de <strong style={{ color:"#a5d6a7" }}>90 jours</strong> pour libérer du stockage.
              </div>
              <button
                onClick={purgeDiagnostics}
                disabled={purging}
                style={{ width:"100%", padding:"10px", borderRadius:10, background:"rgba(198,40,40,0.15)", border:"1px solid rgba(198,40,40,0.3)", color:"#ef9a9a", fontSize:13, fontWeight:700, cursor:"pointer", opacity: purging ? 0.6 : 1 }}
              >
                {purging ? "Suppression en cours..." : "🗑️ Purger les anciennes photos"}
              </button>
              {purgeResult && (
                <div style={{ marginTop:10, fontSize:12, color:"#a5d6a7", background:"rgba(76,175,80,0.1)", border:"1px solid rgba(76,175,80,0.25)", borderRadius:8, padding:"8px 12px", textAlign:"center" }}>
                  {purgeResult}
                </div>
              )}
            </div>

            <div style={card()}>
              <div style={cardTitle}><span>⚡ Actions</span></div>
              {sent && (
                <div style={{ background:sent.startsWith("✅")?"rgba(76,175,80,0.2)":"rgba(198,40,40,0.2)", border:`1px solid ${sent.startsWith("✅")?"#43a047":"#c62828"}`, borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:sent.startsWith("✅")?"#a5d6a7":"#ef9a9a" }}>
                  {sent}
                </div>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={sendReportNow} disabled={sending} style={{ ...btn.primary, fontSize:13, padding:"12px", opacity:sending?0.7:1 }}>
                  {sending ? "⌛ Envoi..." : "📧 Envoyer rapport maintenant"}
                </button>
                <button onClick={sendTestAlert} disabled={sending} style={{ ...btn.ghost, fontSize:13, opacity:sending?0.7:1 }}>
                  🧪 Tester l'alerte email
                </button>
              </div>
              <div style={{ fontSize:10, color:"#4a7c5c", marginTop:10, textAlign:"center" }}>
                📅 Rapport automatique chaque lundi à 8h00 → mongazon360@gmail.com
              </div>
            </div>
          </>
        )}

        {/* ════════════════ TAB BUGS ════════════════ */}
        {tab === "bugs" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:4 }}>
              <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 8px", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:"#ef9a9a" }}>{local?.errors7j ?? 0}</div>
                <div style={{ fontSize:10, color:"#81c784" }}>🔴 Bugs 7j</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 8px", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:"#ffcc80" }}>{local?.warnings7j ?? 0}</div>
                <div style={{ fontSize:10, color:"#81c784" }}>🟠 Warnings 7j</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 8px", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7" }}>{logs.length}</div>
                <div style={{ fontSize:10, color:"#81c784" }}>Total logs</div>
              </div>
            </div>
            <div style={card()}>
              <div style={cardTitle}>
                <span>🐛 Logs d'alertes</span>
                <button onClick={() => { localStorage.removeItem("gk_pilotage_logs"); setLogs([]); }}
                  style={{ background:"rgba(198,40,40,0.15)", border:"1px solid rgba(198,40,40,0.3)", borderRadius:8, padding:"3px 8px", color:"#ef9a9a", fontSize:10, cursor:"pointer" }}>
                  🗑️ Effacer
                </button>
              </div>
              {logs.length === 0 ? (
                <div style={{ textAlign:"center", fontSize:12, color:"#81c784", padding:"12px 0" }}>✅ Aucune alerte enregistrée</div>
              ) : (
                logs.map((log, i) => {
                  const s = SEV_STYLE[log.severity] || SEV_STYLE.error;
                  return (
                    <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:"10px 12px", marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{log.type}</span>
                        <span style={{ fontSize:9, color:"#81c784" }}>{new Date(log.date).toLocaleString("fr-FR")}</span>
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
          </>
        )}

        {/* ════════════════ TAB PRÉ-INSCRITS ════════════════ */}
        {tab === "preinscriptions" && (
          <>
            {/* ✅ FIX 01/06/2026 — Utilisation du composant SourceBreakdown harmonisé */}
            <KPI icon="📬" label="Total pré-inscrits" value={preinscTotal} sub="Via formulaire ComingSoon" color="#64b5f6" />

            <SourceBreakdown
              sources={users?.waitlistSources}
              title="📊 Sources des pré-inscriptions"
            />

            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <button onClick={fetchPreinscriptions} style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"8px", color:"#81c784", fontSize:12, cursor:"pointer" }}>
                ↻ Actualiser
              </button>
              <button onClick={exportCSV} disabled={!preinscriptions.length} style={{ flex:1, background:"rgba(100,181,246,0.15)", border:"1px solid rgba(100,181,246,0.3)", borderRadius:10, padding:"8px", color:"#64b5f6", fontSize:12, fontWeight:700, cursor:"pointer", opacity: preinscriptions.length ? 1 : 0.5 }}>
                ⬇ Export CSV
              </button>
            </div>
            {(() => {
              const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                const label = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
                const key   = d.toISOString().split('T')[0];
                const count = preinscriptions.filter(p => p.created_at?.startsWith(key)).length;
                return { label, count };
              });
              return (
                <div style={card()}>
                  <div style={cardTitle}><span>📈 Inscriptions 7 derniers jours</span></div>
                  <MiniChart data={days} valueKey="count" color="#64b5f6" />
                </div>
              );
            })()}
            <div style={card()}>
              <div style={cardTitle}>
                <span>📋 Liste ({preinscriptions.length})</span>
                {preinscLoading && <span style={{ fontSize:11, color:"#81c784" }}>Chargement…</span>}
              </div>
              {preinscriptions.length === 0 && !preinscLoading && (
                <div style={{ fontSize:12, color:"#4a7c5c", textAlign:"center", padding:"16px 0" }}>
                  Aucune pré-inscription pour l'instant.
                </div>
              )}
              {preinscriptions.map((p) => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.email}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>{new Date(p.created_at).toLocaleDateString('fr-FR')} · {p.source}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:"#64b5f6", background:"rgba(100,181,246,0.12)", border:"1px solid rgba(100,181,246,0.25)", borderRadius:6, padding:"2px 7px", whiteSpace:"nowrap" }}>
                    {p.source}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
