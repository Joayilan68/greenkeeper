import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConsents } from "../lib/useConsents";
import { card, btn } from "../lib/styles";

// ════════════════════════════════════════════════════════════════════════════
// REGISTER — Page d'acceptation des consentements RGPD
// ════════════════════════════════════════════════════════════════════════════
// Conforme aux exigences avocat (Cabinet Victoris) :
//   Mention 1 — CGU/CGV + Politique de confidentialité (décochées par défaut)
//   Mention 9 — Consentement prospection commerciale (décoché par défaut)
//
// Stockage hybride :
//   - PRIMAIRE : Supabase table user_consents (via useConsents hook)
//   - SECOURS  : localStorage (en cas d'échec Supabase)
// ════════════════════════════════════════════════════════════════════════════

export default function Register() {
  const navigate = useNavigate();
  const { consents: existingConsents, updateConsents } = useConsents();

  const [consents, setConsents] = useState({
    cgu_cgv:         false,  // case 1 — obligatoire (CGU + CGV combinées)
    confidentialite: false,  // case 2 — obligatoire (Politique de confidentialité)
    notifications:   false,  // optionnel
    dataResale:      false,  // optionnel (partage données anonymisées)
    marketing:       false,  // optionnel (prospection commerciale — mention 9 avocat)
  });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // Vérification consentements existants au mount

  // ── Skip si l'utilisateur a déjà accepté CGU/CGV + Confidentialité ────────
  // Source de vérité : useConsents() (Supabase + cache localStorage)
  useEffect(() => {
    if (existingConsents && (existingConsents.cgu_cgv || existingConsents.cgu) && existingConsents.confidentialite) {
      navigate("/", { replace: true });
      return;
    }

    // Fallback : si Supabase n'a pas répondu, on regarde le localStorage en secours
    try {
      const saved = localStorage.getItem("mg360_consents") || localStorage.getItem("gk_consents");
      if (saved) {
        const c = JSON.parse(saved);
        if ((c.cgu_cgv || c.cgu) && c.confidentialite) {
          navigate("/", { replace: true });
          return;
        }
      }
    } catch {}

    setChecking(false);
  }, [existingConsents, navigate]);

  const toggle = (key) => setConsents(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async () => {
    if (!consents.cgu_cgv || !consents.confidentialite) {
      setError("Vous devez accepter les CGU/CGV et la politique de confidentialité pour continuer.");
      return;
    }

    setError("");
    setLoading(true);

    // ── Payload Supabase : UNIQUEMENT les colonnes réelles de user_consents ──
    // La table user_consents contient : cgu, confidentialite, notifications,
    // marketing, data_resale, cookies, push_active, email_active, updated_at.
    // L'UI utilise cgu_cgv (case CGU+CGV) et dataResale → on les mappe ici sur
    // les vrais noms de colonnes. Les champs date/version n'existent PAS en base
    // et provoquaient l'échec total de l'upsert (PGRST204) → on les retire.
    const supabasePayload = {
      cgu:             consents.cgu_cgv,       // case CGU+CGV → colonne cgu
      confidentialite: consents.confidentialite,
      notifications:   consents.notifications,
      marketing:       consents.marketing,
      data_resale:     consents.dataResale,    // dataResale (UI) → data_resale (colonne)
    };

    // ── PRIMAIRE — Sauvegarde Supabase via useConsents ───────────────────────
    let supabaseSuccess = false;
    try {
      if (updateConsents) {
        await updateConsents(supabasePayload);
        supabaseSuccess = true;
      }
    } catch (e) {
      console.warn("[Register] Supabase write failed, fallback localStorage:", e?.message);
    }

    // ── SECOURS — localStorage (cache + fallback, format riche conservé) ─────
    // Le cache local peut garder date/version/cgu_cgv pour l'affichage et le
    // "skip" au prochain montage — ce sont des données locales, pas des colonnes.
    const localPayload = {
      ...consents,
      cgu:     consents.cgu_cgv,   // pour que le check (c.cgu || c.cgu_cgv) reste vrai
      date:    new Date().toISOString(),
      version: "1.0",
    };
    try {
      localStorage.setItem("mg360_consents", JSON.stringify(localPayload));
    } catch (e) {
      console.error("[Register] localStorage write failed:", e?.message);
      // Si même le localStorage échoue et que Supabase a aussi échoué, on bloque
      if (!supabaseSuccess) {
        setLoading(false);
        setError("Impossible de sauvegarder vos consentements. Vérifiez votre navigateur ou réessayez.");
        return;
      }
    }

    setLoading(false);
    navigate("/");
  };

  // ── Loading initial pendant vérification consentements ────────────────────
  if (checking) {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0d2b1a,#1a4731)", display:"flex", alignItems:"center", justifyContent:"center", color:"#a5d6a7", fontSize:14 }}>
        ⏳ Vérification...
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg, #0d2b1a, #1a4731)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <img src="/mg360-mascot-transparent.png" alt="Mongazon360" style={{ width:72, height:72, objectFit:"contain", marginBottom:16 }} />
      <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7", marginBottom:4 }}>
        Mongazon360<sup style={{ fontSize:11 }}>™</sup>
      </div>
      <div style={{ fontSize:13, color:"#81c784", marginBottom:24, textAlign:"center" }}>
        Dernière étape avant de commencer !
      </div>

      <div style={{ width:"100%", maxWidth:420 }}>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CASE 1 — CGU + CGV (OBLIGATOIRE — mention 1 avocat)             */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card(), marginBottom:8, border: consents.cgu_cgv ? "1px solid #43a047" : "1px solid rgba(255,255,255,0.1)" }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.cgu_cgv} onChange={() => toggle("cgu_cgv")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                ✅ J'accepte les CGU et les CGV <span style={{ color:"#ef9a9a" }}>*</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                J'ai lu et j'accepte les{" "}
                <span onClick={() => navigate("/cgu")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
                  Conditions Générales d'Utilisation
                </span>{" "}et les{" "}
                <span onClick={() => navigate("/cgv")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
                  Conditions Générales de Vente
                </span>{" "}de Mongazon360<sup style={{ fontSize:8 }}>™</sup>.
              </div>
            </div>
          </label>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CASE 2 — POLITIQUE DE CONFIDENTIALITÉ (OBLIGATOIRE — mention 1)  */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card(), marginBottom:8, border: consents.confidentialite ? "1px solid #43a047" : "1px solid rgba(255,255,255,0.1)" }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.confidentialite} onChange={() => toggle("confidentialite")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                🔒 J'accepte la politique de confidentialité <span style={{ color:"#ef9a9a" }}>*</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                J'ai lu la{" "}
                <span onClick={() => navigate("/confidentialite")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
                  Politique de confidentialité
                </span>{" "}
                et j'accepte le traitement de mes données pour la fourniture du service Mongazon360<sup style={{ fontSize:8 }}>™</sup>.
              </div>
            </div>
          </label>
        </div>

        {/* Séparateur visuel obligatoires / optionnels */}
        <div style={{ fontSize:10, fontWeight:800, color:"#66BB6A", letterSpacing:1, marginTop:16, marginBottom:8, textAlign:"center" }}>
          ─── CONSENTEMENTS OPTIONNELS ───
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* OPTIONNEL — NOTIFICATIONS PUSH                                   */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card(), marginBottom:8 }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.notifications} onChange={() => toggle("notifications")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                🔔 Activer les notifications push <span style={{ color:"#81c784", fontSize:11 }}>(optionnel)</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                Recevoir des alertes sur mon téléphone (gel, canicule, tonte en retard...) — max 1x/semaine.
              </div>
            </div>
          </label>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* OPTIONNEL — PARTAGE DONNÉES ANONYMISÉES                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card(), marginBottom:8, background:"rgba(249,168,37,0.05)", border:"1px solid rgba(249,168,37,0.2)" }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.dataResale} onChange={() => toggle("dataResale")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                📊 Partager mes données anonymisées <span style={{ color:"#81c784", fontSize:11 }}>(optionnel)</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                J'accepte que Mongazon360<sup style={{ fontSize:8 }}>™</sup> partage mes données d'utilisation <strong>anonymisées</strong> (type de gazon, historique d'entretien, zone géographique approximative) avec des partenaires du secteur jardinage, à des fins d'études de marché.{" "}
                <strong style={{ color:"#f9a825" }}>Ces données ne contiennent jamais mon nom ni mon email.</strong>{" "}
                Je peux retirer ce consentement à tout moment dans Paramètres.
              </div>
            </div>
          </label>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* OPTIONNEL — PROSPECTION COMMERCIALE (mention 9 avocat)           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card(), marginBottom:16 }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.marketing} onChange={() => toggle("marketing")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                📧 Recevoir des emails de prospection commerciale Mongazon360<sup style={{ fontSize:8 }}>™</sup> <span style={{ color:"#81c784", fontSize:11 }}>(optionnel)</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                Conseils saisonniers, nouveautés et offres de partenaires jardinage. <strong style={{ color:"#a5d6a7" }}>En l'absence de consentement, Mongazon360<sup style={{ fontSize:8 }}>™</sup> ne peut pas vous solliciter à des fins commerciales.</strong> Vous pouvez retirer ce consentement à tout moment dans Paramètres.
              </div>
            </div>
          </label>
        </div>

        {/* ── Erreur affichée ─────────────────────────────────────────────── */}
        {error && (
          <div style={{ background:"rgba(198,40,40,0.2)", border:"1px solid #c62828", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#ef9a9a", marginBottom:12 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ fontSize:11, color:"#81c784", textAlign:"center", marginBottom:12 }}>
          <span style={{ color:"#ef9a9a" }}>*</span> Champs obligatoires
        </div>

        {/* ── Bouton de validation ────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ ...btn.primary, fontSize:14, padding:"14px", opacity: loading ? 0.7 : 1 }}
        >
          {loading
            ? "⏳ Enregistrement..."
            : <>✅ Commencer avec Mongazon360<sup style={{ fontSize:8 }}>™</sup></>
          }
        </button>

        <div style={{ fontSize:10, color:"#4a7c5c", textAlign:"center", marginTop:12, lineHeight:1.5 }}>
          Vous pouvez modifier vos consentements à tout moment dans Paramètres → Mes données
        </div>

        {/* ── Mention marque déposée EUIPO (cohérence avec reste de l'app) ─ */}
        <div style={{ fontSize:9, color:"#3a5c44", textAlign:"center", marginTop:18, lineHeight:1.6 }}>
          © {new Date().getFullYear()} Mongazon360<sup style={{ fontSize:7 }}>™</sup> — Marque déposée à l'EUIPO<br/>
          Édité par un auto-entrepreneur immatriculé en France
        </div>

      </div>
    </div>
  );
}
