// src/components/LigueHiver.jsx
// Ligue d'hiver (src/lib/ligueHiver.js) : écran de l'onglet Classement de novembre à janvier (défi et quiz de la semaine,
// progression, dotation, semaines passées), carte de « Aujourd'hui » et annonce du départ les 7 jours avant.
// GreenPoints à la première validation ; badge « Gardien de l'hiver » enregistré dans le profil à 10 semaines complètes.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { card, cardTitle, scroll } from "../lib/styles";
import { LIGUE, periodeLigue, datesSemaine, dateLongue } from "../lib/ligueHiver";
import { useLigueHiver } from "../lib/useLigueHiver";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useProfile } from "../lib/useProfile";

const clair = "#F1F8F2", vert = "#a5d6a7", doux = "#81c784";
const plein = { border:"none", borderRadius:12, padding:"11px 16px", fontSize:13, fontWeight:800, cursor:"pointer",
  background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff" };
const leger = { border:"1px solid rgba(165,214,167,0.3)", borderRadius:12, padding:"10px 14px", fontSize:13, fontWeight:700, cursor:"pointer",
  background:"rgba(255,255,255,0.06)", color:"#e8f5e9", textDecoration:"none", display:"inline-block" };
const givre = { ...card(), background:"linear-gradient(135deg,rgba(100,181,246,0.14),rgba(13,43,26,0.55))", border:"1px solid rgba(144,202,249,0.3)" };
const article = (slug) => `/conseils/${slug}`;
const semaineDu = (n) => { const { debut, fin } = datesSemaine(n); return `du ${dateLongue(debut)} au ${dateLongue(fin)}`; };

// Partage du quiz (Partager du téléphone, sinon lien copié) : message à afficher, ou null si annulé ou impossible
async function partagerQuiz() {
  const { texte, url } = LIGUE.partage;
  if (navigator.share) {
    try { await navigator.share({ title: "Quiz gazon Mongazon360", text: texte, url }); return "Merci pour le partage !"; }
    catch (e) { if (e?.name === "AbortError") return null; }
  }
  try { await navigator.clipboard.writeText(`${texte} ${url}`); return "Lien copié : colle-le dans un message."; }
  catch { return null; }
}

export function AnnonceLigue({ debut }) {
  return (
    <div style={givre}>
      <div style={{ fontSize:15, fontWeight:800, color:clair, marginBottom:6 }}>❄️ La Ligue d'hiver démarre le dimanche {dateLongue(debut)}</div>
      <div style={{ fontSize:12.5, color:vert, lineHeight:1.55 }}>
        Chaque semaine jusqu'à fin janvier : un défi d'hiver pour ta pelouse et un quiz de 3 questions. Des GreenPoints à chaque
        fois, un badge pour les plus réguliers, et {LIGUE.dotation} pour le plus assidu.
      </div>
    </div>
  );
}

function Question({ q, i, choisi, corrige, onChoix }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:13.5, fontWeight:800, color:clair, marginBottom:8, lineHeight:1.4 }}>{i + 1}. {q.q}</div>
      <div style={{ display:"grid", gap:6 }}>
        {q.choix.map((c, k) => {
          const bonne = corrige && k === q.bonne, fausse = corrige && k === choisi && k !== q.bonne, actif = !corrige && choisi === k;
          return (
            <button key={k} onClick={() => !corrige && onChoix(k)} aria-pressed={choisi === k} disabled={corrige}
              style={{ textAlign:"left", borderRadius:10, padding:"9px 12px", fontSize:13, cursor: corrige ? "default" : "pointer",
                border: `1px solid ${bonne ? "rgba(102,187,106,0.7)" : fausse ? "rgba(239,83,80,0.6)" : actif ? "#66bb6a" : "rgba(165,214,167,0.25)"}`,
                background: bonne ? "rgba(67,160,71,0.25)" : fausse ? "rgba(239,83,80,0.15)" : actif ? "rgba(67,160,71,0.3)" : "rgba(255,255,255,0.04)",
                color: bonne || actif ? clair : fausse ? "#ef9a9a" : vert, fontWeight: bonne || actif ? 700 : 500 }}>
              {bonne ? "✅ " : fausse ? "❌ " : ""}{c}
            </button>
          );
        })}
      </div>
      {corrige && (
        <div style={{ fontSize:12, color:vert, marginTop:6, lineHeight:1.5 }}>
          {q.explication} <a href={article(q.article)} style={{ color:"#90caf9" }}>Lire l'article</a>
        </div>
      )}
    </div>
  );
}

function CarteDefi({ n, fait, onFait }) {
  const navigate = useNavigate();
  const d = LIGUE.programme[n - 1].defi;
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState("");
  const valider = async (info = "") => {
    setEnvoi(true); setMsg("");
    try { await onFait(); if (info) setMsg(info); } catch (e) { setMsg(`⚠️ ${e.message}`); }
    finally { setEnvoi(false); }
  };
  const partager = async () => { const info = await partagerQuiz(); if (info) valider(info); };
  return (
    <div style={card()}>
      <div style={cardTitle}><span>🎯 Défi de la semaine</span><span style={{ color: fait ? "#66bb6a" : "#f9a825" }}>{fait ? "✅ Fait" : `+${LIGUE.points.defi} pts`}</span></div>
      <div style={{ fontSize:15, fontWeight:800, color:clair, marginBottom:6 }}>{d.titre}</div>
      <div style={{ fontSize:13, color:vert, lineHeight:1.55, marginBottom:12 }}>{d.texte}</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {d.article && <a href={article(d.article)} style={leger}>📖 Lire l'article</a>}
        {d.lien && <button onClick={() => navigate(d.lien)} style={leger}>Ouvrir</button>}
        {!fait && (d.partage
          ? <button onClick={partager} disabled={envoi} style={plein}>📤 Partager le quiz</button>
          : <button onClick={() => valider()} disabled={envoi} style={plein}>{envoi ? "Envoi…" : "C'est fait ✓"}</button>)}
      </div>
      {msg && <div style={{ fontSize:12, color: msg.startsWith("⚠️") ? "#ef9a9a" : vert, marginTop:8 }}>{msg}</div>}
    </div>
  );
}

function CarteQuiz({ n, resultat, onRepondre }) {
  const { theme, quiz } = LIGUE.programme[n - 1];
  const [choix, setChoix] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState("");
  const complet = quiz.every((_, i) => Number.isInteger(choix[i]));
  const envoyer = async () => {
    setEnvoi(true); setMsg("");
    try { await onRepondre(choix); } catch (e) { setMsg(`⚠️ ${e.message}`); }
    finally { setEnvoi(false); }
  };
  const partager = async () => { const info = await partagerQuiz(); if (info) setMsg(info); };
  return (
    <div style={card()}>
      <div style={cardTitle}>
        <span>🧠 Quiz du dimanche · {theme}</span>
        <span style={{ color: resultat ? "#66bb6a" : "#f9a825" }}>{resultat ? `${resultat.bonnes}/${quiz.length}` : `+${LIGUE.points.quiz} pts`}</span>
      </div>
      {quiz.map((q, i) => (
        <Question key={i} q={q} i={i} corrige={!!resultat} choisi={resultat ? resultat.reponses[i] : choix[i]}
          onChoix={(k) => setChoix(c => { const x = [...c]; x[i] = k; return x; })} />
      ))}
      {!resultat && (
        <button onClick={envoyer} disabled={!complet || envoi} style={{ ...plein, width:"100%", opacity: complet ? 1 : 0.5 }}>
          {envoi ? "Envoi…" : complet ? "Valider mes réponses" : "Réponds aux 3 questions"}
        </button>
      )}
      {resultat && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ fontSize:12.5, color:vert }}>{resultat.bonnes === quiz.length ? "Sans faute, bravo !" : "Les bonnes réponses sont en vert."}</div>
          <button onClick={partager} style={leger}>📤 Partager le quiz</button>
        </div>
      )}
      {msg && <div style={{ fontSize:12, color: msg.startsWith("⚠️") ? "#ef9a9a" : vert, marginTop:8 }}>{msg}</div>}
    </div>
  );
}

function Progression({ etat, derniere }) {
  const parSemaine = Object.fromEntries(etat.semaines.map(s => [s.semaine, s]));
  const pastille = (k) => {
    const s = parSemaine[k];
    if (s?.defi && s?.quiz) return { background:"#43a047", color:"#fff", border:"1px solid #43a047" };
    if (s?.defi || s?.quiz) return { background:"rgba(249,168,37,0.25)", color:"#ffe082", border:"1px solid rgba(249,168,37,0.5)" };
    if (k <= derniere) return { background:"rgba(255,255,255,0.06)", color:"#4a7c5c", border:"1px solid rgba(255,255,255,0.08)" };
    return { background:"transparent", color:doux, border:"1px dashed rgba(165,214,167,0.3)" };
  };
  const debloque = etat.completes >= LIGUE.badge.semainesMin;
  return (
    <div style={card()}>
      <div style={cardTitle}><span>📈 Ta ligue d'hiver</span><span>{etat.points}/{LIGUE.semaines * 2} pts d'assiduité</span></div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
        {Array.from({ length: LIGUE.semaines }, (_, i) => (
          <div key={i} title={`Semaine ${i + 1}`} style={{ width:26, height:26, borderRadius:8, fontSize:11, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center", ...pastille(i + 1) }}>{i + 1}</div>
        ))}
      </div>
      <div style={{ fontSize:12.5, color:vert, lineHeight:1.55 }}>
        {etat.completes} semaine{etat.completes > 1 ? "s" : ""} complète{etat.completes > 1 ? "s" : ""} (défi et quiz) sur {LIGUE.semaines}.{" "}
        {debloque ? `Badge « ❄️ Gardien de l'hiver ${LIGUE.saison} » débloqué !`
          : `Badge « ❄️ Gardien de l'hiver ${LIGUE.saison} » à ${LIGUE.badge.semainesMin} semaines complètes.`}
      </div>
    </div>
  );
}

function Dotation() {
  const navigate = useNavigate();
  return (
    <div style={{ ...card(), background:"linear-gradient(135deg,rgba(249,168,37,0.14),rgba(13,43,26,0.5))", border:"1px solid rgba(249,168,37,0.35)" }}>
      <div style={{ fontSize:15, fontWeight:800, color:"#ffe082", marginBottom:6 }}>🏆 À gagner : {LIGUE.dotation}</div>
      <div style={{ fontSize:12.5, color:vert, lineHeight:1.55, marginBottom:8 }}>
        Pour le participant le plus assidu de l'hiver : 1 point par défi et 1 point par quiz faits pendant leur semaine. En cas
        d'égalité, tirage au sort. Gratuit, sans obligation d'achat.
      </div>
      <button onClick={() => navigate("/cgu")} style={{ background:"none", border:"none", padding:0, color:"#90caf9", fontSize:12, textDecoration:"underline", cursor:"pointer" }}>
        Lire le règlement (CGU, article 6 g)
      </button>
    </div>
  );
}

function SemainesPassees({ etat, jusqua }) {
  const [ouverte, setOuverte] = useState(null);
  const parSemaine = Object.fromEntries(etat.semaines.map(s => [s.semaine, s]));
  const liste = Array.from({ length: jusqua }, (_, i) => jusqua - i);
  return (
    <div style={card()}>
      <div style={cardTitle}><span>🗓️ Semaines passées</span></div>
      {liste.map(k => {
        const s = parSemaine[k], p = LIGUE.programme[k - 1];
        return (
          <div key={k} style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"8px 0" }}>
            <button onClick={() => setOuverte(ouverte === k ? null : k)} aria-expanded={ouverte === k}
              style={{ width:"100%", background:"none", border:"none", padding:0, cursor:"pointer", display:"flex", justifyContent:"space-between", gap:8, color:clair, textAlign:"left" }}>
              <span style={{ fontSize:13, fontWeight:700 }}>S{k} · {p.theme}</span>
              <span style={{ fontSize:12, color:vert, flexShrink:0 }}>🎯 {s?.defi ? "✅" : "—"} · 🧠 {s?.quiz ? `${s.quiz.bonnes}/3` : "—"} {ouverte === k ? "▴" : "▾"}</span>
            </button>
            {ouverte === k && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:12, color:doux, marginBottom:8 }}>{semaineDu(k)} · défi : {p.defi.titre}</div>
                {p.quiz.map((q, i) => <Question key={i} q={q} i={i} corrige choisi={s?.quiz?.reponses?.[i]} onChoix={() => {}} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LigueHiver() {
  const periode = periodeLigue();
  const { etat, erreur, faireDefi, repondre } = useLigueHiver();
  const { gagnerPoints } = useGreenPoints();
  const { profile, saveProfile } = useProfile();
  const statut = periode?.statut;
  const n = etat?.semaine || periode?.semaine;

  // Badge saisonnier, une fois atteint le nombre de semaines complètes du règlement
  useEffect(() => {
    if (!etat || !profile || etat.completes < LIGUE.badge.semainesMin) return;
    const badges = (profile.badges && typeof profile.badges === "object" && !Array.isArray(profile.badges)) ? profile.badges : {};
    if (!badges[LIGUE.badge.id]) saveProfile({ ...profile, badges: { ...badges, [LIGUE.badge.id]: { at: new Date().toISOString() } } });
  }, [etat?.completes, profile?.user_id]); // eslint-disable-line

  const semaine = etat?.semaines.find(s => s.semaine === n);
  const titre = statut === "en_cours" ? `Semaine ${n} sur ${LIGUE.semaines}` : statut === "annonce" ? "Bientôt le départ" : "Ligue terminée";
  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ fontSize:11, color:doux, letterSpacing:2, textTransform:"uppercase" }}>❄️ Ligue d'hiver {LIGUE.saison}</div>
        <div style={{ fontSize:20, fontWeight:800, color:clair, marginTop:4 }}>{titre}</div>
        {statut === "en_cours" && <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>{semaineDu(n)}</div>}
      </div>
      <div style={scroll}>
        {erreur && <div style={{ ...card(), color:"#ef9a9a", fontSize:13 }}>⚠️ {erreur}</div>}
        {!etat && !erreur && statut !== "annonce" && <div style={{ textAlign:"center", color:doux, fontSize:12, padding:12 }}>🔄 Chargement de la ligue…</div>}
        {statut === "annonce" && <AnnonceLigue debut={periode.debut} />}
        {statut === "en_cours" && etat && (
          <>
            <CarteDefi n={n} fait={!!semaine?.defi}
              onFait={async () => { const avant = !!semaine?.defi; await faireDefi(n); if (!avant) gagnerPoints("defi_hiver"); }} />
            <CarteQuiz key={n} n={n} resultat={semaine?.quiz}
              onRepondre={async (reponses) => { await repondre(n, reponses); gagnerPoints("quiz_hiver"); }} />
          </>
        )}
        {statut === "terminee" && (
          <div style={givre}>
            <div style={{ fontSize:15, fontWeight:800, color:clair, marginBottom:6 }}>❄️ La Ligue d'hiver est terminée</div>
            <div style={{ fontSize:12.5, color:vert, lineHeight:1.55 }}>
              Merci d'avoir joué ! Le gagnant est prévenu par email au plus tard le 10 février. Le classement reprend le 1er février.
            </div>
          </div>
        )}
        {etat && <Progression etat={etat} derniere={statut === "terminee" ? LIGUE.semaines : (n || 1) - 1} />}
        <Dotation />
        {etat && (statut === "terminee" || n > 1) && <SemainesPassees etat={etat} jusqua={statut === "terminee" ? LIGUE.semaines : n - 1} />}
      </div>
    </div>
  );
}

// Carte de « Aujourd'hui » : annonce, puis défi et quiz de la semaine (faits ou à faire), vers l'onglet Classement
export function CarteLigueHiver() {
  const navigate = useNavigate();
  const periode = periodeLigue();
  const { etat } = useLigueHiver();
  if (!periode || periode.statut === "terminee") return null;
  if (periode.statut === "annonce") return <AnnonceLigue debut={periode.debut} />;
  const n = periode.semaine, p = LIGUE.programme[n - 1], s = etat?.semaines.find(x => x.semaine === n);
  const ligne = (icone, texte, fait) => (
    <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:13, color:vert, padding:"3px 0" }}>
      <span>{icone} {texte}</span><span style={{ flexShrink:0, color: fait ? "#66bb6a" : "#f9a825", fontWeight:700 }}>{fait || "à faire"}</span>
    </div>
  );
  return (
    <div data-tuile="aujourdhui-ligue-hiver" role="button" onClick={() => navigate("/classement")} style={{ ...givre, cursor:"pointer" }}>
      <div style={cardTitle}><span>❄️ Ligue d'hiver · semaine {n}/{LIGUE.semaines}</span><span>→</span></div>
      {ligne("🎯", p.defi.titre, s?.defi && "✅ fait")}
      {ligne("🧠", `Quiz : ${p.theme.toLowerCase()}`, s?.quiz && `✅ ${s.quiz.bonnes}/3`)}
    </div>
  );
}
