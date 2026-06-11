import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";
import { useSubscription } from "../lib/useSubscription";
import { useHistory } from "../lib/useHistory";
import { useProfile } from "../lib/useProfile";
import { useWeather } from "../lib/useWeather";
import { usePushNotifications } from "../lib/usePushNotifications";
import { useConsents } from "../lib/useConsents";
import { card, cardTitle, btn, scroll } from "../lib/styles";

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
  const { consents, updateConsent, updateConsents } = useConsents();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAccountDeleteConfirm, setShowAccountDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [geoStatus, setGeoStatus]   = useState("unknown");
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accountDeleteLoading, setAccountDeleteLoading] = useState(false);
  const [deleteReport, setDeleteReport] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then(result => {
        setGeoStatus(result.state);
      }).catch(() => {});
    }
    const loc = localStorage.getItem("gk_location");
    if (loc) setGeoStatus("granted");
  }, []);

  const handleNotifToggle = async () => {
    if (!consents.notifications) {
      // Toujours appeler subscribePush pour enregistrer/renouveler la subscription
      // même si la permission est déjà "granted" (subscription peut avoir expiré)
      if (isSupported) {
        await subscribePush();
      }
      await updateConsent("notifications", true);
    } else {
      await updateConsent("notifications", false);
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

  // ══════════════════════════════════════════════════════════════════════════
  // GÉRER MON ABONNEMENT — Stripe Customer Portal (mention 10 avocat)
  // Appelle /api/send?type=customer-portal qui génère un lien Stripe Portal
  // ══════════════════════════════════════════════════════════════════════════
  const openCustomerPortal = async () => {
    setPortalLoading(true);
    setPortalError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Token Clerk manquant");

      const res = await fetch("/api/send?type=customer-portal", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Lien portail indisponible");
      }

      // Redirection vers le portail Stripe
      window.location.href = data.url;
    } catch (e) {
      console.error("[Portal]", e);
      setPortalError(e.message || "Erreur lors de l'ouverture du portail.");
      setPortalLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT RGPD — Article 20 (Portabilité)
  // Appelle /api/rgpd-data qui renvoie un export complet de toutes les tables
  // ══════════════════════════════════════════════════════════════════════════
  const exportData = async () => {
    setExportLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Token Clerk manquant");

      const res = await fetch("/api/rgpd-data", {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const serverData = await res.json();

      // Le serveur renvoie déjà toutes les métadonnées RGPD. On ajoute juste
      // les données client (consentements, profil local cache) en complément.
      const data = {
        ...serverData,
        client_side_supplement: {
          consentements_local_cache: consents,
          historique_local_cache:    history,
          profil_local_cache:        profile,
          localisation_active:       locationName,
        },
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `mongazon360-mes-donnees-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[RGPD] export error:", e);
      alert(`Erreur d'export : ${e.message}\n\nContactez contact@mongazon360.fr si le problème persiste.`);
    }
    setExportLoading(false);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SUPPRESSION DONNÉES LOCALES uniquement (vide le cache navigateur)
  // Le compte Clerk reste actif — c'est juste pour repartir d'une page blanche
  // ══════════════════════════════════════════════════════════════════════════
  const deleteLocalData = async () => {
    setDeleteLoading(true);
    [
      "gk_location", "gk_location_name", "gk_profile", "mg360_profile_v1",
      "gk_history", "gk_history_v1", "CONSENTS_KEY", "gk_consents", "gk_push_sub",
      "gk_diagnostics", "gk_admin_code", "mg360_guest_validated",
      "mg360_guest_code", "mg360_approved", "mg360_onboarding_done",
      "mg360_waitlist", "mg360_ai_reco_today", "mg360_debit_mmh",
      "mg360_amazon_clicks", "mg360_budget_spent", "mg360_greenpoints",
      "mg360_notif_banner_seen", "gk_streak",
    ].forEach(k => localStorage.removeItem(k));

    setDeleteLoading(false);
    setDeleted(true);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SUPPRESSION COMPTE COMPLET — Article 17 (Effacement / Droit à l'oubli)
  // Cascade serveur : Cloudinary + Supabase (toutes tables) + Clerk
  // Puis : vidage localStorage + déconnexion automatique
  // ══════════════════════════════════════════════════════════════════════════
  const deleteAccount = async () => {
    setAccountDeleteLoading(true);
    setDeleteReport(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Token Clerk manquant");

      // 1. Appeler l'API serveur — cascade complète Cloudinary + Supabase + Clerk
      const res = await fetch("/api/rgpd-data", {
        method:  "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      const report = await res.json();
      setDeleteReport(report);

      // 2. Vider le localStorage côté client
      [
        "gk_location", "gk_location_name", "gk_profile", "mg360_profile_v1",
        "gk_history", "gk_history_v1", "CONSENTS_KEY", "gk_consents", "gk_push_sub",
        "gk_diagnostics", "gk_admin_code", "mg360_guest_validated",
        "mg360_guest_code", "mg360_approved", "mg360_onboarding_done",
        "mg360_waitlist", "mg360_ai_reco_today", "mg360_debit_mmh",
        "mg360_amazon_clicks", "mg360_budget_spent", "mg360_greenpoints",
        "mg360_notif_banner_seen", "gk_streak",
      ].forEach(k => localStorage.removeItem(k));

      // 3. Déconnexion immédiate (le compte Clerk a été supprimé côté serveur)
      setTimeout(async () => {
        try { await signOut(); } catch {}
        setAccountDeleted(true);
      }, 2500);

    } catch (e) {
      console.error("[RGPD] delete error:", e);
      setDeleteReport({
        success: false,
        errors: [`Erreur : ${e.message}`],
        message: "La suppression a échoué. Contactez contact@mongazon360.fr",
      });
    }
    setAccountDeleteLoading(false);
  };

  const dateAcceptation = consents.date
    ? new Date(consents.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })
    : null;
  const versionCGU = consents.version || "1.0";

  // ── Écran post-suppression données locales ──────────────────────────────
  if (deleted && !accountDeleted) return (
    <div style={{ minHeight:"100vh", background:"#0d2b1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, color:"#a5d6a7" }}>
      <div style={{ fontSize:48 }}>✅</div>
      <div style={{ fontSize:18, fontWeight:800, marginTop:12 }}>Données locales supprimées</div>
      <div style={{ fontSize:13, color:"#81c784", marginTop:8, textAlign:"center", maxWidth:400, lineHeight:1.6 }}>
        Le cache navigateur a été vidé.<br/>
        Votre compte reste actif et vos données serveur sont intactes.
      </div>
      <button onClick={() => navigate("/")} style={{ ...btn.primary, marginTop:24, width:"auto", padding:"10px 24px" }}>
        Retour à l'accueil
      </button>
    </div>
  );

  // ── Écran post-suppression compte complet ───────────────────────────────
  if (accountDeleted) return (
    <div style={{ minHeight:"100vh", background:"#0d2b1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, color:"#a5d6a7" }}>
      <div style={{ fontSize:48 }}>✅</div>
      <div style={{ fontSize:18, fontWeight:800, marginTop:12 }}>Compte supprimé</div>
      <div style={{ fontSize:13, color:"#81c784", marginTop:8, textAlign:"center", maxWidth:400, lineHeight:1.6 }}>
        Vos données ont été effacées conformément au RGPD Article 17.<br/><br/>
        Si vous avez des questions, écrivez à <strong>contact@mongazon360.fr</strong>
      </div>
      <button onClick={() => navigate("/")} style={{ ...btn.primary, marginTop:24, width:"auto", padding:"10px 24px" }}>
        Retour à l'accueil
      </button>
    </div>
  );

  return (
    <div>
      {/* Header avec mention Mongazon360™ */}
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/mg360-mascot-transparent.png" alt="Mongazon360" style={{ width:40, height:40, objectFit:"contain" }} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>
              Mes données &amp; Paramètres
            </div>
            <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>
              Mongazon360<sup style={{ fontSize:7 }}>™</sup> — RGPD — Gestion de vos consentements
            </div>
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
            { label:"Conservation", val: "Supabase (chiffré) + cache navigateur" },
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

          <div style={{ fontSize:10, fontWeight:800, color:"#66BB6A", letterSpacing:1, marginBottom:8, marginTop:16 }}>
            CONSENTEMENTS OPTIONNELS
          </div>

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

          {[
            { key:"notifications", label:"🔔 Notifications push", desc:"Alertes téléphone — rappels d'entretien et météo" },
            { key:"dataResale",    label:"📊 Données anonymisées", desc:"Partage avec partenaires jardinage — jamais nom/email" },
            { key:"marketing",     label:"📧 Emails Mongazon360", desc:"Conseils saisonniers et nouveautés" },
            { key:"cookies",       label:"🍪 Cookies analytiques", desc:"Amélioration de l'expérience — données anonymes" },
          ].map(({ key, label, desc }) => {
            const isNotif = key === "notifications";
            const notifGranted = isNotif && permission === "granted";
            const isOn = consents[key] ?? false;
            return (
              <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
                  <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>
                    {isNotif && notifGranted && consents.notifications
                      ? "✅ Actives — pour désactiver : désactivez ce toggle"
                      : isNotif && !notifGranted && consents.notifications
                      ? "⚠️ Consentement donné mais permission navigateur requise"
                      : desc}
                  </div>
                </div>
                <div
                  onClick={() => isNotif ? handleNotifToggle() : updateConsent(key, !consents[key])}
                  style={{
                    width:44, height:24, borderRadius:12,
                    cursor:"pointer", flexShrink:0, marginLeft:8,
                    background: isOn ? "#43a047" : "rgba(255,255,255,0.1)",
                    position:"relative", transition:"background 0.2s",
                  }}
                >
                  <div style={{
                    position:"absolute", top:3, left: isOn ? 22 : 3,
                    width:18, height:18, borderRadius:"50%", background:"#fff",
                    transition:"left 0.2s"
                  }} />
                </div>
              </div>
            );
          })}

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
              "✅ Droit à l'effacement — supprimez votre compte ci-dessous",
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MENTION 10 AVOCAT — Gérer mon abonnement Stripe Customer Portal */}
        {/* Visible uniquement si l'utilisateur a un abonnement Premium     */}
        {/* (les admins n'ont pas de Stripe customer attaché → caché)       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isPaid && !isAdmin && (
          <div style={{ ...card(), background:"rgba(33,150,243,0.04)", border:"1px solid rgba(33,150,243,0.2)" }}>
            <div style={cardTitle}><span>💳 Mon abonnement Premium</span></div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
              Gérez votre abonnement Mongazon360<sup style={{ fontSize:7 }}>™</sup> Premium en toute autonomie via le portail sécurisé Stripe :
            </div>
            <div style={{ fontSize:11, color:"#e8f5e9", marginBottom:14, lineHeight:1.8, paddingLeft:8 }}>
              • Voir et télécharger vos factures<br/>
              • Mettre à jour votre moyen de paiement<br/>
              • Modifier votre adresse de facturation<br/>
              • <strong style={{ color:"#90caf9" }}>Résilier votre abonnement en 1 clic</strong>
            </div>

            {portalError && (
              <div style={{ background:"rgba(198,40,40,0.15)", border:"1px solid rgba(198,40,40,0.3)", borderRadius:10, padding:"10px 12px", fontSize:11, color:"#ef9a9a", marginBottom:10 }}>
                ⚠️ {portalError}
              </div>
            )}

            <button
              onClick={openCustomerPortal}
              disabled={portalLoading}
              style={{
                background:"rgba(33,150,243,0.15)",
                border:"1px solid #2196f3",
                borderRadius:10, padding:"12px",
                color:"#90caf9", fontSize:13, fontWeight:700,
                cursor: portalLoading ? "not-allowed" : "pointer",
                width:"100%",
                opacity: portalLoading ? 0.6 : 1,
              }}
            >
              {portalLoading ? "⏳ Ouverture..." : "🔑 Gérer mon abonnement"}
            </button>

            <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8, textAlign:"center", lineHeight:1.5 }}>
              🔒 Portail sécurisé hébergé par Stripe — Vous serez redirigé puis ramené ici
            </div>
          </div>
        )}

        {/* ── SUPPRESSION DONNÉES LOCALES (cache navigateur uniquement) ── */}
        <div style={{ ...card(), background:"rgba(198,40,40,0.06)", border:"1px solid rgba(198,40,40,0.2)" }}>
          <div style={cardTitle}><span>🗑️ Supprimer mes données locales</span></div>
          <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
            Vide le cache navigateur (historique, profil, diagnostics, préférences stockés sur cet appareil).
            <strong style={{ color:"#a5d6a7" }}> Votre compte et vos données serveur restent intacts.</strong>
          </div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ background:"rgba(198,40,40,0.15)", border:"1px solid #c62828", borderRadius:10, padding:"10px", color:"#ef9a9a", fontSize:13, cursor:"pointer", width:"100%", fontWeight:700 }}>
              🗑️ Vider le cache local
            </button>
          ) : (
            <div>
              <div style={{ fontSize:13, color:"#ef9a9a", marginBottom:12, fontWeight:700 }}>
                ⚠️ Cache navigateur réinitialisé — vous devrez resaisir vos préférences locales.
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

        {/* ── SUPPRESSION COMPTE COMPLET (cascade RGPD Art. 17) ── */}
        <div style={{ ...card(), background:"rgba(198,40,40,0.06)", border:"1px solid rgba(198,40,40,0.25)" }}>
          <div style={cardTitle}><span>❌ Supprimer mon compte (RGPD Art. 17)</span></div>
          <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
            Suppression <strong style={{ color:"#ef9a9a" }}>définitive et irréversible</strong> de l'ensemble de vos données :
          </div>
          <div style={{ fontSize:11, color:"#e8f5e9", marginBottom:14, lineHeight:1.8, paddingLeft:8 }}>
            • Profil, historique, diagnostics photo<br/>
            • GreenPoints, streak, classements<br/>
            • Photos stockées (Cloudinary)<br/>
            • Compte d'authentification (Clerk)<br/>
            • Liste d'attente, préférences, consentements
          </div>

          {!showAccountDeleteConfirm && !deleteReport ? (
            <button onClick={() => setShowAccountDeleteConfirm(true)} style={{ background:"rgba(198,40,40,0.15)", border:"1px solid #c62828", borderRadius:10, padding:"12px", color:"#ef9a9a", fontSize:13, cursor:"pointer", width:"100%", fontWeight:700 }}>
              ❌ Supprimer définitivement mon compte
            </button>
          ) : showAccountDeleteConfirm && !deleteReport ? (
            <div>
              <div style={{ fontSize:13, color:"#ef9a9a", marginBottom:12, fontWeight:700, padding:"10px 12px", background:"rgba(198,40,40,0.1)", borderRadius:10 }}>
                ⚠️ Cette action est <strong>définitive</strong>.<br/>
                Aucune récupération possible après confirmation.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={deleteAccount} disabled={accountDeleteLoading} style={{ background:"#c62828", border:"none", borderRadius:10, padding:"12px", color:"#fff", fontSize:13, cursor:"pointer", flex:1, fontWeight:700, opacity: accountDeleteLoading ? 0.6 : 1 }}>
                  {accountDeleteLoading ? "⏳ Suppression en cours..." : "Confirmer la suppression"}
                </button>
                <button onClick={() => setShowAccountDeleteConfirm(false)} disabled={accountDeleteLoading} style={{ ...btn.ghost, flex:1, fontSize:13 }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            // Rapport de suppression affiché après l'appel API
            <div style={{ fontSize:11, color:"#e8f5e9", lineHeight:1.6 }}>
              <div style={{ fontWeight:800, marginBottom:8, color: deleteReport.success ? "#a5d6a7" : "#f9a825" }}>
                {deleteReport.message}
              </div>
              {deleteReport.errors?.length > 0 && (
                <details style={{ marginTop:8 }}>
                  <summary style={{ cursor:"pointer", color:"#ef9a9a", fontSize:11 }}>Détail des erreurs ({deleteReport.errors.length})</summary>
                  <div style={{ fontSize:10, color:"#ef9a9a", marginTop:6, paddingLeft:10 }}>
                    {deleteReport.errors.map((err, i) => <div key={i}>• {err}</div>)}
                  </div>
                </details>
              )}
              <div style={{ marginTop:10, fontSize:10, color:"#81c784", fontStyle:"italic" }}>
                Déconnexion automatique dans quelques secondes...
              </div>
            </div>
          )}
        </div>

        {/* ── Section À PROPOS — Marque déposée Mongazon360™ ── */}
        <div style={{ ...card(), background:"rgba(76,175,80,0.04)", border:"1px solid rgba(76,175,80,0.15)" }}>
          <div style={cardTitle}><span>ℹ️ À propos de Mongazon360<sup style={{ fontSize:8 }}>™</sup></span></div>
          <div style={{ fontSize:12, color:"#e8f5e9", lineHeight:1.8 }}>
            <div style={{ marginBottom:8 }}>
              <strong style={{ color:"#a5d6a7" }}>Mongazon360<sup style={{ fontSize:8 }}>™</sup></strong> est une marque déposée à l'EUIPO (European Union Intellectual Property Office) le 30 mai 2026.
            </div>
            <div style={{ fontSize:11, color:"#81c784", lineHeight:1.7, marginBottom:8 }}>
              <strong>Protection :</strong> 27 pays de l'Union européenne — 10 ans renouvelables<br/>
              <strong>Classes :</strong> 9 (logiciels), 42 (SaaS / services informatiques), 44 (jardinage / horticulture)<br/>
              <strong>Slogan :</strong> "Tant qu'il y a gazon, il y a match"
            </div>
            <div style={{ marginTop:12, padding:"8px 10px", background:"rgba(76,175,80,0.08)", borderRadius:8, fontSize:11, color:"#a5d6a7" }}>
              © {new Date().getFullYear()} Mongazon360<sup style={{ fontSize:7 }}>™</sup> — Tous droits réservés<br/>
              Édité par un auto-entrepreneur immatriculé en France (SIRET disponible dans les Mentions légales)
            </div>
          </div>
        </div>

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
