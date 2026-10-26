// src/pages/Pilotage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useSubscription } from "../lib/useSubscription";
import { card, cardTitle, btn, scroll, header, appShell } from "../lib/styles";
import RoadmapTab from "../components/RoadmapTab";
import PremiumOffertsCard from "../components/PremiumOffertsCard";
import PublicationsCard from "../components/PublicationsCard";
import { CHARGES_ACTIVES, CHARGES_PREVUES, STRIPE_FEES, URSSAF_RATE, montant } from "../lib/charges";
import LigueHiverCard from "../components/LigueHiverCard";
import Agrandir from "../components/Agrandir";
import { periodeLigue } from "../lib/ligueHiver";
import { OFFRE, enEuros } from "../lib/offreSaison";

function eur(n) { return (Math.round((n||0)*100)/100).toFixed(2) + "€"; }

function Bar({ value, max = 100, color = "#43a047" }) {
  const pct = Math.min(100, Math.round((value / (max||1)) * 100));
  return (
    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:6, height:6, width:"100%", overflow:"hidden", marginTop:4 }}>
      <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:6, transition:"width 0.6s" }} />
    </div>
  );
}

function MiniChart({ data, valueKey, color = "#43a047", unit = "", taille = null }) {
  if (!data?.length) return null;
  const max  = Math.max(...data.map(d => d[valueKey] || 0), 1);
  if (taille) return <MiniChartGrand data={data} valueKey={valueKey} color={color} unit={unit} max={max} taille={taille} />;
  const W    = 280; const H = 60; const HAUT = 12; const BAR = Math.floor((W - data.length * 2) / data.length);
  // Étiquettes du bas : une sur « pas » (en partant de la plus récente) pour qu'elles ne se chevauchent pas
  const pas  = Math.max(1, Math.ceil((Math.max(...data.map(d => String(d.label).length)) * 4.8 + 4) / (BAR + 2)));
  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={HAUT + H + 20} style={{ display:"block" }}>
        {data.map((d, i) => {
          const h   = Math.max(2, Math.round((d[valueKey] / max) * H));
          const x   = i * (BAR + 2);
          const y   = HAUT + H - h;
          const lt  = String(d.label).length * 4.8, cx = x + BAR / 2;
          const ancre = cx - lt / 2 < 0 ? "start" : cx + lt / 2 > W ? "end" : "middle";
          return (
            <g key={i}>
              <rect x={x} y={y} width={BAR} height={h} fill={color} opacity={0.8} rx={2} />
              {(data.length - 1 - i) % pas === 0 && (
                <text x={ancre === "start" ? 0 : ancre === "end" ? W : cx} y={HAUT + H + 14} textAnchor={ancre} fill="#81c784" fontSize={8}>{d.label}</text>
              )}
              {d[valueKey] > 0 && <text x={x + BAR/2} y={y - 2} textAnchor="middle" fill="#e8f5e9" fontSize={8}>{d[valueKey]}{unit}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Vue agrandie trop large pour l'écran : position de départ du défilement horizontal (« fin » = le plus récent)
function useDefilement(actif, position) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (actif && el) el.scrollLeft = position === "fin" ? el.scrollWidth : (el.scrollWidth - el.clientWidth) / 2;
  });
  return ref;
}

// Version agrandie (Agrandir) : barres d'au moins 24 px, défilement horizontal si l'écran est trop étroit, une étiquette
// sur deux ou plus pour qu'elles ne se chevauchent pas, et détail des valeurs du plus récent au plus ancien.
function MiniChartGrand({ data, valueKey, color, unit, max, taille }) {
  const n = data.length;
  const fente = Math.max(24, Math.floor(taille.largeur / n));
  const W = fente * n, H = Math.max(160, Math.min(320, Math.round(taille.hauteur * 0.45))), HAUT = 16;
  const police = fente >= 34 ? 11 : 9.5;
  const largeurTexte = (t) => String(t).length * police * 0.6;
  const pas = Math.max(1, Math.ceil((Math.max(...data.map(d => largeurTexte(d.label))) + 6) / fente));
  const valeur = (d) => `${(d[valueKey] || 0).toLocaleString("fr-FR")}${unit}`;
  const defilement = useDefilement(true, "fin");
  return (
    <div>
      <div ref={defilement} style={{ overflowX:"auto" }}>
        <svg width={W} height={HAUT + H + 24} style={{ display:"block" }} role="img"
          aria-label={data.map(d => `${d.label} : ${valeur(d)}`).join(", ")}>
          {data.map((d, i) => {
            const v = d[valueKey] || 0;
            const h = Math.max(2, Math.round((v / max) * H));
            const x = i * fente, y = HAUT + H - h, cx = x + fente / 2;
            // Étiquette du bas une fois sur « pas », en partant de la plus récente ; calée au bord si elle déborde
            const lt = largeurTexte(d.label);
            const ancre = cx - lt / 2 < 0 ? "start" : cx + lt / 2 > W ? "end" : "middle";
            return (
              <g key={i}>
                <rect x={x + 3} y={y} width={fente - 6} height={h} fill={color} opacity={0.85} rx={3} />
                {v > 0 && <text x={cx} y={y - 4} textAnchor="middle" fill="#e8f5e9" fontSize={police}>{valeur(d)}</text>}
                {(n - 1 - i) % pas === 0 && (
                  <text x={ancre === "start" ? 0 : ancre === "end" ? W : cx} y={HAUT + H + 17} textAnchor={ancre} fill="#81c784" fontSize={police}>{d.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {W > taille.largeur && (
        <div style={{ fontSize:11, color:"#81c784", marginTop:6 }}>↔ Fais glisser le graphique, ou tourne ton téléphone pour le voir en entier.</div>
      )}
      <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", columnGap:16 }}>
        {data.slice().reverse().map((d, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:12, color:"#a5d6a7", padding:"4px 0",
            borderBottom:"1px solid rgba(255,255,255,0.06)", fontVariantNumeric:"tabular-nums" }}>
            <span>{d.label}</span><b style={{ color:"#e8f5e9" }}>{valeur(d)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// Position moyenne de toutes nos pages dans Google, par mois (Search Console) : courbe à axe inversé (1 en haut),
// repères 1 / 3 / 10 / 20…, valeur du dernier mois, évolution sur un mois, détail au survol ou au toucher et tableau.
const virgule = (n) => String(n).replace(".", ",");
const nomMois = (m, long) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString("fr-FR",
  long ? { month: "long", year: "numeric" } : { month: "short" });
// Taux de clic du mois : part des affichages qui ont donné un clic.
const tauxClic = (p) => p.affichages ? Math.round((p.clics / p.affichages) * 1000) / 10 : null;
const taux = (p) => { const t = tauxClic(p); return t === null ? "—" : `${virgule(t)} %`; };

function PositionChart({ mois, taille = null }) {
  const [survol, setSurvol] = useState(null);
  if (!mois?.length) return <div style={{ fontSize:11, color:"#81c784" }}>Pas encore de données Google.</div>;
  // Vue agrandie : toute la largeur disponible, plus haute, textes 25 % plus grands
  const t = taille ? 1.25 : 1;
  const W = taille ? Math.max(320, taille.largeur) : 320, H = taille ? Math.max(150, Math.min(340, Math.round(taille.hauteur * 0.45))) : 150;
  const GAUCHE = 30, DROITE = 16, HAUT = 14, BAS = 24;
  const max = Math.max(10, Math.ceil(Math.max(...mois.map(m => m.position)) / 10) * 10);
  const x = (i) => mois.length === 1 ? (GAUCHE + W - DROITE) / 2 : GAUCHE + (i * (W - GAUCHE - DROITE)) / (mois.length - 1);
  const y = (p) => HAUT + ((p - 1) * (H - HAUT - BAS)) / (max - 1);
  // Repères par ordre d'importance (top 3, fin de la 1re page…), sans étiquettes qui se chevauchent
  const reperes = [3, 10, 1, 20, 30, 50, 70, 100].filter(v => v <= max)
    .reduce((garde, v) => garde.every(g => Math.abs(y(g) - y(v)) >= 11 * t) ? [...garde, v] : garde, []);
  const enCours = new Date().toISOString().slice(0, 7);
  const der = mois[mois.length - 1], prec = mois[mois.length - 2];
  const ecart = prec ? Math.round((prec.position - der.position) * 10) / 10 : null; // positif = on remonte
  const m = survol !== null ? mois[survol] : null;
  // Bulle de détail du côté du point touché, sans déborder du graphique
  const px = m ? (x(survol) / W) * 100 : 0;
  const bulle = px < 50 ? { left: `${Math.max(0, px - 10)}%` } : { right: `${Math.max(0, 90 - px)}%` };
  return (
    <div>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:2, flexWrap:"wrap" }}>
        <span style={{ fontSize:26, fontWeight:800, color:"#e8f5e9" }}>{virgule(der.position)}</span>
        <span style={{ fontSize:11, color:"#81c784" }}>{nomMois(der.mois, true)}{der.mois === enCours ? " (en cours)" : ""}</span>
        {ecart !== null && ecart !== 0 && (
          <span style={{ fontSize:11, fontWeight:700, color: ecart > 0 ? "#66BB6A" : "#ef9a9a" }}>
            {ecart > 0 ? "▲ gagne" : "▼ perd"} {virgule(Math.abs(ecart))} place{Math.abs(ecart) >= 2 ? "s" : ""} sur un mois
          </span>
        )}
      </div>
      <div style={{ fontSize:11, color:"#a5d6a7", marginBottom:6, fontVariantNumeric:"tabular-nums" }}>
        Taux de clic <b style={{ color:"#e8f5e9" }}>{taux(der)}</b> · {der.clics} clic{der.clics >= 2 ? "s" : ""} pour {der.affichages.toLocaleString("fr-FR")} affichage{der.affichages >= 2 ? "s" : ""}
      </div>
      <div style={{ position:"relative", maxWidth: taille ? "none" : 420 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:"block" }} role="img"
          aria-label={`Position moyenne sur Google par mois : ${mois.map(p => `${nomMois(p.mois, true)} ${virgule(p.position)}`).join(", ")}`}>
          {reperes.map(v => (
            <g key={v}>
              <line x1={GAUCHE} x2={W - DROITE} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              <text x={GAUCHE - 6} y={y(v) + 3} textAnchor="end" fill="#81c784" fontSize={9 * t}>{v}</text>
            </g>
          ))}
          {mois.length > 1 && <polyline points={mois.map((p, i) => `${x(i)},${y(p.position)}`).join(" ")}
            fill="none" stroke="#66BB6A" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {mois.map((p, i) => (
            <g key={p.mois}>
              <circle cx={x(i)} cy={y(p.position)} r={4 * t} fill="#66BB6A" stroke="#1e3b2b" strokeWidth={2} />
              <text x={x(i)} y={H - 8} textAnchor="middle" fill="#81c784" fontSize={9 * t}>{nomMois(p.mois)}</text>
              <circle cx={x(i)} cy={y(p.position)} r={14 * t} fill="transparent" style={{ cursor:"pointer" }}
                onMouseEnter={() => setSurvol(i)} onMouseLeave={() => setSurvol(null)} onClick={() => setSurvol(survol === i ? null : i)} />
            </g>
          ))}
          <text x={x(mois.length - 1)} y={y(der.position) - 9 * t} textAnchor="middle" fill="#e8f5e9" fontSize={10 * t} fontWeight={700}>{virgule(der.position)}</text>
        </svg>
        {m && (
          <div style={{ position:"absolute", top:4, ...bulle, maxWidth:"75%", background:"#0d2519",
            border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"6px 8px", fontSize:10 * t, color:"#e8f5e9", pointerEvents:"none" }}>
            <b>{nomMois(m.mois, true)}{m.mois === enCours ? " (en cours)" : ""}</b><br />
            Position {virgule(m.position)} · {m.affichages.toLocaleString("fr-FR")} affichages · {m.clics} clics · {taux(m)} de clic
          </div>
        )}
      </div>
      <div style={{ marginTop:8 }}>
        {mois.slice().reverse().map(p => (
          <div key={p.mois} style={{ display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap", fontSize:10 * t, color:"#a5d6a7", padding:"2px 0", fontVariantNumeric:"tabular-nums" }}>
            <span>{nomMois(p.mois, true)}{p.mois === enCours ? " (en cours)" : ""}</span>
            <span>position {virgule(p.position)} · {p.affichages.toLocaleString("fr-FR")} aff. · {p.clics} clics · {taux(p)}</span>
          </div>
        ))}
      </div>
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
  pinterest: { icon: "📌", label: "Pinterest", color: "#ff8a80" },
  google:    { icon: "🔍", label: "Google",    color: "#ffcc80" },
  email:     { icon: "✉️", label: "Email",     color: "#ce93d8" },
  linkedin:  { icon: "💼", label: "LinkedIn",  color: "#9fa8da" },
  conseils:  { icon: "📚", label: "Articles Conseils", color: "#c5e1a5" },
  bilan:     { icon: "🏆", label: "Bilans partagés", color: "#ffe082" },
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
function FranceMap({ points, taille = null }) {
  const W = 300, H = 300, pad = 10;
  const cote = taille ? Math.max(600, taille.largeur) : W; // vue agrandie : à faire glisser sur un écran étroit
  const defilement = useDefilement(!!taille, "milieu");
  const proj  = makeProj(W, H, pad);
  const inFR  = p => p.lat >= 41.3 && p.lat <= 51.2 && p.lon >= -5.2 && p.lon <= 9.6;
  const fr    = (points || []).filter(inFR);
  const out   = (points || []).filter(p => !inFR(p));
  const maxC  = Math.max(1, ...fr.map(p => p.count));
  return (
    <div ref={defilement} style={{ overflowX: "auto" }}>
      <svg width={cote} height={cote} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: taille ? "none" : "100%", display: "block", margin: "0 auto" }}>
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
  const [errorsData, setErrorsData] = useState(null);
  const [servicesData, setServicesData] = useState(null);
  const [periode, setPeriode] = useState("mois"); // Finances : vue mensuelle ou annuelle
  const [loadingServices, setLoadingServices] = useState(false);
  const [openProblem, setOpenProblem] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [loadingUsers, setLoadingUsers]     = useState(false);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [tab, setTab]         = useState("activite");
  const [purging, setPurging]             = useState(false);
  const [purgeResult, setPurgeResult]     = useState(null);

  // ── Réseaux sociaux (saisie manuelle mensuelle) ─────────────────────────────
  const [social, setSocial]             = useState(null);
  const [seo, setSeo]                   = useState(null);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [socialForm, setSocialForm]     = useState(null); // { mois:"YYYY-MM", rows:[{compte,plateforme,followers}] }
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialMsg, setSocialMsg]       = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
    const t = setInterval(fetchAll, 60000);
    return () => clearInterval(t);
  }, [isAdmin]);

  async function fetchAll() {
    fetchUsers();
    fetchRevenue();
    fetchSocial();
    fetchErrors();
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

  async function fetchErrors() {
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=errors", { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (data.success) setErrorsData(data);
    } catch {}
  }

  // Position moyenne sur Google (Search Console), lue à l'ouverture de l'onglet Activité : données mises à jour une fois par jour
  async function fetchSeo() {
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=seo", { headers: { Authorization: `Bearer ${token}` } });
      setSeo(await res.json());
    } catch {}
  }
  useEffect(() => { if (isAdmin && tab === "activite" && !seo) fetchSeo(); }, [isAdmin, tab]); // eslint-disable-line

  // Vérification en direct des services (appelée à l'ouverture de l'onglet, pas toutes les 60 s)
  async function fetchServices() {
    setLoadingServices(true);
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=services", { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (data.success) setServicesData(data);
    } catch {}
    setLoadingServices(false);
  }
  useEffect(() => { if (isAdmin && tab === "services" && !servicesData) fetchServices(); }, [isAdmin, tab]); // eslint-disable-line

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

  // Actions de test : alerte email admin, ou notification sur l'abonnement push du compte connecté
  const sendTest = async (type, okMsg) => {
    setSending(true); setSent("");
    try {
      const token = await getToken();
      const res   = await fetch(`/api/send?type=${type}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      fetchErrors();
      setSent(data.success ? okMsg
        : res.status === 404 ? "❌ Aucun abonnement aux notifications sur ce compte — active-les dans Paramètres"
        : "❌ Erreur : " + data.error);
    } catch (e) { setSent("❌ Erreur : " + e.message); }
    setSending(false);
    setTimeout(() => setSent(""), 5000);
  };

  if (!isAdmin) return (
    <div style={{ ...appShell, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, color:"#ef9a9a", marginBottom:8 }}>Accès restreint</div>
      <div style={{ fontSize:13, color:"#81c784", marginBottom:24 }}>Ce dashboard est réservé à l'administrateur.</div>
      <button onClick={() => navigate("/")} style={{ ...btn.primary, width:"auto", padding:"10px 24px" }}>🏠 Retour à l'accueil</button>
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


  // ── Valeurs dérivées pour l'onglet Activité ──────────────────────────────
  const todayLabel  = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" });
  const dauToday    = users?.dauByDay?.find(d => d.label === todayLabel)?.count ?? 0;
  const inscrits    = users?.total ?? null;
  const premiumTot  = revenue?.totalPremium ?? null;
  const pctPremium  = (inscrits && premiumTot != null) ? Math.round((premiumTot / inscrits) * 100) : null;

  return (
    <div>
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
          <div>
            {/* ✅ Le ® ne s'applique qu'à "Mongazon360" (marque déposée EUIPO), pas aux noms d'écrans génériques */}
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
            {periodeLigue() && <LigueHiverCard getToken={getToken} />}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
              <KPI icon="👥" label="Comptes créés" value={loadingUsers ? "..." : (users?.total ?? "—")} sub="Hors admins · ≠ installs" color="#a5d6a7" />
              <KPI icon="🟢" label="Actifs aujourd'hui" value={loadingUsers ? "..." : dauToday} sub="Connectés ce jour" color="#66BB6A" />
              <KPI icon="🌐" label="Visiteurs site (auj.)" value={loadingUsers ? "..." : (users?.siteVisits?.today ?? "—")} sub="Non connectés · toutes pages" color="#4FC3F7" />
              <KPI icon="🆕" label="Nouveaux aujourd'hui" value={loadingUsers ? "..." : (users?.newToday ?? "—")} sub="Inscriptions du jour" color="#90caf9" />
              <KPI icon="📅" label="Nouveaux cette semaine" value={loadingUsers ? "..." : (users?.newLast7 ?? "—")} sub="7 derniers jours" color="#81d4fa" />
              <KPI icon="🗓️" label="Nouveaux ce mois" value={loadingUsers ? "..." : (users?.newLast30 ?? "—")} sub="30 derniers jours" color="#ffcc80" />
              <KPI icon="📆" label="Cette année" value={loadingUsers ? "..." : (users?.newThisYear ?? "—")} sub="Depuis le 1ᵉʳ janvier" color="#c5e1a5" />
              <KPI icon="📸" label="Diagnostics" value={loadingUsers ? "..." : (users?.diagnostics?.total ?? "—")} sub={`+${users?.diagnostics?.last7 ?? 0} cette semaine · ${users?.diagnostics?.users ?? 0} util.`} color="#ce93d8" />
            </div>

            {/* Clarification : comptes créés ≠ installations (sources de vérité distinctes) */}
            <div style={{ fontSize:10, color:"#4a7c5c", padding:"0 4px 10px", lineHeight:1.5 }}>
              ℹ️ « Comptes créés » = inscriptions dans l'app (hors admins), <b>pas</b> les installations.
              Installs &amp; opt-in testeurs : <b>Google Play Console</b> (source de vérité distincte).
            </div>

            {/* ── Entonnoir de conversion : Inscrits → Premium ── */}
            <div style={card()}>
              <div style={cardTitle}><span>🔻 Entonnoir de conversion</span></div>
              <div style={{ display:"flex", alignItems:"stretch", gap:6, marginTop:4 }}>
                {[
                  { label:"Inscrits",    value: inscrits,   color:"#90caf9" },
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
                <Agrandir titre="🗺️ Répartition des inscrits">{taille => <FranceMap points={users.geo} taille={taille} />}</Agrandir>
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

            {/* Conversion par lien / campagne : visites → inscriptions */}
            {users?.acquisition && (
              <div style={card()}>
                <div style={cardTitle}><span>📈 Conversion par source</span><span style={{ fontSize:11, color:"#81c784", textTransform:"none", letterSpacing:0 }}>depuis le {new Date(users.acquisition.debut).toLocaleDateString("fr-FR")}</span></div>
                {[["Par source", users.acquisition.sources, false], ["Par campagne (utm_campaign)", users.acquisition.campagnes, true]].map(([titre, rows, isCamp]) => rows.length > 0 && (
                  <div key={titre} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", fontSize:10, color:"#81c784", fontWeight:700, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                      <span style={{ flex:1 }}>{titre}</span><span style={{ width:52, textAlign:"right" }}>Visites</span><span style={{ width:52, textAlign:"right" }}>Inscrits</span><span style={{ width:52, textAlign:"right" }}>Taux</span>
                    </div>
                    {rows.map(r => {
                      const m = SOURCE_META[r.source] || { icon:"🌐", label:r.source };
                      return (
                        <div key={`${r.source}|${r.campaign || ""}`} style={{ display:"flex", fontSize:12, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.icon} {isCamp ? `${r.campaign} · ${m.label}` : m.label}</span>
                          <span style={{ width:52, textAlign:"right" }}>{r.visits}</span>
                          <span style={{ width:52, textAlign:"right" }}>{r.signups}</span>
                          <span style={{ width:52, textAlign:"right", fontWeight:700, color:"#a5d6a7" }}>{r.rate != null ? `${r.rate} %` : "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div style={{ fontSize:10, color:"#4a7c5c", lineHeight:1.5 }}>
                  Visites = visiteurs non connectés (1 par appareil/jour) ; inscrits = comptes créés sur la même période, rattachés à leur source d'arrivée. Pour une pub, ajouter utm_source et utm_campaign au lien (ex. ?utm_source=facebook&utm_campaign=pub-printemps).
                </div>
              </div>
            )}

            {users?.days?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🆕 Nouveaux inscrits — 30 jours</span></div>
                <Agrandir titre="🆕 Nouveaux inscrits — 30 jours">{taille => <MiniChart data={users.days} valueKey="count" color="#90caf9" taille={taille} />}</Agrandir>
              </div>
            )}
            {users?.dauByDay?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🟢 Actifs par jour</span></div>
                <Agrandir titre="🟢 Actifs par jour">{taille => <MiniChart data={users.dauByDay} valueKey="count" color="#66BB6A" taille={taille} />}</Agrandir>
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
                  Connexions réelles, hors admins. L'historique se construit jour après jour depuis l'activation du suivi.
                </div>
              </div>
            )}
            {users?.siteVisits?.byDay?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🌐 Visiteurs du site — 30 j</span><span style={{ fontSize:11, color:"#81c784" }}>{users.siteVisits.total30} sur 30 j</span></div>
                <Agrandir titre="🌐 Visiteurs du site — 30 jours">{taille => <MiniChart data={users.siteVisits.byDay} valueKey="count" color="#4FC3F7" taille={taille} />}</Agrandir>
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
                  Visiteurs non connectés, toutes pages confondues (accueil, essai, démo, mentions…), 1 par appareil/jour. Les connectés sont dans « Actifs ». Robots (Google…) exclus depuis le 26/09/2026 au soir.
                </div>
              </div>
            )}
            {seo && (
              <div style={card()}>
                <div style={cardTitle}><span>🔎 Position moyenne sur Google — par mois</span></div>
                {seo.success
                  ? <Agrandir titre="🔎 Position moyenne sur Google — par mois">{taille => <PositionChart mois={seo.mois} taille={taille} />}</Agrandir>
                  : <div style={{ fontSize:11, color:"#ffcc80" }}>Données Google indisponibles : {seo.error}</div>}
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
                  Toutes nos pages, d'après la Search Console (moyenne pondérée par les affichages). Plus c'est bas, mieux c'est : 1 à 3 = top 3, jusqu'à 10 = première page. Le mois en cours est provisoire. Quand de nouvelles pages apparaissent loin dans Google, la moyenne peut reculer le temps qu'elles montent. Le taux de clic (clics ÷ affichages) dit combien d'affichages donnent une visite : il suit mieux les progrès réels que la position, qui recule mécaniquement quand on apparaît sur de nouvelles requêtes.
                </div>
              </div>
            )}
            {users?.devices && (
              <div style={card()}>
                <div style={cardTitle}><span>📱 Appareils</span></div>
                {[
                  [`Utilisateurs actifs — depuis le ${users.devices.debut ? new Date(users.devices.debut).toLocaleDateString("fr-FR") : "début"}`, users.devices.depuis.actifs],
                  ["Utilisateurs actifs — 30 j", users.devices.j30.actifs],
                  ["Visiteurs non connectés — depuis le début", users.devices.depuis.visiteurs],
                  ["Visiteurs non connectés — 30 j", users.devices.j30.visiteurs],
                ].map(([titre, d]) => {
                  const pct = (n) => d.total ? `${Math.round(n / d.total * 100)} %` : "—";
                  return (
                    <div key={titre} style={{ marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#a5d6a7", marginBottom:4 }}>{titre} ({d.total})</div>
                      {[["🍎 iPhone / iPad", d.ios, d.iosInstalled], ["🤖 Android", d.android, d.androidInstalled], ["💻 Ordinateur", d.ordinateur, null]].map(([label, n, inst]) => (
                        <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                          <span>{label}{inst != null && n > 0 && <span style={{ color:"#81c784", fontSize:10 }}> · {inst} avec l'app installée</span>}</span>
                          <span style={{ fontWeight:700 }}>{n} · {pct(n)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div style={{ fontSize:10, color:"#4a7c5c", lineHeight:1.5 }}>
                  Chaque utilisateur compte une fois, avec son dernier appareil. Critère App Store (revue fin février 2027) : au moins 25 % d'iPhone chez les utilisateurs actifs depuis le début de la mesure.
                </div>
              </div>
            )}
            {users?.funnel && (
              <div style={card()}>
                <div style={cardTitle}>
                  <span>🎯 Parcours d'acquisition — 30 j</span>
                  <span style={{ fontSize:11, color:"#81c784" }}>
                    {users.funnel.rateGlobal != null ? `${users.funnel.rateGlobal}% visite→inscrit` : "en attente"}
                  </span>
                </div>
                {(() => {
                  const f = users.funnel;
                  const premium = revenue?.totalPremium ?? null;
                  const steps = [
                    { label:"Visite de l'accueil",   icon:"👀", color:"#4FC3F7", val: f.landing_view || 0,       note:null },
                    { label:"Diagnostic lancé",      icon:"🔬", color:"#66BB6A", val: f.anon_diag_started || 0,  note:"essai" },
                    { label:"Clic inscription",      icon:"✍️", color:"#43A047", val: f.signup_from_teaser || 0, note:null },
                    { label:"Inscription validée",   icon:"✅", color:"#2E7D32", val: f.signup_completed || 0,   note:null },
                    { label:"Premium payant activé", icon:"💳", color:"#F9A825", val: premium ?? 0, missing: premium == null, note:"total" },
                  ];
                  const max = Math.max(1, ...steps.map(s => s.val));
                  return steps.map((s) => (
                    <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                      <div style={{ width:150, fontSize:11.5, color:"#cfe8d4", fontWeight:600 }}>
                        {s.icon} {s.label}{s.note ? <span style={{ color:"#4a7c5c", fontWeight:500 }}> · {s.note}</span> : null}
                      </div>
                      <div style={{ flex:1, background:"rgba(255,255,255,0.06)", borderRadius:8, height:22, overflow:"hidden" }}>
                        <div style={{ width:`${Math.max(4, (s.val / max) * 100)}%`, height:"100%", background:s.color, borderRadius:8 }} />
                      </div>
                      <div style={{ width:32, textAlign:"right", fontSize:13, fontWeight:800, color:"#e8f5e9" }}>{s.missing ? "—" : s.val}</div>
                    </div>
                  ));
                })()}
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <div style={{ flex:1, background:"rgba(76,175,80,0.1)", border:"1px solid rgba(102,187,106,0.25)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                    <div style={{ fontSize:10.5, color:"#81c784" }}>Visite → inscription</div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#8BE28F" }}>{users.funnel.rateGlobal != null ? `${users.funnel.rateGlobal}%` : "—"}</div>
                  </div>
                  <div style={{ flex:1, background:"rgba(249,168,37,0.1)", border:"1px solid rgba(249,168,37,0.28)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                    <div style={{ fontSize:10.5, color:"#f0d68a" }}>Essai → clic inscription</div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#f9a825" }}>{users.funnel.rateEssaiClic != null ? `${users.funnel.rateEssaiClic}%` : "—"}</div>
                  </div>
                </div>
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8, lineHeight:1.5 }}>
                  « Diagnostic lancé » et « Visite app » sont deux façons parallèles d'essayer (compare les volumes, pas une cascade). « Essai → clic inscription » = part des essais (diagnostic + démo) suivis d'un clic sur « Créer mon compte ». « Premium payant » = abonnés actifs actuels (Stripe).
                </div>
              </div>
            )}
            {users?.weeks && (
              <div style={card()}>
                <div style={cardTitle}><span>📈 Inscriptions — 8 semaines</span></div>
                <Agrandir titre="📈 Inscriptions — 8 semaines">{taille => <MiniChart data={users.weeks} valueKey="count" color="#43a047" taille={taille} />}</Agrandir>
              </div>
            )}
            {users?.months && (
              <div style={card()}>
                <div style={cardTitle}><span>📅 Inscriptions — 6 mois</span></div>
                <Agrandir titre="📅 Inscriptions — 6 mois">{taille => <MiniChart data={users.months} valueKey="count" color="#1565c0" taille={taille} />}</Agrandir>
              </div>
            )}
            {users?.notifs && (
              <div style={card()}>
                <div style={cardTitle}><span>🔔 Notifications — 14 j</span><span style={{ fontSize:11, color:"#81c784" }}>{users.notifs.push ? Math.round(users.notifs.ouvertes / users.notifs.push * 100) : 0} % ouvertes</span></div>
                <div style={{ fontSize:12, color:"#a5d6a7", marginBottom:6 }}>{users.notifs.push} notifications · {users.notifs.ouvertes} ouvertes · {users.notifs.emails} conseils par email</div>
                {users.notifs.parType.map(([t, v]) => (
                  <div key={t} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <span>{t}</span><span>{v.ouvertes}/{v.envoyees} · {v.envoyees ? Math.round(v.ouvertes / v.envoyees * 100) : 0} %</span>
                  </div>
                ))}
                {users.notifs.retours?.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:"#a5d6a7", margin:"10px 0 4px" }}>Démarrage et relances : retours dans l'app</div>
                    {users.notifs.retours.map(([t, v]) => (
                      <div key={t} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                        <span>{t}</span><span>{v.retours}/{v.envoyes} · {v.envoyes ? Math.round(v.retours / v.envoyes * 100) : 0} %</span>
                      </div>
                    ))}
                  </>
                )}
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8, lineHeight:1.5 }}>
                  Ouvertures mesurées depuis le 26/09/2026 (clic sur la notification). Retour = visite dans l'app le jour même ou le lendemain du message (emails tracés depuis le 07/10/2026).
                </div>
              </div>
            )}
            {users?.retention && (() => {
              const r = users.retention;
              const taux = (m) => m.eligibles ? `${Math.round(m.revenus / m.eligibles * 100)} %` : "—";
              const moisLabel = (m) => new Date(`${m}-01`).toLocaleDateString("fr-FR", { month:"short", year:"2-digit" });
              return (
                <div style={card()}>
                  <div style={cardTitle}><span>🔁 Rétention des inscrits</span><span style={{ fontSize:11, color:"#81c784" }}>{r.global.inscrits} inscrit{r.global.inscrits > 1 ? "s" : ""} mesuré{r.global.inscrits > 1 ? "s" : ""}</span></div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center", marginBottom:10 }}>
                    {[["j7", "Revenus après J+7"], ["j30", "Après J+30"], ["j90", "Après J+90"]].map(([k, l]) => (
                      <div key={k}><div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>{taux(r.global[k])}</div><div style={{ fontSize:10, color:"#81c784" }}>{l} · {r.global[k].revenus}/{r.global[k].eligibles}</div></div>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr", fontSize:11, color:"#81c784", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                    <span>Inscrits en</span><span style={{ textAlign:"right" }}>Nb</span><span style={{ textAlign:"right" }}>J+7</span><span style={{ textAlign:"right" }}>J+30</span><span style={{ textAlign:"right" }}>J+90</span>
                  </div>
                  {r.cohortes.map(c => (
                    <div key={c.mois} style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr", fontSize:12, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      <span>{moisLabel(c.mois)}</span><span style={{ textAlign:"right" }}>{c.inscrits}</span>
                      {["j7", "j30", "j90"].map(k => <span key={k} style={{ textAlign:"right" }}>{taux(c[k])}</span>)}
                    </div>
                  ))}
                  <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8, lineHeight:1.5 }}>
                    « Revenu après J+30 » = a utilisé l'app au moins une fois 30 jours ou plus après son inscription. Inscrits depuis le début de la mesure ({new Date(r.debut).toLocaleDateString("fr-FR")}), hors admins ; « — » = cohorte trop récente.
                  </div>
                </div>
              );
            })()}
            {users?.relances && (
              <div style={card()}>
                <div style={cardTitle}><span>👋 Relances des inactifs — 30 j</span><span style={{ fontSize:11, color:"#81c784" }}>{users.relances.mesurables ? Math.round(users.relances.retours / users.relances.mesurables * 100) : 0} % de retour</span></div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center", marginBottom:8 }}>
                  {[["Inactifs 7-20 j", users.relances.inactifs.j7], ["Inactifs 21-44 j", users.relances.inactifs.j21], ["Inactifs 45 j +", users.relances.inactifs.j45]].map(([l, v]) => (
                    <div key={l}><div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>{v}</div><div style={{ fontSize:10, color:"#81c784" }}>{l}</div></div>
                  ))}
                </div>
                <div style={{ fontSize:12, color:"#a5d6a7" }}>{users.relances.envoyees} relance{users.relances.envoyees > 1 ? "s" : ""} ({users.relances.parCanal.push} notifications · {users.relances.parCanal.email} emails) · {users.relances.retours} retour{users.relances.retours > 1 ? "s" : ""} sur {users.relances.mesurables} mesurable{users.relances.mesurables > 1 ? "s" : ""}</div>
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8, lineHeight:1.5 }}>
                  3 relances au plus par absence (J+7, J+21, J+45 ; J+21 et J+45 de novembre à février). Retour = visite dans les 7 jours qui suivent la relance. Depuis le 27/09/2026.
                </div>
              </div>
            )}
            {users?.bob && (
              <div style={card()}>
                <div style={cardTitle}><span>🤖 Bob — 30 j</span><span style={{ fontSize:11, color:"#81c784" }}>{users.bob.utilisateurs} utilisateur{users.bob.utilisateurs > 1 ? "s" : ""}</span></div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
                  {[["Questions Premium", users.bob.questionsPremium], ["Questions gratuites", users.bob.questionsGratuites], ["Gratuits à 3/3 ce mois", users.bob.gratuitsAuMax]].map(([l, v]) => (
                    <div key={l}><div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>{v}</div><div style={{ fontSize:10, color:"#81c784" }}>{l}</div></div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8, lineHeight:1.5 }}>
                  Comptage depuis le 26/09/2026. « Gratuits à 3/3 » = comptes gratuits ayant épuisé leurs questions du mois : les plus susceptibles de passer Premium.
                </div>
              </div>
            )}
            {users?.diagnostics?.topProblems?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🔬 Top problèmes détectés</span>{users.diagnostics.avgScore != null && <span style={{ fontSize:11, color:"#81c784", textTransform:"none", letterSpacing:0 }}>score visuel moyen {users.diagnostics.avgScore}/100</span>}</div>
                {users.diagnostics.topProblems.map(([nom, count]) => (
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
              <KPI icon="📅" label="Premium mensuel" value={loadingRevenue ? "..." : (revenue?.premiumMonthly ?? "—")} sub={`Abonnés à ${enEuros(OFFRE.prixMensuel)}/mois`} color="#a5d6a7" />
              <KPI icon="🗓️" label="Premium annuel" value={loadingRevenue ? "..." : (revenue?.premiumYearly ?? "—")} sub={`Abonnés à ${enEuros(OFFRE.prixAnnuel)}/an`} color="#90caf9" />
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
                <Agrandir titre="📈 Revenus — 8 semaines (€)">{taille => <MiniChart data={revenue.weeks} valueKey="revenue" color="#f9a825" unit="€" taille={taille} />}</Agrandir>
              </div>
            )}
            {revenue?.months && (
              <div style={card()}>
                <div style={cardTitle}><span>📅 Revenus — 6 mois (€)</span></div>
                <Agrandir titre="📅 Revenus — 6 mois (€)">{taille => <MiniChart data={revenue.months} valueKey="revenue" color="#e65100" unit="€" taille={taille} />}</Agrandir>
              </div>
            )}
            {/* ── Compte de résultat : produits − charges (mensuel / annuel) ── */}
            {(() => {
              const k      = periode === "an" ? 12 : 1;
              const nbM    = revenue?.premiumMonthly || 0;
              const nbY    = revenue?.premiumYearly  || 0;
              const caM    = nbM * OFFRE.prixMensuel * k;          // abonnements mensuels
              const caY    = nbY * OFFRE.prixAnnuel * (k / 12);    // abonnements annuels (lissés)
              const ca     = caM + caY;
              const stripe = (nbM * (STRIPE_FEES.pct * OFFRE.prixMensuel + STRIPE_FEES.fixed)) * k
                           + (nbY * (STRIPE_FEES.pct * OFFRE.prixAnnuel + STRIPE_FEES.fixed)) * (k / 12);
              const urssaf = ca * URSSAF_RATE;
              const fixes  = CHARGES_ACTIVES.reduce((t, c) => t + montant(c, periode), 0);
              const charges = fixes + stripe + urssaf;
              const resultat = ca - charges;
              const prevues = CHARGES_PREVUES.reduce((t, c) => t + montant(c, periode), 0);
              const line = (label, val, sub, color = "#e8f5e9", bold = false) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight: bold ? 800 : 600 }}>{label}</div>
                    {sub && <div style={{ fontSize:10, color:"#81c784", marginTop:1 }}>{sub}</div>}
                  </div>
                  <span style={{ fontSize:12, fontWeight:800, color, whiteSpace:"nowrap" }}>{val}</span>
                </div>
              );
              const section = (t) => <div style={{ fontSize:11, fontWeight:800, color:"#f9a825", margin:"12px 0 2px", textTransform:"uppercase", letterSpacing:1 }}>{t}</div>;
              const suffixe = periode === "an" ? "/an" : "/mois";
              return (
                <>
                  <div style={{ ...card(), background:"rgba(249,168,37,0.06)", border:"1px solid rgba(249,168,37,0.2)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={cardTitle}><span>🧾 Produits et charges</span></div>
                      <div style={{ display:"flex", gap:4 }}>
                        {[["mois","Mensuel"],["an","Annuel"]].map(([v, l]) => (
                          <button key={v} onClick={() => setPeriode(v)} style={{ background: periode===v ? "rgba(249,168,37,0.25)" : "rgba(255,255,255,0.06)", border: periode===v ? "1px solid rgba(249,168,37,0.5)" : "1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"4px 10px", color: periode===v ? "#f9a825" : "#81c784", fontSize:11, cursor:"pointer" }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                      {[["Produits", ca, "#a5d6a7"], ["Charges", charges, "#ef9a9a"], ["Résultat", resultat, resultat >= 0 ? "#66bb6a" : "#ef5350"]].map(([l, v, c]) => (
                        <div key={l} style={{ background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px 4px", textAlign:"center" }}>
                          <div style={{ fontSize:16, fontWeight:800, color:c }}>{loadingRevenue ? "…" : eur(v)}</div>
                          <div style={{ fontSize:10, color:"#81c784" }}>{l} {suffixe}</div>
                        </div>
                      ))}
                    </div>

                    {section("Produits")}
                    {line("Abonnements mensuels", eur(caM), `${nbM} abonné(s) × ${enEuros(OFFRE.prixMensuel)}/mois`, "#a5d6a7")}
                    {line("Abonnements annuels", eur(caY), `${nbY} abonné(s) × ${enEuros(OFFRE.prixAnnuel)}/an, lissé`, "#a5d6a7")}
                    {line("Affiliation Amazon", eur(0), "Commissions non remontées automatiquement", "#a5d6a7")}
                    {line("Données anonymisées · Marque propre", eur(0), "À venir (Phase 4)", "#81c784")}
                    {line("Total produits", eur(ca), null, "#a5d6a7", true)}

                    {section("Charges fixes")}
                    {CHARGES_ACTIVES.map(c => line(c.name, eur(montant(c, periode)),
                      [c.role, c.currency === "USD" ? `${c.amount} $/${c.period}` : null, c.note].filter(Boolean).join(" · "), "#ef9a9a"))}

                    {section("Marketing")}
                    {line("Budget publicitaire", "à définir", "Montant 2027 à déterminer (étude à venir) — non inclus", "#ffcc80")}

                    {section("Charges variables")}
                    {line("Frais Stripe", eur(stripe), `${STRIPE_FEES.pct * 100} % + ${STRIPE_FEES.fixed.toFixed(2).replace(".", ",")} € par paiement`, "#ef9a9a")}
                    {line("Cotisations URSSAF", eur(urssaf), `${(URSSAF_RATE * 100).toFixed(1).replace(".", ",")} % du chiffre d'affaires (sans versement libératoire)`, "#ef9a9a")}
                    {line("Total charges", eur(charges), null, "#ef9a9a", true)}

                    <div style={{ marginTop:10, padding:"10px 12px", borderRadius:10, background: resultat >= 0 ? "rgba(67,160,71,0.15)" : "rgba(198,40,40,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, fontWeight:800 }}>Résultat {suffixe}</span>
                      <span style={{ fontSize:16, fontWeight:900, color: resultat >= 0 ? "#66bb6a" : "#ef5350" }}>{eur(resultat)}</span>
                    </div>
                    <div style={{ fontSize:10, color:"#81c784", marginTop:8, lineHeight:1.5 }}>
                      Produits calculés sur les abonnements actifs Stripe (projection). Montants en dollars convertis au taux indicatif. Charges à tenir à jour dans <code>src/lib/charges.js</code>.
                    </div>
                  </div>

                  {(() => {
                    // Point d'équilibre : abonnés nécessaires pour couvrir les charges fixes, après Stripe et URSSAF
                    const fixesMois = CHARGES_ACTIVES.reduce((t, c) => t + montant(c, "mois"), 0);
                    const prevuesMois = CHARGES_PREVUES.reduce((t, c) => t + montant(c, "mois"), 0);
                    const net = (prix, parMois) => (prix * (1 - URSSAF_RATE) - (STRIPE_FEES.pct * prix + STRIPE_FEES.fixed)) / parMois;
                    const formules = [
                      [`Mensuel ${enEuros(OFFRE.prixMensuel)}`, net(OFFRE.prixMensuel, 1)],
                      [`Annuel ${enEuros(OFFRE.prixAnnuel)}`, net(OFFRE.prixAnnuel, 12)],
                      [`Offre 1 an ${enEuros(OFFRE.prixOffre)}`, net(OFFRE.prixOffre, 12)],
                    ];
                    const abonnes = (revenue?.premiumMonthly || 0) + (revenue?.premiumYearly || 0);
                    return (
                      <div style={card()}>
                        <div style={cardTitle}><span>⚖️ Point d'équilibre</span><span style={{ fontSize:11, color:"#81c784", textTransform:"none", letterSpacing:0 }}>{loadingRevenue ? "…" : `${abonnes} abonné${abonnes > 1 ? "s" : ""} aujourd'hui`}</span></div>
                        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr", fontSize:11, color:"#81c784", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                          <span>Formule</span><span style={{ textAlign:"right" }}>Net/mois</span><span style={{ textAlign:"right" }}>Charges</span><span style={{ textAlign:"right" }}>+ prévues</span>
                        </div>
                        {formules.map(([l, n]) => (
                          <div key={l} style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr", fontSize:12, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                            <span>{l}</span><span style={{ textAlign:"right" }}>{eur(n)}</span>
                            <span style={{ textAlign:"right", fontWeight:800 }}>{Math.ceil(fixesMois / n)}</span>
                            <span style={{ textAlign:"right", fontWeight:800, color:"#ffcc80" }}>{Math.ceil((fixesMois + prevuesMois) / n)}</span>
                          </div>
                        ))}
                        <div style={{ fontSize:10, color:"#81c784", marginTop:8, lineHeight:1.5 }}>
                          Nombre d'abonnés d'une même formule pour couvrir les charges fixes ({eur(fixesMois)}/mois), ou avec les charges prévues ({eur(fixesMois + prevuesMois)}/mois). Net = prix − URSSAF − frais Stripe. Hors commissions Amazon et publicité.
                        </div>
                      </div>
                    );
                  })()}

                  <div style={card()}>
                    <div style={cardTitle}><span>🔮 Charges prévues</span><span style={{ fontSize:11, color:"#ffcc80", textTransform:"none", letterSpacing:0 }}>+{eur(prevues)} {suffixe}</span></div>
                    {CHARGES_PREVUES.map(c => line(c.name, eur(montant(c, periode)),
                      [c.role, c.currency === "USD" ? `${c.amount} $/${c.period}` : null].filter(Boolean).join(" · "), "#ffcc80"))}
                    <div style={{ fontSize:10, color:"#81c784", marginTop:8 }}>
                      Non incluses dans le résultat. Résultat si toutes activées : <strong style={{ color: resultat - prevues >= 0 ? "#66bb6a" : "#ef5350" }}>{eur(resultat - prevues)} {suffixe}</strong>
                    </div>
                  </div>
                </>
              );
            })()}
            {loadingRevenue && (
              <div style={{ textAlign:"center", color:"#81c784", fontSize:12, padding:16 }}>🔄 Chargement données Stripe...</div>
            )}
            <PremiumOffertsCard getToken={getToken} />
          </>
        )}

        {/* ════════════════ TAB ROADMAP ════════════════ */}
        {tab === "roadmap" && <RoadmapTab />}

        {/* ════════════════ TAB SERVICES ════════════════ */}
        {tab === "services" && (
          <>
            <div style={card()}>
              <div style={cardTitle}>
                <span>⚙️ Statut des services — vérifié en direct</span>
                <button onClick={fetchServices} disabled={loadingServices} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"3px 8px", color:"#81c784", fontSize:10, cursor:"pointer", textTransform:"none", letterSpacing:0 }}>
                  {loadingServices ? "…" : "↻ Revérifier"}
                </button>
              </div>
              {!servicesData ? (
                <div style={{ textAlign:"center", fontSize:12, color:"#81c784", padding:"12px 0" }}>{loadingServices ? "Vérification en cours…" : "—"}</div>
              ) : servicesData.services.map(s => {
                const icon  = { ok:"✅", warn:"⚠️", ko:"🔴", info:"ℹ️" }[s.status] || "ℹ️";
                const color = { ok:"#81c784", warn:"#ffcc80", ko:"#ef9a9a", info:"#90caf9" }[s.status] || "#81c784";
                return (
                  <div key={s.name} style={{ padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, fontWeight:700 }}>{icon} {s.name}</span>
                      <span style={{ fontSize:10, color:"#000000", fontWeight:600, textAlign:"right" }}>{s.cost}</span>
                    </div>
                    <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>{s.role}</div>
                    <div style={{ fontSize:10, color, marginTop:2 }}>{s.detail}</div>
                  </div>
                );
              })}
              <div style={{ padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700 }}>{__API_FUNCTIONS__ >= 12 ? "⚠️" : "✅"} Vercel</span>
                  <span style={{ fontSize:10, color:"#000000", fontWeight:600 }}>Hobby — gratuit</span>
                </div>
                <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>Hébergement + mesure d'audience</div>
                <div style={{ fontSize:10, color: __API_FUNCTIONS__ >= 12 ? "#ffcc80" : "#81c784", marginTop:2 }}>{__API_FUNCTIONS__}/12 fonctions serveur</div>
              </div>
              {servicesData?.checkedAt && (
                <div style={{ fontSize:10, color:"#000000", fontWeight:600, marginTop:8 }}>Vérifié à {new Date(servicesData.checkedAt).toLocaleTimeString("fr-FR")}</div>
              )}
            </div>

            {servicesData?.manual?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>🔗 Autres services (suivi manuel)</span></div>
                {servicesData.manual.map(s => (
                  <div key={s.name} style={{ padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                      <span style={{ fontSize:12, fontWeight:700 }}>{s.name}</span>
                      <span style={{ fontSize:10, color:"#000000", fontWeight:600 }}>{s.cost}</span>
                    </div>
                    <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>{s.role} — {s.detail}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={card()}>
              <div style={cardTitle}><span>🗑️ Purge Cloudinary</span></div>
              <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
                Les photos de diagnostic de plus de <strong style={{ color:"#a5d6a7" }}>90 jours</strong> sont supprimées automatiquement chaque matin (durée de conservation RGPD). Ce bouton force la purge immédiatement.
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
                <button onClick={() => sendTest("alert-test", "✅ Alerte test envoyée !")} disabled={sending} style={{ ...btn.ghost, fontSize:13, opacity:sending?0.7:1 }}>
                  🧪 Tester l'alerte email
                </button>
                <button onClick={() => sendTest("notification-test", "✅ Notification envoyée sur ton téléphone !")} disabled={sending} style={{ ...btn.ghost, fontSize:13, opacity:sending?0.7:1 }}>
                  🔔 Tester la notification sur mon téléphone
                </button>
              </div>
            </div>
          </>
        )}

        {/* ════════════════ TAB BUGS ════════════════ */}
        {tab === "bugs" && (() => {
          const k = errorsData?.kpi;
          const matin = errorsData?.status?.cron_matin;
          const soir  = errorsData?.status?.cron_soir;
          const today = new Date().toISOString().slice(0, 10);
          const cronLine = (label, st, expectedToday) => {
            const ok = st?.date === today || (!expectedToday && st?.date);
            return (
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0" }}>
                <span>{ok ? "✅" : "⚠️"} {label}</span>
                <span style={{ color: ok ? "#81c784" : "#ffcc80" }}>
                  {st?.at ? new Date(st.at).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "pas encore de relevé"}
                </span>
              </div>
            );
          };
          return (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:4 }}>
              <KPI icon="🔴" label="Erreurs 7 j" value={k?.events7 ?? "—"} sub={`dont ${k?.server7 ?? 0} serveur`} color="#ef9a9a" />
              <KPI icon="🧩" label="Problèmes 7 j" value={k?.problems7 ?? "—"} sub="distincts" color="#ffcc80" />
              <KPI icon="👤" label="Utilisateurs 7 j" value={k?.users7 ?? "—"} sub="touchés" color="#90caf9" />
            </div>

            <div style={card()}>
              <div style={cardTitle}><span>⏱️ Tâches planifiées</span></div>
              {cronLine("Tâche du matin (notifications, purges)", matin, new Date().getUTCHours() >= 7)}
              {cronLine("Tâche du soir (arrosage)", soir, new Date().getUTCHours() >= 16)}
            </div>

            {(() => {
              const v = errorsData?.status?.veille_domaines;
              const noms = Object.entries(v?.domaines || {});
              const nouveaux = noms.filter(([, d]) => d > v.reference).sort((a, b) => b[1].localeCompare(a[1]));
              const date = (d) => new Date(d).toLocaleDateString("fr-FR");
              return (
                <div style={card()}>
                  <div style={cardTitle}><span>🛡️ Veille de marque — noms de domaine</span></div>
                  {!v ? (
                    <div style={{ fontSize:12, color:"#81c784" }}>Premier relevé ce soir (tâche du soir).</div>
                  ) : (
                    <>
                      <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6 }}>
                        Noms commençant par mongazon, mon-gazon, mongason ou gazon360 ayant un certificat HTTPS · {noms.length} connus depuis le {date(v.reference)} · vérifié le {date(v.verifie_le)}
                      </div>
                      {nouveaux.length === 0 ? (
                        <div style={{ fontSize:12, color:"#81c784", marginTop:6 }}>✅ Aucun nouveau nom depuis le premier relevé</div>
                      ) : nouveaux.map(([nom, d]) => (
                        <div key={nom} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                          <a href={`https://${nom}`} target="_blank" rel="noopener noreferrer" style={{ color:"#ffcc80" }}>⚠️ {nom}</a>
                          <span style={{ color:"#81c784" }}>{date(d)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}

            <div style={card()}>
              <div style={cardTitle}><span>🐛 Problèmes — 30 derniers jours</span><span style={{ fontSize:11, color:"#81c784" }}>tous utilisateurs</span></div>
              {!errorsData ? (
                <div style={{ textAlign:"center", fontSize:12, color:"#81c784", padding:"12px 0" }}>Chargement…</div>
              ) : errorsData.problems.length === 0 ? (
                <div style={{ textAlign:"center", fontSize:12, color:"#81c784", padding:"12px 0" }}>✅ Aucune erreur enregistrée</div>
              ) : errorsData.problems.map(p => {
                const s = SEV_STYLE[p.severity] || SEV_STYLE.error;
                const open = openProblem === p.fingerprint;
                return (
                  <div key={p.fingerprint} onClick={() => setOpenProblem(open ? null : p.fingerprint)}
                    style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:"10px 12px", marginBottom:6, cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{p.source === "server" ? "🖥️" : "📱"} {p.kind}</span>
                      <span style={{ fontSize:10, color:"#e8f5e9", whiteSpace:"nowrap" }}>×{p.count}{p.users ? ` · ${p.users} util.` : ""}</span>
                    </div>
                    <div style={{ fontSize:11, color:"#e8f5e9", lineHeight:1.5, wordBreak:"break-word" }}>{p.message}</div>
                    <div style={{ fontSize:9, color:"#81c784", marginTop:4 }}>
                      Dernière : {new Date(p.lastSeen).toLocaleString("fr-FR")} · Première : {new Date(p.firstSeen).toLocaleDateString("fr-FR")}{p.emailed ? " · 📧 alerté" : ""}
                    </div>
                    {open && (
                      <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.1)" }}>
                        {p.lastPath && <div style={{ fontSize:9, color:"#81c784" }}>Page : {p.lastPath}</div>}
                        {p.lastUserAgent && <div style={{ fontSize:9, color:"#81c784", wordBreak:"break-all" }}>Appareil : {p.lastUserAgent}</div>}
                        {p.lastDetails && Object.entries(p.lastDetails).map(([key, v]) => (
                          <div key={key} style={{ fontSize:9, color:"#81c784", wordBreak:"break-all" }}>{key} : {String(v)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
          );
        })()}

        {/* ════════════════ TAB RÉSEAUX ════════════════ */}
        {tab === "reseaux" && (
          <>
            <PublicationsCard getToken={getToken} />
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
                <Agrandir titre="📈 Followers au total — par mois">{taille => <MiniChart data={social.byMonth} valueKey="total" color="#43a047" taille={taille} />}</Agrandir>
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
                      {serie.length > 1 && (
                        <Agrandir titre={`${m.icon} ${a.compte} (${m.label}) — followers par mois`}>
                          {taille => <MiniChart data={serie} valueKey="count" color={m.color} taille={taille} />}
                        </Agrandir>
                      )}
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
                    {["instagram","tiktok","facebook","youtube","pinterest","twitter","linkedin","autre"].map(p => {
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
