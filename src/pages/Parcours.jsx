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
import { appShell, btn } from "../lib/styles";

const VERT = "#43a047";

export default function Parcours() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { profile } = useProfile();
  const { parcours, aUnParcoursActif, analyserFenetre, creerParcours, loading } = useParcours();

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
