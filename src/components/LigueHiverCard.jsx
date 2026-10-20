// src/components/LigueHiverCard.jsx
// Pilotage → Activité : ligue d'hiver (api/stats.js?type=ligue) — participation par semaine (défis, quiz, bonnes réponses
// en moyenne), badges en vue et participants les plus assidus, pour désigner le gagnant de la dotation (règlement,
// CGU 6 g ; comptes de test et admins exclus).
import { useState, useEffect } from "react";
import { card, cardTitle } from "../lib/styles";
import { LIGUE, dateLongue } from "../lib/ligueHiver";

export default function LigueHiverCard({ getToken }) {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/stats?type=ligue", { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || `HTTP ${res.status}`);
        setData(d);
      } catch (e) { setErreur(e.message); }
    })();
  }, []); // eslint-disable-line

  const ligne = { display:"flex", justifyContent:"space-between", gap:8, fontSize:12, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" };
  const passees = data ? data.semaines.filter(s => !data.semaine || s.semaine <= data.semaine) : [];
  return (
    <div style={card()}>
      <div style={cardTitle}>
        <span>❄️ Ligue d'hiver {LIGUE.saison}</span>
        {data && <span style={{ fontSize:11, color:"#81c784" }}>{data.semaine ? `semaine ${data.semaine}/${LIGUE.semaines}` : `départ le ${dateLongue(data.debut)}`}</span>}
      </div>
      {erreur && <div style={{ fontSize:12, color:"#ef9a9a" }}>⚠️ {erreur}</div>}
      {!data && !erreur && <div style={{ fontSize:12, color:"#81c784" }}>🔄 Chargement…</div>}
      {data && (
        <>
          <div style={{ fontSize:12.5, color:"#a5d6a7", marginBottom:8 }}>
            {data.participants} participant{data.participants > 1 ? "s" : ""} · {data.badge} avec le badge en vue ({LIGUE.badge.semainesMin} semaines complètes)
          </div>
          {passees.length > 0 && passees.map(s => (
            <div key={s.semaine} style={ligne}>
              <span>S{s.semaine} · {s.theme}</span>
              <span>🎯 {s.defis} · 🧠 {s.quiz}{s.bonnes != null ? ` (${String(s.bonnes).replace(".", ",")}/3)` : ""}</span>
            </div>
          ))}
          {data.premiers.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:"#81c784", textTransform:"uppercase", letterSpacing:1, margin:"12px 0 4px" }}>
                Les plus assidus · {data.exAequo > 1 ? `${data.exAequo} ex aequo à ${data.max} pts : tirage au sort` : `${data.max} pts au maximum`}
              </div>
              {data.premiers.map((p, i) => (
                <div key={p.email || i} style={ligne}>
                  <span>{p.prenom || "—"} · {p.email}</span>
                  <span>{p.points} pts · {p.completes} sem. · {p.bonnes} bonnes rép.</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
