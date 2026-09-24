// src/components/RoadmapTab.jsx
// Onglet Roadmap du Pilotage — lecture live du Google Sheet « Suivi de Projet » (source unique).
import { useState, useEffect, useMemo } from "react";
import { card, cardTitle } from "../lib/styles";
import {
  SHEET_ID, SHEETS_EDIT_URL, OBJECTIF_PCT,
  parseRoadmap, buildRoadmapView,
} from "../lib/roadmap";

const REFRESH_MS = 60000;

const KIND_STYLE = {
  done:   { bg:"rgba(67,160,71,0.15)",   border:"rgba(67,160,71,0.4)",   color:"#a5d6a7" },
  doing:  { bg:"rgba(230,81,0,0.15)",    border:"rgba(230,81,0,0.4)",    color:"#ffcc80" },
  check:  { bg:"rgba(21,101,192,0.15)",  border:"rgba(66,165,245,0.35)", color:"#90caf9" },
  paused: { bg:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.15)", color:"#b0bec5" },
  todo:   { bg:"rgba(198,40,40,0.12)",   border:"rgba(229,57,53,0.3)",   color:"#ef9a9a" },
};
const THEME_PALETTE = ["#66bb6a","#42a5f5","#26a69a","#ba68c8","#ffa726","#9ccc65","#f06292","#ef5350","#26c6da","#ffd54f","#4fc3f7","#aed581","#ff8a65"];
const themeColor = theme => {
  let h = 0; for (const ch of theme) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return THEME_PALETTE[h % THEME_PALETTE.length];
};
const pctColor = p => p >= OBJECTIF_PCT ? "#66bb6a" : p >= OBJECTIF_PCT - 5 ? "#ffa726" : "#ef5350";

function Bar({ value, color, marker }) {
  return (
    <div style={{ position:"relative", background:"rgba(255,255,255,0.08)", borderRadius:6, height:6, width:"100%", marginTop:4 }}>
      <div style={{ width:Math.min(100, Math.max(0, value))+"%", height:"100%", background:color, borderRadius:6, transition:"width 0.6s" }} />
      {marker != null && (
        <div title={`Objectif ${marker} %`} style={{ position:"absolute", left:marker+"%", top:-3, width:2, height:12, background:"#fff", opacity:0.7, borderRadius:1 }} />
      )}
    </div>
  );
}

function Section({ title, count, children, collapsible = false, defaultOpen = true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={card()}>
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ ...cardTitle, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: open ? 10 : 0, cursor: collapsible ? "pointer" : "default", color: accent || cardTitle.color }}
      >
        <span>{title}{count != null && <span style={{ marginLeft:6, opacity:0.8 }}>({count})</span>}</span>
        {collapsible && <span style={{ fontSize:11, letterSpacing:0, textTransform:"none", color:"#81c784" }}>{open ? "▲ Masquer" : "▼ Voir"}</span>}
      </div>
      {open && children}
    </div>
  );
}

function TaskRow({ t, showTheme = true, showPct = false }) {
  const s = KIND_STYLE[t.kind] || KIND_STYLE.todo;
  const meta = [t.dateLabel && `📅 ${t.dateLabel}`, t.priorite, showTheme && t.theme].filter(Boolean).join(" · ");
  return (
    <div style={{ padding:"8px 10px", marginBottom:4, borderRadius:8, background:s.bg, border:`1px solid ${s.border}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>{t.etape}</div>
          {meta && <div style={{ fontSize:9, color:"#81c784", marginTop:3 }}>{meta}</div>}
        </div>
        <span style={{ fontSize:10, fontWeight:700, color:s.color, whiteSpace:"nowrap", flexShrink:0 }}>
          {showPct && t.pct != null ? `${t.pct}%` : t.statut}
        </span>
      </div>
      {showPct && t.pct != null && <Bar value={t.pct} color={s.color} />}
    </div>
  );
}

const Empty = ({ children }) => <div style={{ fontSize:12, color:"#81c784", textAlign:"center", padding:"6px 0" }}>{children}</div>;

export default function RoadmapTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [expanded, setExpanded] = useState({});

  async function fetchRoadmap() {
    setLoading(true);
    setError(null);
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      // Sans nom d'onglet : l'API lit la première feuille, quel que soit son nom
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A1:I1000`
        + `?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER&key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (!json.values?.length) throw new Error("Feuille vide");
      setData(parseRoadmap(json.values));
    } catch (e) {
      setError("Impossible de charger la roadmap : " + e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRoadmap();
    const t = setInterval(fetchRoadmap, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  const view = useMemo(() => data ? buildRoadmapView(data.tasks) : null, [data]);
  const pct  = data?.pctGlobal;

  return (
    <>
      {/* ── En-tête : avancement global vs objectif ── */}
      <div style={{ ...card(), background:"rgba(249,168,37,0.06)", border:"1px solid rgba(249,168,37,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#f9a825" }}>📊 Suivi de Projet MG360</div>
            {data?.majDate && <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>Mis à jour le {data.majDate} — Google Sheets live</div>}
          </div>
          <div style={{ textAlign:"right" }}>
            {pct != null && <div style={{ fontSize:22, fontWeight:900, color:pctColor(pct) }}>{pct}%</div>}
            <div style={{ fontSize:10, color:"#81c784" }}>Avancement global</div>
          </div>
        </div>
        {pct != null && (
          <>
            <Bar value={pct} color={pctColor(pct)} marker={OBJECTIF_PCT} />
            <div style={{ fontSize:10, marginTop:6, color:pctColor(pct) }}>
              {pct >= OBJECTIF_PCT
                ? `✅ Objectif ≥ ${OBJECTIF_PCT} % tenu (+${pct - OBJECTIF_PCT} pt)`
                : `⚠️ Sous l'objectif de ${OBJECTIF_PCT} % (−${OBJECTIF_PCT - pct} pt)`}
            </div>
          </>
        )}
        {view && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginTop:10 }}>
            {[["✅ Terminées", view.counts.done, "#a5d6a7"], ["🟡 En cours", view.counts.doing, "#ffcc80"], ["❌ À faire", view.counts.todo, "#ef9a9a"]].map(([l, n, c]) => (
              <div key={l} style={{ background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"6px 4px", textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:800, color:c }}>{n}</div>
                <div style={{ fontSize:9, color:"#81c784" }}>{l}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={fetchRoadmap} disabled={loading} style={{ marginTop:10, width:"100%", background:"rgba(249,168,37,0.1)", border:"1px solid rgba(249,168,37,0.25)", borderRadius:8, padding:"7px", color:"#f9a825", fontSize:11, cursor:"pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "🔄 Synchronisation..." : "↻ Synchroniser depuis Google Sheets"}
        </button>
        <button
          onClick={() => window.open(SHEETS_EDIT_URL, "_blank", "noopener,noreferrer")}
          style={{ marginTop:6, width:"100%", background:"rgba(52,168,83,0.12)", border:"1px solid rgba(52,168,83,0.3)", borderRadius:8, padding:"7px", color:"#52d48a", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
        >
          <span style={{ fontSize:14 }}>📝</span> Modifier dans Google Sheets
        </button>
        {error && <div style={{ marginTop:8, fontSize:11, color:"#ef9a9a", background:"rgba(198,40,40,0.1)", borderRadius:8, padding:"6px 10px" }}>{error}</div>}
      </div>

      {loading && !data && <div style={{ textAlign:"center", color:"#81c784", fontSize:13, padding:32 }}>🔄 Chargement depuis Google Sheets...</div>}

      {view && (
        <>
          <Section title="🚨 En retard" count={view.retard.length} accent={view.retard.length ? "#ef9a9a" : undefined}>
            {view.retard.length ? view.retard.map((t, i) => <TaskRow key={i} t={t} />) : <Empty>Aucune tâche en retard 👌</Empty>}
          </Section>

          <Section title="🎯 Échéances à venir" count={view.aVenirCount}>
            {view.aVenirParMois.length ? view.aVenirParMois.map(m => (
              <div key={m.label} style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#f9a825", margin:"4px 0 6px", textTransform:"capitalize" }}>{m.label}</div>
                {m.tasks.map((t, i) => <TaskRow key={i} t={t} />)}
              </div>
            )) : <Empty>Rien de planifié sur les 3 prochains mois</Empty>}
          </Section>

          <Section title="🟡 En cours" count={view.enCours.length}>
            {view.enCours.length ? view.enCours.map((t, i) => <TaskRow key={i} t={t} showPct />) : <Empty>Aucune tâche en cours</Empty>}
          </Section>

          <Section title="🗺️ Avancement par thème" count={view.parTheme.length}>
            {view.parTheme.map(({ theme, tasks, done, total, pct: p }) => {
              const color = themeColor(theme);
              const isOpen = expanded[theme] || false;
              return (
                <div key={theme} style={{ marginBottom:12 }}>
                  <div onClick={() => setExpanded(e => ({ ...e, [theme]: !e[theme] }))} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3, cursor:"pointer" }}>
                    <span style={{ fontWeight:700 }}>{isOpen ? "▾" : "▸"} {theme}</span>
                    <span style={{ color, fontWeight:700 }}>{done}/{total} — {p}%</span>
                  </div>
                  <Bar value={p} color={color} />
                  {isOpen && <div style={{ marginTop:8 }}>{tasks.map((t, i) => <TaskRow key={i} t={t} showTheme={false} />)}</div>}
                </div>
              );
            })}
          </Section>

          <Section title="🔭 Plus tard (horizon 2027)" count={view.plusTard.length + view.sansDate.length + view.reportes.length} collapsible defaultOpen={false}>
            {view.plusTard.map((t, i) => <TaskRow key={"p"+i} t={t} />)}
            {view.sansDate.length > 0 && <div style={{ fontSize:11, fontWeight:700, color:"#f9a825", margin:"10px 0 6px" }}>Sans date cible</div>}
            {view.sansDate.map((t, i) => <TaskRow key={"s"+i} t={t} />)}
            {view.reportes.length > 0 && <div style={{ fontSize:11, fontWeight:700, color:"#b0bec5", margin:"10px 0 6px" }}>Reportées</div>}
            {view.reportes.map((t, i) => <TaskRow key={"r"+i} t={t} />)}
          </Section>
        </>
      )}
    </>
  );
}
