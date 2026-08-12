// src/pages/Parcours.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN D'ENTRÉE DU PARCOURS (Création / Regarnissage) — états A + B
//   A : création (type + infos pré-remplies du profil + date souhaitée)
//   B : verdict de fenêtre (canSow) dans UN pop-up atomique
//       → feu_vert : Confirmer le démarrage
//       → avertissement : Lancer quand même (laissez-passer) / Annuler
//       → bloque : Me prévenir à la prochaine fenêtre (en_attente_fenetre) / Annuler
// Rien n'est écrit en base tant que l'utilisateur n'a pas confirmé dans le pop-up.
// Le suivi d'un parcours actif (états C+D) sera ajouté ensuite.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useParcours } from "../lib/useParcours";
import { useGreenPoints } from "../lib/useGreenPoints";
import { appShell, btn } from "../lib/styles";

const VERT = "#43a047";

export default function Parcours() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { profile } = useProfile();
  const { parcours, aUnParcoursActif, analyserFenetre, analyserPhase, creerParcours, demarrerParcours, validerJalon, loading, reload } = useParcours();

  // Type initial depuis l'URL (?type=creation|regarnissage) posé par les boutons de Mon Gazon
  const typeInitial = params.get("type") === "regarnissage" ? "regarnissage" : "creation";

  const [type, setType]           = useState(typeInitial);
  const [surface, setSurface]     = useState(profile?.surface || "");
  const [typeGazon, setTypeGazon] = useState(profile?.pelouse || profile?.gazons?.[0] || "");
  const [quand, setQuand]         = useState("asap");      // "asap" | "date"
  const [dateChoisie, setDate]    = useState("");
  const [busy, setBusy]           = useState(false);
  const [popup, setPopup]         = useState(null);        // { verdict, remplacement? } | null
  const [erreur, setErreur]       = useState(null);

  useEffect(() => {
    if (profile?.surface && !surface) setSurface(profile.surface);
    if (!typeGazon && (profile?.pelouse || profile?.gazons?.[0])) {
      setTypeGazon(profile.pelouse || profile.gazons[0]);
    }
  }, [profile]); // eslint-disable-line

  const dateSemis = quand === "date" && dateChoisie ? dateChoisie : new Date().toISOString().slice(0, 10);

  // ── Étape 1 : analyser la fenêtre puis ouvrir le pop-up ────────────────────
  const lancerAnalyse = async () => {
    setErreur(null);
    setBusy(true);
    try {
      const verdict = await analyserFenetre({
        lat: profile?.lat,
        lon: profile?.lon,
        soilTempSource: "estime", // sol réel = Premium ; ici estimation saisonnière
        month: new Date().getMonth() + 1,
        dateSemis,
      });
      setPopup({ verdict, remplacement: aUnParcoursActif });
    } catch (e) {
      setErreur(e.message || "Analyse impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  // ── Étape 2 : confirmer (dans le pop-up) → écrit en base ───────────────────
  const confirmer = async (statut) => {
    setBusy(true);
    setErreur(null);
    try {
      await creerParcours({
        type,
        surface_m2: surface ? Number(surface) : null,
        type_gazon: typeGazon || null,
        date_prevue: quand === "date" && dateChoisie ? dateChoisie : null,
        date_semis: statut === "actif" ? dateSemis : null,
        statut,
      });
      setPopup(null);
      navigate("/my-lawn"); // retour à Mon Gazon ; le suivi (C+D) s'affichera ensuite
    } catch (e) {
      setErreur(e.message || "Impossible de créer le parcours.");
    } finally {
      setBusy(false);
    }
  };

  const labelType = type === "creation" ? "Création" : "Regarnissage";

  // ── AIGUILLAGE selon l'état du parcours ────────────────────────────────────
  // Parcours actif → écran de suivi C+D (phase, action, timeline, jalons).
  if (parcours && parcours.statut === "actif") {
    return (
      <SuiviParcours
        parcours={parcours}
        analyserPhase={analyserPhase}
        validerJalon={validerJalon}
        onRetour={() => navigate("/my-lawn")}
      />
    );
  }

  // Parcours en attente → écran dédié (bouton Démarrer si fenêtre ouverte, sinon surveillance)
  if (parcours && parcours.statut === "en_attente_fenetre") {
    return (
      <EnAttenteParcours
        parcours={parcours}
        profile={profile}
        analyserFenetre={analyserFenetre}
        demarrerParcours={demarrerParcours}
        onRetour={() => navigate("/my-lawn")}
        onReload={reload}
      />
    );
  }

  // Aucun parcours actif → écran de création (états A + B ci-dessous)
  return (
    <div style={{ ...appShell, fontFamily: "'Nunito','Segoe UI',sans-serif", paddingBottom: 100 }}>
      <div style={{ padding: "48px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{type === "creation" ? "🌱" : "🌾"}</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F8F2" }}>
              Lancer un {type === "creation" ? "semis" : "regarnissage"}
            </div>
            <div style={{ fontSize: 12, color: "#66BB6A", marginTop: 2 }}>
              {type === "creation" ? "Créer une nouvelle pelouse (~60 jours)" : "Densifier une pelouse existante (~60 jours)"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Choix du type */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[["creation", "🌱 Création"], ["regarnissage", "🌾 Regarnissage"]].map(([v, lab]) => (
            <button key={v} onClick={() => setType(v)}
              style={{
                flex: 1, padding: "14px 8px", borderRadius: 14, cursor: "pointer", fontWeight: 700, fontSize: 14,
                fontFamily: "inherit",
                background: type === v ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${type === v ? VERT : "rgba(255,255,255,0.1)"}`,
                color: "#e8f5e9",
              }}>
              {lab}
            </button>
          ))}
        </div>

        {/* Infos pré-remplies du profil */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, border: "1px solid rgba(165,214,167,0.15)", padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#81c784", marginBottom: 14, fontWeight: 700 }}>
            Vos informations (modifiables)
          </div>

          <label style={{ display: "block", fontSize: 12, color: "#a5d6a7", marginBottom: 6 }}>Surface (m²)</label>
          <input type="number" min={1} value={surface} onChange={e => setSurface(e.target.value)}
            placeholder="Ex : 120"
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(165,214,167,0.3)", borderRadius: 12, padding: "12px 14px", color: "#e8f5e9", fontSize: 15, fontWeight: 600, outline: "none", fontFamily: "inherit", marginBottom: 14 }} />

          <label style={{ display: "block", fontSize: 12, color: "#a5d6a7", marginBottom: 6 }}>Type de gazon souhaité</label>
          <input type="text" value={typeGazon} onChange={e => setTypeGazon(e.target.value)}
            placeholder="Ex : universel, sport, ombre..."
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(165,214,167,0.3)", borderRadius: 12, padding: "12px 14px", color: "#e8f5e9", fontSize: 15, fontWeight: 600, outline: "none", fontFamily: "inherit", marginBottom: 14 }} />

          <label style={{ display: "block", fontSize: 12, color: "#a5d6a7", marginBottom: 6 }}>Quand souhaitez-vous semer ?</label>
          <div style={{ display: "flex", gap: 8, marginBottom: quand === "date" ? 12 : 0 }}>
            {[["asap", "Dès que possible"], ["date", "À une date précise"]].map(([v, lab]) => (
              <button key={v} onClick={() => setQuand(v)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 12,
                  fontFamily: "inherit",
                  background: quand === v ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${quand === v ? VERT : "rgba(255,255,255,0.1)"}`,
                  color: "#e8f5e9",
                }}>
                {lab}
              </button>
            ))}
          </div>
          {quand === "date" && (
            <input type="date" value={dateChoisie} onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(165,214,167,0.3)", borderRadius: 12, padding: "12px 14px", color: "#e8f5e9", fontSize: 15, fontWeight: 600, outline: "none", fontFamily: "inherit" }} />
          )}
        </div>

        {/* Info localisation manquante */}
        {(!profile?.lat || !profile?.lon) && (
          <div style={{ background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.35)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#ffe082" }}>
            📍 Renseignez votre localisation dans votre profil pour une analyse de fenêtre précise selon votre zone.
          </div>
        )}

        {erreur && (
          <div style={{ background: "rgba(198,40,40,0.15)", border: "1px solid rgba(198,40,40,0.4)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#ef9a9a" }}>
            {erreur}
          </div>
        )}

        {/* Bouton principal */}
        <button onClick={lancerAnalyse} disabled={busy || loading}
          style={{ ...btn.primary, width: "100%", opacity: (busy || loading) ? 0.6 : 1 }}>
          {busy ? "Analyse en cours…" : "Vérifier ma fenêtre de semis"}
        </button>

        <button onClick={() => navigate("/my-lawn")}
          style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: "#4a7c5c", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Annuler
        </button>
      </div>

      {/* ── POP-UP ATOMIQUE (verdict + confirmation) ─────────────────────────── */}
      {popup && (
        <PopupVerdict
          popup={popup}
          labelType={labelType}
          busy={busy}
          onClose={() => setPopup(null)}
          onConfirmer={confirmer}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pop-up unique : affiche le verdict et les boutons adaptés.
// ─────────────────────────────────────────────────────────────────────────────
function PopupVerdict({ popup, labelType, busy, onClose, onConfirmer }) {
  const { verdict, remplacement } = popup;
  const v = verdict?.verdict; // "feu_vert" | "avertissement" | "bloque"

  const couleur = v === "feu_vert" ? VERT : v === "avertissement" ? "#f9a825" : "#c62828";
  const titre = v === "feu_vert" ? "✅ C'est le moment"
    : v === "avertissement" ? "⚠️ Fenêtre non optimale"
    : "🔴 Semis déconseillé maintenant";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: "#14241a", borderRadius: "24px 24px 0 0", border: "1px solid rgba(165,214,167,0.2)", padding: 22, boxSizing: "border-box" }}>

        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 18px" }} />

        <div style={{ fontSize: 18, fontWeight: 800, color: couleur, marginBottom: 8 }}>{titre}</div>

        {/* Avertissement de remplacement (si un parcours est déjà actif) */}
        {remplacement && (
          <div style={{ background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.35)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: "#ffe082" }}>
            ⚠️ Un programme est déjà en cours. Le démarrer maintenant l'archivera : vous perdrez la progression du programme actuel.
          </div>
        )}

        <div style={{ fontSize: 14, color: "#d7ebd9", lineHeight: 1.5, marginBottom: verdict?.prochaineFenetre ? 10 : 18 }}>
          {verdict?.raison}
        </div>

        {verdict?.prochaineFenetre && (
          <div style={{ fontSize: 13, color: "#a5d6a7", marginBottom: 18 }}>
            🗓️ Prochaine fenêtre favorable : {verdict.prochaineFenetre}.
          </div>
        )}

        {/* Boutons adaptés au verdict */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {v === "feu_vert" && (
            <button onClick={() => onConfirmer("actif")} disabled={busy}
              style={{ ...btn.primary, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Création…" : `Démarrer mon ${labelType.toLowerCase()}`}
            </button>
          )}

          {v === "avertissement" && (
            <button onClick={() => onConfirmer("actif")} disabled={busy}
              style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, fontFamily: "inherit", background: "#f9a825", color: "#1a1a1a", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Création…" : "Lancer quand même"}
            </button>
          )}

          {v === "bloque" && (
            <button onClick={() => onConfirmer("en_attente_fenetre")} disabled={busy}
              style={{ width: "100%", padding: "14px", borderRadius: 14, border: `1px solid ${VERT}`, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", background: "rgba(76,175,80,0.15)", color: "#a5d6a7", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Enregistrement…" : "Me prévenir dès que c'est le moment"}
            </button>
          )}

          <button onClick={onClose} disabled={busy}
            style={{ ...btn.ghost, width: "100%", fontSize: 13 }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EN ATTENTE — parcours en_attente_fenetre : bouton Démarrer si fenêtre ouverte,
// sinon message de surveillance.
// ─────────────────────────────────────────────────────────────────────────────
function EnAttenteParcours({ parcours, profile, analyserFenetre, demarrerParcours, onRetour, onReload }) {
  const [verdict, setVerdict] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const v = await analyserFenetre({
          lat: profile?.lat, lon: profile?.lon,
          soilTempSource: "estime",
          month: new Date().getMonth() + 1,
          dateSemis: new Date().toISOString().slice(0, 10),
        });
        if (!annule) setVerdict(v);
      } catch (e) { if (!annule) setErreur(e.message); }
    })();
    return () => { annule = true; };
  }, []); // eslint-disable-line

  const fenetreOuverte = verdict && (verdict.verdict === "feu_vert" || verdict.verdict === "avertissement");
  const typeLabel = parcours.type === "regarnissage" ? "regarnissage" : "semis";

  const demarrer = async () => {
    setBusy(true); setErreur(null);
    try { await demarrerParcours(); }
    catch (e) { setErreur(e.message || "Impossible de démarrer."); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ ...appShell, fontFamily: "'Nunito','Segoe UI',sans-serif", paddingBottom: 100 }}>
      <div style={{ padding: "48px 20px 16px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F8F2" }}>Mon projet de {typeLabel}</div>
      </div>
      <div style={{ padding: "0 16px" }}>
        {!verdict && !erreur && (
          <div style={{ textAlign: "center", color: "#81c784", padding: 24 }}>Analyse de votre fenêtre…</div>
        )}

        {fenetreOuverte && (
          <div style={{ background: "linear-gradient(135deg,rgba(76,175,80,0.25),rgba(15,47,31,0.6))", border: "1px solid rgba(102,187,106,0.4)", borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#a5d6a7", marginBottom: 8 }}>🌱 C'est le moment !</div>
            <div style={{ fontSize: 14, color: "#d7ebd9", lineHeight: 1.5, marginBottom: 16 }}>
              La fenêtre de {typeLabel} est ouverte dans votre zone. Quand vous avez semé, démarrez votre parcours pour suivre les 6 phases jour par jour.
            </div>
            <button onClick={demarrer} disabled={busy}
              style={{ ...btn.primary, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Démarrage…" : "Démarrer mon parcours"}
            </button>
          </div>
        )}

        {verdict && !fenetreOuverte && (
          <div style={{ background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.35)", borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#ffe082", marginBottom: 8 }}>⏳ On surveille votre fenêtre</div>
            <div style={{ fontSize: 14, color: "#d7ebd9", lineHeight: 1.5 }}>
              {verdict.raison}
            </div>
            {verdict.prochaineFenetre && (
              <div style={{ fontSize: 13, color: "#a5d6a7", marginTop: 10 }}>
                🗓️ {verdict.prochaineFenetre}. Vous serez prévenu dès l'ouverture.
              </div>
            )}
          </div>
        )}

        {erreur && (
          <div style={{ background: "rgba(198,40,40,0.15)", border: "1px solid rgba(198,40,40,0.4)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#ef9a9a" }}>{erreur}</div>
        )}

        <button onClick={onRetour}
          style={{ marginTop: 8, width: "100%", background: "none", border: "none", color: "#4a7c5c", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Retour
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUIVI (C+D) — parcours actif : phase du jour, action, arrosage, timeline 6
// phases, blocages, et validation des jalons ponctuels.
// ─────────────────────────────────────────────────────────────────────────────
const PHASES_LABELS = [
  { n: 0, nom: "Fenêtre" },
  { n: 1, nom: "Préparation" },
  { n: 2, nom: "Semis" },
  { n: 3, nom: "Germination" },
  { n: 4, nom: "Levée" },
  { n: 5, nom: "Consolidation" },
];

// Jalons ponctuels (miroir de parcoursEngine.JALONS, côté front pour l'affichage)
const JALONS_FRONT = [
  { cle: "sol_prepare",    phaseMin: 1, label: "Sol préparé",                  icon: "🪓" },
  { cle: "seme",           phaseMin: 2, label: "Semé",                         icon: "🌱" },
  { cle: "premiere_tonte", phaseMin: 4, label: "Première tonte effectuée",      icon: "✂️" },
  { cle: "engrais_demarr", phaseMin: 5, label: "Engrais de démarrage appliqué", icon: "🧪" },
];

function SuiviParcours({ parcours, analyserPhase, validerJalon, onRetour }) {
  const { gagnerPoints } = useGreenPoints();
  const [etat, setEtat] = useState(null);   // { phase, nom, jour, action, arrosage, blocages, termine }
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [jalons, setJalons] = useState(() => {
    const ev = parcours.etapes_validees;
    return (ev && typeof ev === "object" && !Array.isArray(ev) && ev.jalons) ? ev.jalons : {};
  });

  // Clé GreenPoints pour un jalon donné (valeurs différenciées création/regarnissage).
  // Le plafond/cooldown du système GreenPoints gère l'anti-farming (pas de double compte).
  const cleGreenPoints = (cleJalon) => {
    const estRegarn = parcours.type === "regarnissage";
    switch (cleJalon) {
      case "sol_prepare":    return estRegarn ? "sol_prepare_regarn" : "sol_prepare_creation";
      case "seme":           return estRegarn ? "seme_regarn"        : "seme_creation";
      case "premiere_tonte": return "tonte";    // barème existant
      case "engrais_demarr": return "engrais";  // barème existant
      default:               return null;
    }
  };

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const s = await analyserPhase({ type: parcours.type, dateSemis: parcours.date_semis });
        if (!annule) setEtat(s);
      } catch (e) { if (!annule) setErreur(e.message); }
    })();
    return () => { annule = true; };
  }, []); // eslint-disable-line

  const toggleJalon = async (cle) => {
    setBusy(true); setErreur(null);
    const etaitCoche = !!jalons[cle]; // état AVANT le toggle
    try {
      const updated = await validerJalon(cle);
      const ev = updated?.etapes_validees;
      setJalons((ev && ev.jalons) ? ev.jalons : {});
      // Attribution de points UNIQUEMENT à la coche (pas à la décoche).
      // Le plafond/cooldown GreenPoints empêche le farming (coche/décoche répétés).
      if (!etaitCoche) {
        const gpKey = cleGreenPoints(cle);
        if (gpKey) gagnerPoints(gpKey);
      }
    } catch (e) { setErreur(e.message); }
    finally { setBusy(false); }
  };

  const typeLabel = parcours.type === "regarnissage" ? "regarnissage" : "semis";
  const phaseCourante = etat?.phase ?? parcours.phase_courante ?? 0;

  return (
    <div style={{ ...appShell, fontFamily: "'Nunito','Segoe UI',sans-serif", paddingBottom: 100 }}>
      <div style={{ padding: "48px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{parcours.type === "creation" ? "🌱" : "🌾"}</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F8F2" }}>Mon {typeLabel}</div>
            {etat && !etat.termine && (
              <div style={{ fontSize: 12, color: "#66BB6A", marginTop: 2 }}>
                {etat.nom} · Jour {etat.jour}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {!etat && !erreur && (
          <div style={{ textAlign: "center", color: "#81c784", padding: 24 }}>Chargement de votre parcours…</div>
        )}

        {/* ── Parcours terminé ── */}
        {etat?.termine && (
          <div style={{ background: "linear-gradient(135deg,rgba(76,175,80,0.25),rgba(15,47,31,0.6))", border: "1px solid rgba(102,187,106,0.4)", borderRadius: 20, padding: 24, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#a5d6a7", marginBottom: 6 }}>Parcours terminé !</div>
            <div style={{ fontSize: 14, color: "#d7ebd9", lineHeight: 1.5 }}>{etat.action}</div>
          </div>
        )}

        {/* ── Timeline des 6 phases ── */}
        {etat && !etat.termine && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 20, border: "1px solid rgba(165,214,167,0.15)", padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#81c784", fontWeight: 700, marginBottom: 14 }}>Progression</div>
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              {PHASES_LABELS.map((p) => {
                const passee = p.n < phaseCourante;
                const courante = p.n === phaseCourante;
                return (
                  <div key={p.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, zIndex: 1 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, marginBottom: 6,
                      background: courante ? "#43a047" : passee ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.08)",
                      border: courante ? "2px solid #a5d6a7" : "1px solid rgba(255,255,255,0.15)",
                      color: courante || passee ? "#fff" : "#4a7c5c",
                    }}>
                      {passee ? "✓" : p.n}
                    </div>
                    <div style={{ fontSize: 8.5, color: courante ? "#a5d6a7" : "#4a7c5c", textAlign: "center", lineHeight: 1.2 }}>{p.nom}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Action + arrosage du jour ── */}
        {etat && !etat.termine && (
          <div style={{ background: "linear-gradient(135deg,rgba(27,94,32,0.4),rgba(13,43,26,0.6))", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#66BB6A", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>À FAIRE AUJOURD'HUI</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F8F2", lineHeight: 1.5, marginBottom: 12 }}>{etat.action}</div>
            {etat.arrosage && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(100,181,246,0.1)", border: "1px solid rgba(100,181,246,0.25)", borderRadius: 12, padding: "10px 12px" }}>
                <span style={{ fontSize: 18 }}>💧</span>
                <span style={{ fontSize: 13, color: "#a5d6a7" }}>{etat.arrosage}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Blocages actifs ── */}
        {etat && !etat.termine && etat.blocages && etat.blocages.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#4a7c5c", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>PAS ENCORE LE MOMENT</div>
            {etat.blocages.map((b) => (
              <div key={b.action} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, opacity: 0.85 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#81c784", textTransform: "capitalize" }}>{b.action}</div>
                  <div style={{ fontSize: 11.5, color: "#6b9b7a", lineHeight: 1.4 }}>{b.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Jalons ponctuels (validation) ── */}
        {etat && !etat.termine && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 20, border: "1px solid rgba(165,214,167,0.15)", padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#81c784", fontWeight: 700, marginBottom: 4 }}>Mes étapes</div>
            <div style={{ fontSize: 11, color: "#4a7c5c", marginBottom: 14 }}>Cochez ce que vous avez fait — pour votre suivi.</div>
            {JALONS_FRONT.map((j) => {
              const fait = !!jalons[j.cle];
              const dispo = phaseCourante >= j.phaseMin;
              return (
                <button key={j.cle} disabled={!dispo || busy} onClick={() => toggleJalon(j.cle)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
                    padding: "12px 14px", borderRadius: 12, cursor: dispo ? "pointer" : "not-allowed",
                    fontFamily: "inherit", textAlign: "left",
                    background: fait ? "rgba(76,175,80,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${fait ? "rgba(102,187,106,0.4)" : "rgba(255,255,255,0.1)"}`,
                    opacity: dispo ? 1 : 0.4,
                  }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: fait ? "#43a047" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${fait ? "#43a047" : "rgba(255,255,255,0.2)"}`,
                    color: "#fff", fontSize: 13, fontWeight: 800,
                  }}>{fait ? "✓" : ""}</span>
                  <span style={{ fontSize: 14 }}>{j.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: fait ? "#a5d6a7" : "#e8f5e9" }}>{j.label}</div>
                    {fait && <div style={{ fontSize: 10, color: "#66BB6A" }}>Fait le {jalons[j.cle]}</div>}
                    {!dispo && <div style={{ fontSize: 10, color: "#4a7c5c" }}>Disponible plus tard dans le parcours</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {erreur && (
          <div style={{ background: "rgba(198,40,40,0.15)", border: "1px solid rgba(198,40,40,0.4)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#ef9a9a" }}>{erreur}</div>
        )}

        <button onClick={onRetour}
          style={{ marginTop: 8, width: "100%", background: "none", border: "none", color: "#4a7c5c", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Retour à Mon Gazon
        </button>
      </div>
    </div>
  );
}
