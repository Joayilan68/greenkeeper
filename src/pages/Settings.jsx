import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";
import { useSubscription } from "../lib/useSubscription";
import { useHistory } from "../lib/useHistory";
import { useProfile } from "../lib/useProfile";
import { useWeather } from "../lib/useWeather";
import { usePushNotifications } from "../lib/usePushNotifications";
import { card, cardTitle, btn, scroll } from "../lib/styles";

// ── Clé unifiée — même clé que Register.jsx ──────────────────────────────────
const CONSENTS_KEY = "mg360_consents";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { isPaid, isAdmin } = useSubscription();
  const { history } = useHistory();
  const { profile } = useProfile();
  const { locationName } = useWeather() || {};
  const { permission, subscribe: subscribePush, isSupported } = usePushNotifications(user?.id);

  const [consents, setConsents] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAccountDeleteConfirm, setShowAccountDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [geoStatus, setGeoStatus]   = useState("unknown"); // "granted" | "denied" | "unknown"
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Charger les consentements (clé unifiée mg360_consents)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENTS_KEY);
      if (saved) setConsents(JSON.parse(saved));

      // Vérifier statut géolocalisation
      if (navigator.permissions) {
        navigator.permissions.query({ name: "geolocation" }).then(result => {
          setGeoStatus(result.state); // "granted" | "denied" | "prompt"
        }).catch(() => {});
      }
      const loc = localStorage.getItem("gk_location");
      if (loc) setGeoStatus("granted");
    } catch {}
  }, []);

  const updateConsent = (key, value) => {
    const updated = { ...consents, [key]: value, lastUpdated: new Date().toISOString() };
    setConsents(updated);
    localStorage.setItem(CONSENTS_KEY, JSON.stringify(updated));
  };

  // Handler spécifique pour le toggle notifications push
  const handleNotifToggle = async () => {
    if (!consents.notifications) {
      // Activation → déclencher la vraie permission push si pas encore accordée
      if (isSupported && permission !== "granted") {
        await subscribePush();
      }
      updateConsent("notifications", true);
    } else {
      // Désactivation → on retire le consentement (la permission navigateur
      // ne peut pas être révoquée programmatiquement — l'utilisateur doit
      // le faire depuis les paramètres de son navigateur/téléphone)
      updateConsent("notifications", false);
    }
  };

  const revokeGeolocation = () => {
    localStorage.removeItem("gk_location");
    localStorage.removeItem("gk_location_name");
    setGeoStatus("denied");
    updateConsent("geolocation", false);
  };

  const activateGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.setItem("gk_location", JSON.stringify({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }));
        setGeoStatus("granted");
        updateConsent("geolocation", true);
      },
      () => setGeoStatus("denied")
    );
  };

  // ── Export RGPD — données locales + Supabase ──────────────────────────────
  const exportData = async () => {
    setExportLoading(true);
    try {
      const token = await getToken();
      let serverData = null;

      // Tentative récupération données Supabase via API
      if (token) {
        try {
          const res = await fetch("/api/user-data", {
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (res.ok) serverData = await res.json();
        } catch {}
      }

      // Fusion données serveur + locales
      const data = {
        export_date:  new Date().toISOString(),
        droits_rgpd:  "Données exportées conformément au RGPD — Article 20 (droit à la portabilité)",
        responsable:  "Mongazon360 — contact@mongazon360.fr",
        user: {
          email:      user?.emailAddresses[0]?.emailAddress,
          nom:        user?.fullName,
          clerk_id:   user?.id,
          created_at: user?.createdAt,
        },
        abonnement:   isPaid ? "Premium" : "Gratuit",
        consentements: consents,
        localisation: locationName,
        // Données serveur (Supabase) si disponibles, sinon localStorage
        profil:       serverData?.profil    || profile,
        historique:   serverData?.historique || history,
        greenpoints:  serverData?.greenpoints || null,
        streak:       serverData?.streak     || null,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `mg360-mes-donnees-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("export:", e);
    }
    setExportLoading(false);
  };

  // ── Suppression RGPD — localStorage + Supabase ───────────────────────────
  const deleteLocalData = async () => {
    setDeleteLoading(true);
    // 1. Supprimer données locales
    [
      "gk_location", "gk_location_name", "gk_profile", "mg360_profile_v1",
      "gk_history", "gk_history_v1", CONSENTS_KEY, "gk_consents", "gk_push_sub",
      "gk_diagnostics", "gk_admin_code", "mg360_guest_validated",
      "mg360_guest_code", "mg360_approved", "mg360_onboarding_done",
      "mg360_waitlist", "mg360_ai_reco_today", "mg360_debit_mmh",
      "mg360_amazon_clicks", "mg360_budget_spent", "mg360_greenpoints",
      "mg360_notif_banner_seen", "gk_streak",
    ].forEach(k => localStorage.removeItem(k));

    // 2. Supprimer données Supabase via API
    try {
      const token = await getToken();
      if (token) {
        await fetch("/api/user-data", {
          method:  "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.warn("Supabase delete error:", e);
    }

    setDeleteLoading(false);
    setDeleted(true);
  };

  const deleteAccount = async () => {
    // 1. Supprimer données locales
    deleteLocalData();
    // 2. Déconnecter
    try { await signOut(); } catch {}
    // 3. Rediriger vers login avec message
    navigate("/login");
  };

  // ── Données consentements initiaux (depuis Register.jsx) ──────────────────
  const dateAcceptation = consents.date
    ? new Date(consents.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })
    : null;
  const versionCGU = consents.version || "1.0";

  if (deleted) return (
    <div style={{ minHeight:"100vh", background:"#0d2b1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, color:"#a5d6a7" }}>
      <div style={{ fontSize:48 }}>✅</div>
      <div style={{ fontSize:18, fontWeight:800, marginTop:12 }}>Données supprimées</div>
      <div style={{ fontSize:13, color:"#81c784", marginTop:8, textAlign:"center" }}>
        Toutes vos données locales ont été effacées.<br/>
        Pour la suppression complète du compte, contactez contact@mongazon360.fr
      </div>
      <button onClick={() => navigate("/")} style={{ ...btn.primary, marginTop:20, width:"auto", padding:"10px 24px" }}>
        Retour
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Mes données & Paramètres</div>
            <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>RGPD — Gestion de vos consentements</div>
          </div>
        </div>
      </div>

      <div style={scroll}>

        {/* ── RÉSUMÉ DONNÉES ── */}
        <div style={card()}>
          <div style={cardTitle}><span>👤 Mes données</span></div>
          {[
            { label:"Email",        val: user?.emailAddresses[0]?.emailAddress || "—" },
            { label:"Nom",          val: user?.fullName || "—" },
            { label:"Abonnement",   val: isAdmin ? "👑 Admin" : isPaid ? "✅ Premium" : "🆓 Gratuit" },
            { label:"Interventions",val: `${history?.length || 0} entrées` },
            { label:"Profil gazon", val: profile ? `${profile.pelouse || "?"} — ${profile.surface || "?"}m²` : "Non configuré" },
            { label:"Localisation", val: locationName || "Non définie" },
            { label:"Conservation", val: "Données locales — supprimées à votre demande" },
          ].map(({ label, val }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
              <span style={{ color:"#81c784" }}>{label}</span>
              <span style={{ fontWeight:600, textAlign:"right", maxWidth:"55%", fontSize:12 }}>{val}</span>
            </div>
          ))}
          <button onClick={exportData} disabled={exportLoading} style={{ ...btn.ghost, marginTop:12, fontSize:12, padding:"8px", opacity: exportLoading ? 0.6 : 1 }}>
            {exportLoading ? "⏳ Export en cours..." : "📥 Télécharger mes données (Art. 20 RGPD)"}
          </button>
        </div>

        {/* ── CONSENTEMENTS ── */}
        <div style={card()}>
          <div style={cardTitle}><span>🔒 Mes consentements</span></div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
            Modifiez vos préférences à tout moment — effet immédiat.{" "}
            {dateAcceptation && (
              <span>Consentements initiaux acceptés le <strong>{dateAcceptation}</strong> (v{versionCGU}).</span>
            )}
          </div>

          {/* ── Consentements OBLIGATOIRES (lecture seule) ── */}
          <div style={{ fontSize:10, fontWeight:800, color:"#66BB6A", letterSpacing:1, marginBottom:8, marginTop:4 }}>
            CONSENTEMENTS OBLIGATOIRES
          </div>

          {[
            {
              label: "✅ Conditions Générales d'Utilisation",
              desc:  dateAcceptation ? `Acceptées le ${dateAcceptation} — v${versionCGU}` : "Acceptées à l'inscription",
              route: "/cgu",
            },
            {
              label: "🔒 Politique de confidentialité",
              desc:  dateAcceptation ? `Acceptée le ${dateAcceptation}` : "Acceptée à l'inscription",
              route: "/confidentialite",
            },
          ].map(({ label, desc, route }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
                <div style={{ fontSize:11, color:"#81c784" }}>
                  {desc} —{" "}
                  <span onClick={() => navigate(route)} style={{ color:"#95d5b2", cursor:"pointer", textDecoration:"underline" }}>
                    Consulter
                  </span>
                </div>
              </div>
              <span style={{ fontSize:11, color:"#43a047", fontWeight:700, marginLeft:8 }}>Obligatoire</span>
            </div>
          ))}

          {/* ── Consentements OPTIONNELS ── */}
          <div style={{ fontSize:10, fontWeight:800, color:"#66BB6A", letterSpacing:1, marginBottom:8, marginTop:16 }}>
            CONSENTEMENTS OPTIONNELS
          </div>

          {/* Géolocalisation — cas spécial */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>📍 Géolocalisation</div>
              <div style={{ fontSize:11, color:"#81c784" }}>
                {geoStatus === "granted"
                  ? `Activée — ${locationName || "position enregistrée"}`
                  : "Désactivée — météo et zone climatique indisponibles"}
              </div>
            </div>
            {geoStatus === "granted" ? (
              <button onClick={revokeGeolocation} style={{ fontSize:11, color:"#ef9a9a", background:"rgba(198,40,40,0.15)", border:"1px solid rgba(198,40,40,0.3)", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>
                Révoquer
              </button>
            ) : (
              <button onClick={activateGeolocation} style={{ fontSize:11, color:"#64b5f6", background:"rgba(100,181,246,0.1)", border:"1px solid rgba(100,181,246,0.3)", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>
                Activer
              </button>
            )}
          </div>

          {/* Consentements toggle */}
          {[
            { key:"notifications", label:"🔔 Notifications push", desc:"Alertes téléphone — max 1x/semaine" },
            { key:"dataResale",    label:"📊 Données anonymisées", desc:"Partage avec partenaires jardinage — jamais nom/email" },
            { key:"marketing",     label:"📧 Emails MG360", desc:"Conseils saisonniers et nouveautés" },
            { key:"cookies",       label:"🍪 Cookies analytiques", desc:"Amélioration de l'expérience — données anonymes" },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
                <div style={{ fontSize:11, color:"#81c784" }}>
                  {desc}
                  {key === "notifications" && !consents.notifications && permission === "granted" && (
                    <span style={{ color:"#f9a825", marginLeft:4 }}>— Permission accordée, réactivez pour recevoir les alertes</span>
                  )}
                  {key === "notifications" && consents.notifications && (
                    <span style={{ color:"#a5d6a7", marginLeft:4 }}>— {permission === "granted" ? "Actives ✅" : "En attente de permission navigateur"}</span>
                  )}
                </div>
              </div>
              <div
                onClick={key === "notifications" ? handleNotifToggle : () => updateConsent(key, !consents[key])}
                style={{
                  width:44, height:24, borderRadius:12, cursor:"pointer", flexShrink:0, marginLeft:8,
                  background: consents[key] ? "#43a047" : "rgba(255,255,255,0.1)",
                  position:"relative", transition:"background 0.2s"
                }}
              >
                <div style={{
                  position:"absolute", top:3, left: consents[key] ? 22 : 3,
                  width:18, height:18, borderRadius:"50%", background:"#fff",
                  transition:"left 0.2s"
                }} />
              </div>
            </div>
          ))}

          {consents.lastUpdated && (
            <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8 }}>
              Dernière mise à jour : {new Date(consents.lastUpdated).toLocaleDateString("fr-FR")}
            </div>
          )}
        </div>

        {/* ── DROITS RGPD ── */}
        <div style={{ ...card(), background:"rgba(33,150,243,0.06)", border:"1px solid rgba(33,150,243,0.2)" }}>
          <div style={cardTitle}><span>⚖️ Vos droits RGPD</span></div>
          <div style={{ fontSize:12, color:"#e8f5e9", lineHeight:1.8 }}>
            {[
              "✅ Droit d'accès — téléchargez vos données ci-dessus",
              "✅ Droit de rectification — modifiez votre profil dans l'app",
              "✅ Droit à l'effacement — supprimez vos données ci-dessous",
              "✅ Droit à la portabilité — export JSON disponible",
              "✅ Droit d'opposition — désactivez les consentements ci-dessus",
            ].map(d => <div key={d}>{d}</div>)}
          </div>
          <div style={{ marginTop:12, padding:"10px 12px", background:"rgba(33,150,243,0.08)", borderRadius:10, fontSize:12, color:"#90caf9", lineHeight:1.7 }}>
            <strong>Contact DPO :</strong> contact@mongazon360.fr<br/>
            Réponse sous 48h · Résolution sous 30 jours ouvrés<br/>
            Médiateur : CM2C — 49 Rue de Ponthieu, 75008 Paris — cm2c.net
          </div>
        </div>

        {/* ── DOCUMENTS LÉGAUX ── */}
        <div style={card()}>
          <div style={cardTitle}><span>📋 Documents légaux</span></div>
          {[
            { label:"Mentions légales",            route:"/mentions-legales" },
            { label:"Politique de confidentialité", route:"/confidentialite" },
            { label:"CGU",                          route:"/cgu" },
            { label:"CGV",                          route:"/cgv" },
            { label:"Politique de cookies",         route:"/cookies" },
          ].map(({ label, route }) => (
            <div key={route} onClick={() => navigate(route)} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", cursor:"pointer", fontSize:13 }}>
              <span>{label}</span>
              <span style={{ color:"#81c784" }}>→</span>
            </div>
          ))}
        </div>

        {/* ── SUPPRESSION DONNÉES LOCALES ── */}
        <div style={{ ...card(), background:"rgba(198,40,40,0.06)", border:"1px solid rgba(198,40,40,0.2)" }}>
          <div style={cardTitle}><span>🗑️ Supprimer mes données locales</span></div>
          <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
            Supprime l'historique, le profil, les diagnostics et les préférences stockés sur cet appareil.
            Votre compte Clerk reste actif.
          </div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ background:"rgba(198,40,40,0.15)", border:"1px solid #c62828", borderRadius:10, padding:"10px", color:"#ef9a9a", fontSize:13, cursor:"pointer", width:"100%", fontWeight:700 }}>
              🗑️ Supprimer mes données locales
            </button>
          ) : (
            <div>
              <div style={{ fontSize:13, color:"#ef9a9a", marginBottom:12, fontWeight:700 }}>
                ⚠️ Action irréversible — historique, profil et diagnostics supprimés.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={deleteLocalData} disabled={deleteLoading} style={{ background:"#c62828", border:"none", borderRadius:10, padding:"10px", color:"#fff", fontSize:13, cursor:"pointer", flex:1, fontWeight:700, opacity: deleteLoading ? 0.6 : 1 }}>
                  {deleteLoading ? "⏳ Suppression..." : "Confirmer"}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ ...btn.ghost, flex:1, fontSize:13 }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── SUPPRESSION COMPTE COMPLET ── */}
        <div style={{ ...card(), background:"rgba(198,40,40,0.04)", border:"1px solid rgba(198,40,40,0.15)" }}>
          <div style={cardTitle}><span>❌ Supprimer mon compte</span></div>
          <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
            Supprime vos données locales et vous déconnecte. Pour la suppression définitive du compte
            (données Clerk, historique serveur), envoyez un email à{" "}
            <strong style={{ color:"#a5d6a7" }}>contact@mongazon360.fr</strong> avec l'objet
            "Suppression compte RGPD".
          </div>
          {!showAccountDeleteConfirm ? (
            <button onClick={() => setShowAccountDeleteConfirm(true)} style={{ background:"rgba(198,40,40,0.1)", border:"1px solid rgba(198,40,40,0.3)", borderRadius:10, padding:"10px", color:"#ef9a9a", fontSize:12, cursor:"pointer", width:"100%", fontWeight:700 }}>
              ❌ Supprimer mon compte et mes données
            </button>
          ) : (
            <div>
              <div style={{ fontSize:12, color:"#ef9a9a", marginBottom:12 }}>
                ⚠️ Vous serez déconnecté et vos données locales supprimées.<br/>
                Pour la suppression définitive : contact@mongazon360.fr
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={deleteAccount} style={{ background:"#c62828", border:"none", borderRadius:10, padding:"10px", color:"#fff", fontSize:12, cursor:"pointer", flex:1, fontWeight:700 }}>
                  Confirmer
                </button>
                <button onClick={() => setShowAccountDeleteConfirm(false)} style={{ ...btn.ghost, flex:1, fontSize:12 }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
