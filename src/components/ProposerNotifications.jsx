// src/components/ProposerNotifications.jsx
// Activation des notifications au moment où elles servent, après une première aide (résultat du diagnostic, parcours
// lancé ou en attente de la fenêtre de semis) plutôt qu'à l'inscription (plan « trafic ×10 », action 9). La carte ne
// s'affiche pas si les notifications sont déjà actives, refusées ou impossibles sur ce téléphone (iPhone sans
// installation), ni pendant 14 jours après « Plus tard » ; la tuile de l'accueil reste disponible.
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { usePushNotifications } from "../lib/usePushNotifications";
import { useConsents } from "../lib/useConsents";
import { useReminders } from "../lib/useReminders";

const CLE_REPORT = "mg360_notif_plus_tard";
const REPORT_JOURS = 14;
const reporteRecemment = () => {
  try { return Date.now() - Number(localStorage.getItem(CLE_REPORT) || 0) < REPORT_JOURS * 86400000; }
  catch { return false; }
};

// Activation commune (tuile de l'accueil et cartes après une première aide) : abonnement du téléphone, notification
// de test, consentement et rappels (sans rappels actifs, la tâche du matin n'envoie rien)
export function useActiverNotifications() {
  const { user } = useUser();
  const push = usePushNotifications(user?.id);
  const { consents, showPushBanner, updateConsents, syncFromReminders } = useConsents();
  const { enableAll } = useReminders(syncFromReminders);
  const activer = async () => {
    if (!(await push.subscribe())) return false;
    await push.sendTestNotification();
    await updateConsents({ notifications: true });
    enableAll();
    return true;
  };
  return { ...push, consents, showPushBanner, activer };
}

export default function ProposerNotifications({ titre, texte }) {
  const { isSupported, permission, loading, error, consents, activer } = useActiverNotifications();
  const [masque, setMasque] = useState(reporteRecemment);
  if (masque || !isSupported || permission !== "default" || consents?.push_active) return null;

  const plusTard = () => {
    try { localStorage.setItem(CLE_REPORT, String(Date.now())); } catch { /* navigation privée */ }
    setMasque(true);
  };
  return (
    <div data-tuile="proposer-notifications" style={{ background:"linear-gradient(135deg,rgba(27,94,32,0.6),rgba(13,43,26,0.8))",
      border:"1px solid rgba(102,187,106,0.35)", borderRadius:16, padding:"16px", marginBottom:12 }}>
      <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:6 }}>🔔 {titre}</div>
      <div style={{ fontSize:12.5, color:"#a5d6a7", lineHeight:1.55, marginBottom:12 }}>
        {texte} Au plus 2 conseils par jour, plus les alertes gel ou canicule ; désactivable dans Paramètres.
      </div>
      {error && <div style={{ fontSize:11.5, color:"#ffcc80", lineHeight:1.5, marginBottom:10 }}>⚠️ {error}</div>}
      <button onClick={async () => { if (!loading && await activer()) setMasque(true); }} disabled={loading}
        style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#43a047,#2e7d32)",
          color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", opacity: loading ? 0.7 : 1 }}>
        {loading ? "…" : "Activer les notifications"}
      </button>
      <button onClick={plusTard} style={{ display:"block", margin:"8px auto 0", background:"none", border:"none", color:"#81c784",
        fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
        Plus tard
      </button>
    </div>
  );
}
