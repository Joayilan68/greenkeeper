// src/components/LigueHiver.jsx
// Ligue d'hiver (src/lib/ligueHiver.js) : écran de la page Classement, ouverte par l'onglet « Quiz » de novembre à janvier
// (défi et quiz de la semaine, progression, dotation, semaines passées), carte de « Aujourd'hui » et annonce du départ les
// 7 jours avant.
// GreenPoints à la première validation ; badge « Gardien de l'hiver » enregistré dans le profil à 10 semaines complètes.
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { card, cardTitle, scroll } from "../lib/styles";
import { LIGUE, periodeLigue, datesSemaine, dateLongue } from "../lib/ligueHiver";
import { useLigueHiver } from "../lib/useLigueHiver";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useProfile } from "../lib/useProfile";
import { carteQuiz } from "../lib/cartesPartage";
import { trackFunnel } from "../lib/funnel";
import { useMonCode } from "../lib/useMonCode";

const clair = "#F1F8F2", vert = "#a5d6a7", doux = "#81c784";
const plein = { border:"none", borderRadius:12, padding:"11px 16px", fontSize:13, fontWeight:800, cursor:"pointer",
  background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff" };
const leger = { border:"1px solid rgba(165,214,167,0.3)", borderRadius:12, padding:"10px 14px", fontSize:13, fontWeight:700, cursor:"pointer",
  background:"rgba(255,255,255,0.06)", color:"#e8f5e9", textDecoration:"none", display:"inline-block" };
const givre = { ...card(), background:"linear-gradient(135deg,rgba(100,181,246,0.14),rgba(13,43,26,0.55))", border:"1px solid rgba(144,202,249,0.3)" };
const article = (slug) => `/conseils/${slug}`;
const semaineDu = (n) => { const { debut, fin } = datesSemaine(n); return `du ${dateLongue(debut)} au ${dateLongue(fin)}`; };

// Partage du quiz ou de son résultat (Partager du téléphone, avec l'image du résultat quand le téléphone sait la partager ;
// sinon lien copié) : message à afficher, ou null si annulé ou impossible
// Avec le code de parrainage : l'ami qui s'inscrit par ce lien a 1 mois de Premium offert
async function partagerQuiz({ texte = LIGUE.partage.texte, image = null, code = null } = {}) {
  const url = code ? `${LIGUE.partage.url}&p=${code}` : LIGUE.partage.url;
  if (code) texte = `${texte} 🎁 Avec mon code ${code}, 1 mois de Premium offert.`;
  if (navigator.share) {
    try {
      await navigator.share(image ? { files: [image], text: `${texte} ${url}` } : { title: "Quiz gazon Mongazon360", text: texte, url });
      return "Merci pour le partage !";
    } catch (e) { if (e?.name === "AbortError") return null; }
  }
  try { await navigator.clipboard.writeText(`${texte} ${url}`); return "Lien copié : colle-le dans un message."; }
  catch { return null; }
}

export function AnnonceLigue({ debut }) {
  return (
    <div style={givre}>
      <div style={{ fontSize:15, fontWeight:800, color:clair, marginBottom:6 }}>❄️ La Ligue d'hiver démarre le dimanche {dateLongue(debut)}</div>
      <div style={{ fontSize:12.5, color:vert, lineHeight:1.55 }}>
        Chaque semaine jusqu'à fin janvier : un défi d'hiver pour ta pelouse et un quiz de 3 questions en {duree}. Des GreenPoints à chaque
        fois, un badge pour les plus réguliers, et {LIGUE.dotation} pour le plus assidu.
      </div>
    </div>
  );
}

// Correction : la réponse donnée (juste ou fausse) est pleine et marquée « ta réponse » ; la bonne réponse non donnée est
// seulement entourée, marquée « bonne réponse » ; une question sans réponse le dit
function Question({ q, i, choisi, corrige, onChoix }) {
  const sansReponse = corrige && !Number.isInteger(choisi);
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:13.5, fontWeight:800, color:clair, marginBottom:8, lineHeight:1.4 }}>{i + 1}. {q.q}</div>
      {sansReponse && <div style={{ fontSize:12, fontWeight:700, color:"#ffb74d", marginBottom:6 }}>⏱️ Pas de réponse : question comptée fausse</div>}
      <div style={{ display:"grid", gap:6 }}>
        {q.choix.map((c, k) => {
          const bonne = corrige && k === q.bonne, aMoi = corrige && k === choisi;
          const juste = bonne && aMoi, fausse = aMoi && !bonne, rappel = bonne && !aMoi, actif = !corrige && choisi === k;
          return (
            <button key={k} onClick={() => !corrige && onChoix(k)} aria-pressed={choisi === k} disabled={corrige}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, textAlign:"left", borderRadius:10,
                padding:"9px 12px", fontSize:13, cursor: corrige ? "default" : "pointer",
                border: `1px ${rappel ? "dashed" : "solid"} ${juste || rappel ? "rgba(102,187,106,0.7)" : fausse ? "rgba(239,83,80,0.6)" : actif ? "#66bb6a" : "rgba(165,214,167,0.25)"}`,
                background: juste ? "rgba(67,160,71,0.25)" : fausse ? "rgba(239,83,80,0.15)" : actif ? "rgba(67,160,71,0.3)" : "rgba(255,255,255,0.04)",
                color: juste || actif ? clair : fausse ? "#ef9a9a" : vert, fontWeight: juste || actif ? 700 : rappel ? 600 : 500 }}>
              <span>{juste || rappel ? "✅ " : fausse ? "❌ " : ""}{c}</span>
              {(aMoi || rappel) && <span style={{ fontSize:10.5, fontWeight:700, flexShrink:0, opacity:0.9 }}>{aMoi ? "ta réponse" : "bonne réponse"}</span>}
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
  const parrain = useMonCode(!fait && !!d.partage);
  const partager = async () => { const info = await partagerQuiz({ code: parrain?.code }); if (info) valider(info); };
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

// Quiz de la semaine : une seule tentative, LIGUE.dureeQuiz secondes pour les 3 questions à partir de « Commencer » (chrono
// tenu par le serveur, qui ne retient pas les réponses hors délai) ; à la fin du temps, les réponses données sont envoyées.
const duree = LIGUE.dureeQuiz % 60 ? `${LIGUE.dureeQuiz} secondes` : `${LIGUE.dureeQuiz / 60} minute${LIGUE.dureeQuiz > 60 ? "s" : ""}`;
const minSec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function CarteQuiz({ n, resultat, onDemarrer, onRepondre }) {
  const { theme, quiz } = LIGUE.programme[n - 1];
  const [choix, setChoix] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState("");
  const [reste, setReste] = useState(0);
  const [image, setImage] = useState(null); // image du résultat, si le téléphone sait partager une image
  const choixFaits = useRef([]), envoye = useRef(false);
  choixFaits.current = choix;
  const enCours = !!resultat && resultat.restant > 0;
  const corrige = !!resultat && !enCours;
  const complet = quiz.every((_, i) => Number.isInteger(choix[i]));
  const parrain = useMonCode(corrige);

  const demarrer = async () => {
    setEnvoi(true); setMsg("");
    try { await onDemarrer(); } catch (e) { setMsg(`⚠️ ${e.message}`); }
    finally { setEnvoi(false); }
  };
  const envoyer = async (finDuTemps = false) => {
    if (envoye.current) return;
    envoye.current = true; setEnvoi(true); setMsg("");
    const reponses = quiz.map((_, i) => (Number.isInteger(choixFaits.current[i]) ? choixFaits.current[i] : null));
    try { await onRepondre(reponses); if (finDuTemps) setMsg("⏱️ Temps écoulé : tes réponses ont été envoyées."); }
    catch (e) { envoye.current = false; setMsg(`⚠️ ${e.message}`); }
    finally { setEnvoi(false); }
  };
  // Compte à rebours sur le temps restant donné par le serveur (pas d'horloge du téléphone) ; envoi à 0
  useEffect(() => {
    if (!enCours) return undefined;
    const fin = Date.now() + resultat.restant * 1000;
    let minuteur = null;
    const tic = () => {
      const r = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      setReste(r);
      if (r === 0) { clearInterval(minuteur); envoyer(true); }
    };
    tic();
    minuteur = setInterval(tic, 250);
    return () => clearInterval(minuteur);
  }, [enCours]); // eslint-disable-line react-hooks/exhaustive-deps

  // Image du résultat préparée dès la correction : le partage doit partir aussitôt le bouton touché
  useEffect(() => {
    if (!corrige) return undefined;
    let actif = true;
    const fichier = (contenu) => new File([contenu], "quiz-gazon-mongazon360.jpg", { type: "image/jpeg" });
    if (typeof File === "undefined" || !navigator.canShare?.({ files: [fichier("")] })) return undefined;
    carteQuiz({ bonnes: resultat.bonnes, total: quiz.length, semaine: n, theme, duree, code: parrain?.code })
      .then(blob => { if (actif) setImage(fichier(blob)); }).catch(() => {});
    return () => { actif = false; };
  }, [corrige, parrain?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Partage du résultat (jamais des réponses : une seule tentative par semaine)
  const partager = async () => {
    trackFunnel("partage_quiz", { canal: image ? "image" : "texte", semaine: n, bonnes: resultat.bonnes });
    const texte = LIGUE.partage.resultat.replaceAll("{bonnes}", resultat.bonnes).replaceAll("{total}", quiz.length).replaceAll("{duree}", duree);
    const info = await partagerQuiz({ texte, image, code: parrain?.code });
    if (info) setMsg(info);
  };
  return (
    <div style={card()}>
      <div style={cardTitle}>
        <span>🧠 Quiz du dimanche · {theme}</span>
        {!enCours && <span style={{ color: corrige ? "#66bb6a" : "#f9a825" }}>{corrige ? `${resultat.bonnes}/${quiz.length}` : `+${LIGUE.points.quiz} pts`}</span>}
      </div>
      {enCours && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:800, color: reste <= 10 ? "#ef9a9a" : "#ffe082", marginBottom:5 }}>
            <span>⏱️ Temps restant</span><span>{minSec(reste)}</span>
          </div>
          <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(reste / LIGUE.dureeQuiz) * 100}%`, background: reste <= 10 ? "#ef5350" : "#66bb6a", transition:"width 0.25s linear" }} />
          </div>
        </div>
      )}
      {!resultat && (
        <>
          <div style={{ fontSize:12.5, color:vert, lineHeight:1.55, marginBottom:10 }}>
            3 questions, {duree} pour y répondre. Une seule tentative : le chrono démarre dès que tu commences, et le quiz
            compte même si tu ne vas pas au bout.
          </div>
          <button onClick={demarrer} disabled={envoi} style={{ ...plein, width:"100%" }}>{envoi ? "Chargement…" : "▶️ Commencer le quiz"}</button>
        </>
      )}
      {resultat && quiz.map((q, i) => (
        <Question key={i} q={q} i={i} corrige={corrige} choisi={corrige ? resultat.reponses[i] : choix[i]}
          onChoix={(k) => setChoix(c => { const x = [...c]; x[i] = k; return x; })} />
      ))}
      {enCours && (
        <button onClick={() => envoyer()} disabled={!complet || envoi} style={{ ...plein, width:"100%", opacity: complet ? 1 : 0.5 }}>
          {envoi ? "Envoi…" : complet ? "Valider mes réponses" : "Réponds aux 3 questions"}
        </button>
      )}
      {corrige && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ fontSize:12.5, color:vert }}>
            {!resultat.reponses.length ? "⏱️ Temps écoulé : aucune réponse envoyée."
              : resultat.bonnes === quiz.length ? "Sans faute, bravo !" : "Les bonnes réponses sont en vert."}
          </div>
          <button onClick={partager} style={leger}>📤 Partager mon résultat</button>
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
        Pour le participant le plus assidu de l'hiver : 1 point par défi et 1 point par quiz faits pendant leur semaine.
        Participation gratuite pour tous les comptes. En cas d'égalité, un compte Premium passe devant un compte gratuit,
        puis le compte le plus ancien.
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
  const { etat, erreur, faireDefi, demarrerQuiz, repondre } = useLigueHiver();
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
            <CarteQuiz key={n} n={n} resultat={semaine?.quiz} onDemarrer={() => demarrerQuiz(n)}
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

// Carte de « Aujourd'hui » : annonce, puis défi et quiz de la semaine (faits ou à faire), vers l'onglet Quiz
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
      {ligne("🧠", `Quiz : ${p.theme.toLowerCase()}`, s?.quiz && (s.quiz.restant > 0 ? "⏱️ en cours" : `✅ ${s.quiz.bonnes}/3`))}
    </div>
  );
}
