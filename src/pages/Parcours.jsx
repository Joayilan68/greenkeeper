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
import { calcSemences } from "../lib/lawn";
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
// ─────────────────────────────────────────────────────────────────────────────
// GUIDE DE PRÉPARATION DU SOL (13 étapes) — source : plan agronomique Mongazon360
// Affiché en modal depuis l'écran de suivi du parcours (bouton permanent).
// ─────────────────────────────────────────────────────────────────────────────
const GUIDE_PREPA = {
  creation: [
  { n: 1, action: "Nettoyer la parcelle", methode: "Retirer ancien gazon si nécessaire, pierres, racines, débris et adventices.", vigilance: "Éliminer correctement les adventices avant le travail du sol." },
  { n: 2, action: "Décompacter le sol", methode: "Travailler environ 15 à 20 cm de profondeur pour favoriser enracinement et infiltration.", vigilance: "Aller plus profond uniquement si le sol est très compacté." },
  { n: 3, action: "Corriger / amender si nécessaire", methode: "Adapter la structure et la fertilité selon le type de sol.", vigilance: "Faire les grosses corrections avant le nivellement." },
  { n: 4, action: "Nivellement grossier", methode: "Supprimer bosses et creux et prévoir une pente évitant les stagnations d'eau.", vigilance: "Ne pas laisser de cuvettes." },
  { n: 5, action: "Laisser stabiliser / faux-semis", methode: "Laisser le sol se stabiliser après un travail important. Un faux-semis permet de faire lever puis éliminer des adventices.", vigilance: "Utile sur terrain fortement remanié." },
  { n: 6, action: "Préparer le lit de semences", methode: "Affiner superficiellement les 2 à 4 premiers cm au râteau.", vigilance: "Obtenir une terre fine sans grosses mottes." },
  { n: 7, action: "Nivellement fin", methode: "Finaliser la planéité au râteau.", vigilance: "Conserver les pentes d'évacuation prévues." },
  { n: 8, action: "Raffermir le sol", methode: "Passer légèrement le rouleau.", vigilance: "Le sol doit être ferme sans être compacté." },
  { n: 9, action: "Griffer la surface", methode: "Griffer très légèrement si la surface est devenue trop lisse.", vigilance: "Ne pas retravailler profondément." },
  { n: 10, action: "Semer", methode: "Semer à la dose recommandée, idéalement en deux passages croisés.", vigilance: "Répartir les graines de manière homogène." },
  { n: 11, action: "Recouvrir légèrement", methode: "Incorporer très légèrement les graines, environ 0,5 cm, éventuellement jusqu'à 1 cm.", vigilance: "Ne pas enfouir profondément les graines." },
  { n: 12, action: "Rouler après semis", methode: "Passage léger du rouleau pour améliorer le contact graine/sol.", vigilance: "Éviter un compactage excessif." },
  { n: 13, action: "Arrosage de germination", methode: "Arroser immédiatement en pluie fine puis maintenir la surface humide pendant la germination.", vigilance: "Éviter dessèchement, ruissellement et excès d'eau." },
  ],
  regarnissage: [
  { n: 1, action: "Tondre court", methode: "Tondre généralement autour de 2,5 à 4 cm sans scalper.", vigilance: "Adapter à la hauteur du gazon existant." },
  { n: 2, action: "Ramasser les déchets", methode: "Retirer soigneusement les résidus de tonte.", vigilance: "Libérer l'accès à la surface du sol." },
  { n: 3, action: "Scarifier / verticuter", methode: "Ouvrir le couvert, retirer une partie du feutre et créer des passages vers le sol.", vigilance: "Des passages croisés sont utiles pour un regarnissage important." },
  { n: 4, action: "Ramasser le feutre", methode: "Évacuer intégralement les débris issus de la scarification.", vigilance: "La graine doit pouvoir atteindre le sol." },
  { n: 5, action: "Aérer si nécessaire", methode: "Décompacter un sol tassé ; l'aération à carottes est particulièrement efficace.", vigilance: "Non systématique si le sol n'est pas compacté." },
  { n: 6, action: "Corriger la surface", methode: "Combler les petits creux et irrégularités avec un apport adapté.", vigilance: "Ne pas recouvrir excessivement le gazon existant." },
  { n: 7, action: "Terreautage léger éventuel", methode: "Appliquer un top-dressing fin si nécessaire.", vigilance: "Ne jamais ensevelir le gazon existant." },
  { n: 8, action: "Semer", methode: "Semer les graines de regarnissage, idéalement en deux passages croisés.", vigilance: "Respecter la dose adaptée au mélange utilisé." },
  { n: 9, action: "Mettre les graines au contact du sol", methode: "Léger râteau, balai à gazon ou matériel adapté pour faire descendre les graines entre les brins.", vigilance: "Éviter que les graines restent suspendues dans le feuillage." },
  { n: 10, action: "Rouler légèrement", methode: "Améliorer le contact graine/sol.", vigilance: "Passage léger uniquement." },
  { n: 11, action: "Arroser", methode: "Arroser en pluie fine et maintenir la surface régulièrement humide pendant la germination.", vigilance: "Éviter dessèchement, ruissellement et excès d'eau." },
  { n: 12, action: "Limiter le piétinement", methode: "Protéger les jeunes graminées pendant leur implantation.", vigilance: "Attendre un enracinement suffisant avant usage normal." },
  { n: 13, action: "Première tonte", methode: "Tondre avec une lame affûtée lorsque les nouvelles pousses sont suffisamment développées.", vigilance: "Ne pas retirer plus d'environ 1/3 de la hauteur." },
  ],
};

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
  const { profile } = useProfile();
  const semences = calcSemences(profile?.surface, parcours.type); // { ok, minTxt, maxTxt, doseGm } ou { ok:false }
  const [etat, setEtat] = useState(null);   // { phase, nom, jour, action, arrosage, blocages, termine }
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [showGuide, setShowGuide] = useState(false); // modal guide de préparation
  const [showCalcul, setShowCalcul] = useState(false); // explication du calcul de semences
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

            {/* Volume de semences (phase semis) selon la surface du profil */}
            {etat.phase === 2 && (
              <div style={{ marginTop: 12, background: "rgba(139,195,74,0.12)", border: "1px solid rgba(139,195,74,0.3)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>🌾</span>
                  <span style={{ fontSize: 12, color: "#aed581", fontWeight: 700, letterSpacing: 0.5 }}>QUANTITÉ DE SEMENCES</span>
                  {semences.ok && (
                    <button onClick={() => setShowCalcul((v) => !v)}
                      style={{ marginLeft: "auto", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(165,214,167,0.2)", borderRadius: "50%", width: 22, height: 22, color: "#a5d6a7", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
                      title="Comment est calculée cette quantité ?">ℹ️</button>
                  )}
                </div>
                {semences.ok ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#e8f5e9" }}>
                      {semences.minTxt} à {semences.maxTxt}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ccc65", marginTop: 3 }}>
                      Pour {semences.surface} m² · {semences.doseGm} g/m² (+10% marge bordures/reprises)
                    </div>
                    {showCalcul && (
                      <div style={{ marginTop: 10, background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "#c5e1a5", lineHeight: 1.55 }}>
                        <b style={{ color: "#e8f5e9" }}>Comment on calcule&nbsp;:</b> {semences.surface} m² × {semences.doseGm} g/m² (dose standard pour un {parcours.type === "regarnissage" ? "regarnissage" : "semis de création"}) = {semences.minTxt}, puis +10&nbsp;% pour les bordures, reprises et pertes → jusqu'à {semences.maxTxt}. Chiffre indicatif : ajustez selon les recommandations de votre mélange de semences.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#c5e1a5" }}>
                    Renseignez la surface de votre terrain dans votre profil pour obtenir la quantité indicative.
                  </div>
                )}
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

        {/* ── Bouton Guide de préparation (permanent) ── */}
        <button onClick={() => setShowGuide(true)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "13px 16px", borderRadius: 14, marginBottom: 12, cursor: "pointer", fontFamily: "inherit",
            background: "rgba(76,175,80,0.12)", border: "1px solid rgba(102,187,106,0.3)", color: "#a5d6a7", fontWeight: 700, fontSize: 13 }}>
          📋 Guide de préparation détaillé
        </button>

        <button onClick={onRetour}
          style={{ marginTop: 8, width: "100%", background: "none", border: "none", color: "#4a7c5c", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Retour à Mon Gazon
        </button>
      </div>

      {showGuide && (
        <GuidePreparation type={parcours.type} semences={semences} onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL — Guide de préparation du sol détaillé (13 étapes selon le type)
// ─────────────────────────────────────────────────────────────────────────────
function GuidePreparation({ type, semences, onClose }) {
  const estRegarn = type === "regarnissage";
  const etapes = estRegarn ? GUIDE_PREPA.regarnissage : GUIDE_PREPA.creation;
  const titre = estRegarn ? "Préparation — Regarnissage" : "Préparation — Création par semis";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto",
          background: "linear-gradient(180deg,#12351f,#0c2417)", borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(102,187,106,0.25)", padding: "20px 18px 40px" }}
      >
        {/* Poignée + en-tête */}
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 4, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F1F8F2" }}>{titre}</div>
          <button onClick={onClose}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 32, height: 32,
              color: "#a5d6a7", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: "#81c784", marginBottom: 18 }}>
          {etapes.length} étapes, de la préparation au premier arrosage.
        </div>

        {/* Liste des étapes */}
        {etapes.map((e) => (
          <div key={e.n} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
              background: "rgba(76,175,80,0.25)", border: "1px solid rgba(102,187,106,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: "#a5d6a7" }}>{e.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f5e9", marginBottom: 3 }}>{e.action}</div>
              {e.methode && (
                <div style={{ fontSize: 12.5, color: "#c8e6c9", lineHeight: 1.5, marginBottom: 4 }}>{e.methode}</div>
              )}
              {e.vigilance && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6,
                  background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)",
                  borderRadius: 8, padding: "6px 9px" }}>
                  <span style={{ fontSize: 12, flexShrink: 0 }}>⚠️</span>
                  <span style={{ fontSize: 11.5, color: "#ffe082", lineHeight: 1.4 }}>{e.vigilance}</span>
                </div>
              )}
              {/* Volume de semences indicatif sous l'étape "Semer" */}
              {e.action === "Semer" && semences && semences.ok && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 5,
                  background: "rgba(139,195,74,0.12)", border: "1px solid rgba(139,195,74,0.3)",
                  borderRadius: 8, padding: "7px 10px" }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>🌾</span>
                  <span style={{ fontSize: 11.5, color: "#c5e1a5", lineHeight: 1.4 }}>
                    Pour vos {semences.surface} m² : <b style={{ color: "#e8f5e9" }}>{semences.minTxt} à {semences.maxTxt}</b> ({semences.doseGm} g/m² +10%).
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        <button onClick={onClose}
          style={{ width: "100%", marginTop: 10, padding: "13px", borderRadius: 14, cursor: "pointer",
            fontFamily: "inherit", background: "rgba(76,175,80,0.2)", border: "1px solid rgba(102,187,106,0.4)",
            color: "#a5d6a7", fontWeight: 700, fontSize: 14 }}>
          Fermer
        </button>
      </div>
    </div>
  );
}
