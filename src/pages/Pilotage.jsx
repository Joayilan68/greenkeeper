// src/pages/Pilotage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useSubscription } from "../lib/useSubscription";
import { card, cardTitle, btn, scroll, header, appShell } from "../lib/styles";

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

// ── Carte de France (SVG, sans dépendance) — répartition des inscrits ─────────
// Le contour ET les points utilisent la MÊME projection → alignement garanti.
const FR_BORDER = [
  [2.4,51.05],[4.9,50.17],[6.4,49.55],[8.23,48.97],[7.6,47.6],[6.9,47.35],[6.1,46.4],
  [7.05,45.9],[6.9,44.9],[7.55,43.78],[6.6,43.15],[5.35,43.30],[4.05,43.55],[3.0,42.45],
  [1.7,42.5],[-0.5,42.8],[-1.79,43.35],[-1.25,44.6],[-1.06,45.57],[-1.15,46.15],
  [-2.2,47.28],[-4.3,47.8],[-4.77,48.4],[-3.2,48.87],[-1.6,48.65],[-1.9,49.72],
  [-0.2,49.3],[0.1,49.5],[1.6,50.1],[1.58,50.9],[2.4,51.05],
];
const FR_CORSE = [[8.6,43.0],[9.35,42.7],[9.55,41.9],[9.2,41.4],[8.7,41.6],[8.6,42.3],[8.6,43.0]];

function makeProj(W, H, pad) {
  const latMax = 51.2, latMin = 41.3, lonMin = -5.2, lonMax = 9.6;
  const cosMid  = Math.cos((46.5 * Math.PI) / 180);
  const rawXmax = (lonMax - lonMin) * cosMid;
  const rawYmax = (latMax - latMin);
  const scale   = Math.min((W - 2 * pad) / rawXmax, (H - 2 * pad) / rawYmax);
  const offX    = pad + ((W - 2 * pad) - rawXmax * scale) / 2;
  const offY    = pad + ((H - 2 * pad) - rawYmax * scale) / 2;
  return (lon, lat) => [offX + (lon - lonMin) * cosMid * scale, offY + (latMax - lat) * scale];
}
function borderPath(coords, proj) {
  return coords.map((c, i) => `${i ? "L" : "M"}${proj(c[0], c[1]).map(n => n.toFixed(1)).join(" ")}`).join(" ") + " Z";
}
function FranceMap({ points }) {
  const W = 300, H = 300, pad = 10;
  const proj  = makeProj(W, H, pad);
  const inFR  = p => p.lat >= 41.3 && p.lat <= 51.2 && p.lon >= -5.2 && p.lon <= 9.6;
  const fr    = (points || []).filter(inFR);
  const out   = (points || []).filter(p => !inFR(p));
  const maxC  = Math.max(1, ...fr.map(p => p.count));
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }}>
        <path d={borderPath(FR_BORDER, proj)} fill="rgba(76,175,80,0.10)" stroke="rgba(165,214,167,0.55)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d={borderPath(FR_CORSE, proj)}  fill="rgba(76,175,80,0.10)" stroke="rgba(165,214,167,0.55)" strokeWidth="1.2" strokeLinejoin="round" />
        {fr.map((p, i) => {
          const [x, y] = proj(p.lon, p.lat);
          const r = 3 + Math.round((p.count / maxC) * 6);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={r + 3} fill="rgba(102,187,106,0.18)" />
              <circle cx={x} cy={y} r={r} fill="#66BB6A" stroke="#0b1f12" strokeWidth="0.5" />
              {p.count > 1 && <text x={x} y={y + 2.6} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#0b1f12">{p.count}</text>}
            </g>
          );
        })}
      </svg>
      {out.length > 0 && (
        <div style={{ fontSize: 10, color: "#4a7c5c", textAlign: "center", marginTop: 6 }}>
          + {out.reduce((s, p) => s + p.count, 0)} hors métropole ({out.map(p => p.ville || "?").join(", ")})
        </div>
      )}
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
  const [purging, setPurging]             = useState(false);
  const [purgeResult, setPurgeResult]     = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});

  // ── Réseaux sociaux (saisie manuelle mensuelle) ─────────────────────────────
  const [social, setSocial]             = useState(null);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [socialForm, setSocialForm]     = useState(null); // { mois:"YYYY-MM", rows:[{compte,plateforme,followers}] }
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialMsg, setSocialMsg]       = useState("");

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
    fetchSocial();
    fetchRoadmap();
    setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
  }

  // Initialise le formulaire de saisie à partir des comptes déjà connus
  useEffect(() => {
    if (social && socialForm === null) {
      setSocialForm({
        mois: new Date().toISOString().slice(0, 7),
        rows: (social.accounts || []).map(a => ({
          compte: a.compte, plateforme: a.plateforme, followers: String(a.followers ?? ""),
        })),
      });
    }
  }, [social]); // eslint-disable-line

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
      const token = await getToken();
      const res   = await fetch("/api/stats?type=users", { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (data.success) setUsers(data);
    } catch {}
    setLoadingUsers(false);
  }

  async function fetchRevenue() {
    setLoadingRevenue(true);
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=revenue", { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (data.success) setRevenue(data);
    } catch {}
    setLoadingRevenue(false);
  }

  async function fetchSocial() {
    setLoadingSocial(true);
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=social", { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (data.success) setSocial(data);
    } catch {}
    setLoadingSocial(false);
  }

  async function saveSocial() {
    if (!socialForm) return;
    const entries = (socialForm.rows || [])
      .filter(r => r.compte && r.compte.trim() && r.plateforme)
      .map(r => ({ compte: r.compte.trim(), plateforme: r.plateforme, followers: parseInt(r.followers, 10) || 0 }));
    if (!entries.length) { setSocialMsg("❌ Ajoute au moins un compte."); setTimeout(() => setSocialMsg(""), 4000); return; }
    setSavingSocial(true); setSocialMsg("");
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=social", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mois: socialForm.mois, entries }),
      });
      const data = await res.json();
      if (data.success) {
        setSocialMsg(`✅ ${data.saved} compte(s) enregistré(s) pour ${socialForm.mois}`);
        await fetchSocial();
      } else {
        setSocialMsg("❌ " + (data.error || "Erreur"));
      }
    } catch (e) {
      setSocialMsg("❌ " + e.message);
    }
    setSavingSocial(false);
    setTimeout(() => setSocialMsg(""), 5000);
  }

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
    { id:"reseaux",         label:"📱 Réseaux" },
    { id:"roadmap",         label:"📊 Roadmap" },
    { id:"services",        label:"⚙️ Services" },
    { id:"bugs",            label:"🐛 Bugs" },
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

  // ── Valeurs dérivées pour l'onglet Activité ──────────────────────────────
  const todayLabel  = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" });
  const dauToday    = users?.dauByDay?.find(d => d.label === todayLabel)?.count ?? 0;
  const inscrits    = users?.total ?? null;
  const waitlist    = users?.waitlistTotal ?? null;
  const premiumTot  = revenue?.totalPremium ?? null;
  const pctInscrits = (waitlist && inscrits != null)   ? Math.round((inscrits / waitlist) * 100)   : null;
  const pctPremium  = (inscrits && premiumTot != null) ? Math.round((premiumTot / inscrits) * 100) : null;

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
              <KPI icon="👥" label="Comptes créés" value={loadingUsers ? "..." : (users?.total ?? "—")} sub="Hors admins · ≠ installs" color="#a5d6a7" />
              <KPI icon="🟢" label="Actifs aujourd'hui" value={loadingUsers ? "..." : dauToday} sub="Connectés ce jour" color="#66BB6A" />
              <KPI icon="🌐" label="Visiteurs site (auj.)" value={loadingUsers ? "..." : (users?.siteVisits?.today ?? "—")} sub="Uniques/jour · dont non connectés" color="#4FC3F7" />
              <KPI icon="🆕" label="Nouveaux aujourd'hui" value={loadingUsers ? "..." : (users?.newToday ?? "—")} sub="Inscriptions du jour" color="#90caf9" />
              <KPI icon="📅" label="Nouveaux cette semaine" value={loadingUsers ? "..." : (users?.newLast7 ?? "—")} sub="7 derniers jours" color="#81d4fa" />
              <KPI icon="🗓️" label="Nouveaux ce mois" value={loadingUsers ? "..." : (users?.newLast30 ?? "—")} sub="30 derniers jours" color="#ffcc80" />
              <KPI icon="📆" label="Cette année" value={loadingUsers ? "..." : (users?.newThisYear ?? "—")} sub="Depuis le 1ᵉʳ janvier" color="#c5e1a5" />
              <KPI icon="📸" label="Diagnostics" value={local?.diagnostics.total ?? "—"} sub={`+${local?.diagnostics.ce7j ?? 0} cette semaine`} color="#ce93d8" />
            </div>

            {/* Clarification : comptes créés ≠ installations (sources de vérité distinctes) */}
            <div style={{ fontSize:10, color:"#4a7c5c", padding:"0 4px 10px", lineHeight:1.5 }}>
              ℹ️ « Comptes créés » = inscriptions dans l'app (hors admins), <b>pas</b> les installations.
              Installs &amp; opt-in testeurs : <b>Google Play Console</b> (source de vérité distincte).
            </div>

            {/* ── Entonnoir de conversion : Préinscrits → Inscrits → Premium ── */}
            <div style={card()}>
              <div style={cardTitle}><span>🔻 Entonnoir de conversion</span></div>
              <div style={{ display:"flex", alignItems:"stretch", gap:6, marginTop:4 }}>
                {[
                  { label:"Préinscrits", value: waitlist,   color:"#bcaaa4" },
                  { label:"Inscrits",    value: inscrits,   color:"#90caf9", pct: pctInscrits, pctLabel:"des préinscrits" },
                  { label:"Premium",     value: premiumTot, color:"#f9a825", pct: pctPremium,  pctLabel:"des inscrits" },
                ].map((s, i) => (
                  <div key={s.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:`1px solid ${s.color}55`, borderRadius:12, padding:"12px 6px", textAlign:"center" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{loadingUsers ? "..." : (s.value ?? "—")}</div>
                      <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>{s.label}</div>
                    </div>
                    {s.pct != null && (
                      <div style={{ fontSize:10, color:s.color, marginTop:6, fontWeight:700 }}>
                        ↓ {s.pct}% <span style={{ color:"#4a7c5c", fontWeight:400 }}>{s.pctLabel}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Répartition géographique des inscrits */}
            {users?.geo?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}>
                  <span>🗺️ Répartition des inscrits</span>
                  <span style={{ fontSize:11, color:"#81c784" }}>{users.geo.reduce((s,p)=>s+p.count,0)} localisés</span>
                </div>
                <FranceMap points={users.geo} />
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
                  Basé sur les profils avec ville renseignée. Taille du point = nombre d'inscrits sur la commune.
                </div>
              </div>
            )}

            {/* Sources des inscrits Clerk (UTM first-touch) */}
            <SourceBreakdown
              sources={users?.clerkSources}
              title="🎯 Sources d'inscription (comptes créés)"
            />

            {users?.days?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🆕 Nouveaux inscrits — 30 jours</span></div>
                <MiniChart data={users.days} valueKey="count" color="#90caf9" />
              </div>
            )}
            {users?.dauByDay?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🟢 Actifs par jour</span></div>
                <MiniChart data={users.dauByDay} valueKey="count" color="#66BB6A" />
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
                  Connexions réelles, hors admins. L'historique se construit jour après jour depuis l'activation du suivi.
                </div>
              </div>
            )}
            {users?.siteVisits?.byDay?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🌐 Visiteurs du site — 30 j</span><span style={{ fontSize:11, color:"#81c784" }}>{users.siteVisits.total30} sur 30 j</span></div>
                <MiniChart data={users.siteVisits.byDay} valueKey="count" color="#4FC3F7" />
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
                  Visiteurs uniques par jour, tous confondus (y compris non connectés). Le comptage démarre aujourd'hui.
                </div>
              </div>
            )}
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
                <button onClick={sendTestAlert} disabled={sending} style={{ ...btn.ghost, fontSize:13, opacity:sending?0.7:1 }}>
                  🧪 Tester l'alerte email
                </button>
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

        {/* ════════════════ TAB RÉSEAUX ════════════════ */}
        {tab === "reseaux" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:4 }}>
              <KPI icon="👥" label="Followers total" value={loadingSocial ? "..." : (social?.totalLatest ?? "—")} sub="Dernier relevé" color="#a5d6a7" />
              <KPI icon="📈" label="Évolution"
                value={social?.deltaTotal != null ? (social.deltaTotal >= 0 ? "+" : "") + social.deltaTotal : "—"}
                sub={social?.deltaPct != null ? `${social.deltaPct >= 0 ? "+" : ""}${social.deltaPct}% vs M-1` : "vs mois précédent"}
                color={social?.deltaTotal >= 0 ? "#66BB6A" : "#ef9a9a"} />
              <KPI icon="📱" label="Comptes suivis" value={loadingSocial ? "..." : (social?.accounts?.length ?? 0)} sub="Tous réseaux" color="#90caf9" />
            </div>

            {social?.byMonth?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>📈 Followers total — par mois</span></div>
                <MiniChart data={social.byMonth} valueKey="total" color="#43a047" />
              </div>
            )}

            {social?.accounts?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>📊 Par compte</span><span style={{ fontSize:11, color:"#81c784" }}>{social.totalLatest} total</span></div>
                {social.accounts.map(a => {
                  const m     = SOURCE_META[a.plateforme] || SOURCE_META.autre;
                  const key   = `${a.compte}|${a.plateforme}`;
                  const serie = social.byMonth.map(bm => ({ label: bm.label, count: bm.perAccount[key] || 0 }));
                  const pct   = social.totalLatest > 0 ? Math.round((a.followers / social.totalLatest) * 100) : 0;
                  return (
                    <div key={key} style={{ padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                          <span>{m.icon}</span>
                          <span style={{ color:"#e8f5e9", fontWeight:600 }}>{a.compte}</span>
                          <span style={{ fontSize:9, color:"#4a7c5c" }}>{m.label}</span>
                        </span>
                        <span style={{ fontSize:12, fontWeight:700, color:m.color }}>{a.followers} <span style={{ fontSize:9, color:"#81c784" }}>({pct}%)</span></span>
                      </div>
                      {serie.length > 1 && <MiniChart data={serie} valueKey="count" color={m.color} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Saisie mensuelle */}
            <div style={{ ...card(), border:"1px solid rgba(102,187,106,0.3)" }}>
              <div style={cardTitle}><span>✍️ Saisir un relevé mensuel</span></div>
              <div style={{ fontSize:11, color:"#81c784", marginBottom:10, lineHeight:1.5 }}>
                Une fois par mois, renseigne le nombre de followers de chaque compte. Les valeurs du dernier relevé sont pré-remplies — tu n'as qu'à les mettre à jour.
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <span style={{ fontSize:12, color:"#81c784" }}>Mois :</span>
                <input type="month" value={socialForm?.mois || ""} onChange={e => setSocialForm(f => ({ ...(f||{rows:[]}), mois: e.target.value }))}
                  style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.3)", borderRadius:8, padding:"6px 10px", color:"#e8f5e9", fontSize:12, fontFamily:"inherit" }} />
              </div>
              {(socialForm?.rows || []).map((r, i) => (
                <div key={i} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:8 }}>
                  <select value={r.plateforme} onChange={e => setSocialForm(f => { const rows=[...f.rows]; rows[i]={...rows[i],plateforme:e.target.value}; return {...f,rows}; })}
                    style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"7px 6px", color:"#e8f5e9", fontSize:12, fontFamily:"inherit" }}>
                    {["instagram","tiktok","facebook","youtube","twitter","linkedin","autre"].map(p => {
                      const pm = SOURCE_META[p] || SOURCE_META.autre;
                      return <option key={p} value={p}>{pm.icon} {pm.label}</option>;
                    })}
                  </select>
                  <input placeholder="Nom du compte" value={r.compte} onChange={e => setSocialForm(f => { const rows=[...f.rows]; rows[i]={...rows[i],compte:e.target.value}; return {...f,rows}; })}
                    style={{ flex:1, minWidth:0, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"7px 8px", color:"#e8f5e9", fontSize:12, fontFamily:"inherit" }} />
                  <input type="number" min={0} placeholder="0" value={r.followers} onChange={e => setSocialForm(f => { const rows=[...f.rows]; rows[i]={...rows[i],followers:e.target.value}; return {...f,rows}; })}
                    style={{ width:80, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"7px 8px", color:"#e8f5e9", fontSize:12, fontFamily:"inherit", textAlign:"right" }} />
                  <button onClick={() => setSocialForm(f => ({ ...f, rows: f.rows.filter((_,j)=>j!==i) }))}
                    style={{ background:"rgba(198,40,40,0.15)", border:"none", borderRadius:8, padding:"7px 9px", color:"#ef9a9a", fontSize:12, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={() => setSocialForm(f => ({ mois: (f?.mois || new Date().toISOString().slice(0,7)), rows:[...((f&&f.rows)||[]), { compte:"", plateforme:"instagram", followers:"" }] }))}
                style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px dashed rgba(165,214,167,0.4)", borderRadius:8, padding:"8px", color:"#81c784", fontSize:12, cursor:"pointer", marginBottom:10 }}>
                ➕ Ajouter un compte
              </button>
              <button onClick={saveSocial} disabled={savingSocial} style={{ ...btn.primary, fontSize:13, opacity:savingSocial?0.6:1 }}>
                {savingSocial ? "Enregistrement..." : "💾 Enregistrer le relevé"}
              </button>
              {socialMsg && (
                <div style={{ marginTop:10, fontSize:12, textAlign:"center", color: socialMsg.startsWith("✅") ? "#a5d6a7" : "#ef9a9a" }}>{socialMsg}</div>
              )}
            </div>

            {!social?.hasData && !loadingSocial && (
              <div style={{ fontSize:11, color:"#4a7c5c", textAlign:"center", padding:"8px 4px", lineHeight:1.5 }}>
                Aucun relevé encore. Saisis ton premier mois ci-dessus — l'évolution se tracera ensuite automatiquement, mois après mois.
              </div>
            )}
          </>
        )}


        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
