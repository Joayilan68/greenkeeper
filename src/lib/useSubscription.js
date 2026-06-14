// src/lib/useSubscription.js
import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

// Emails admin — seule source d'accès admin (vérifiée par Clerk, infalsifiable côté client)
const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

// ── Flags localStorage pour un accès admin (cache d'affichage, pas une preuve) ──
function setAdminFlags() {
  try {
    localStorage.setItem("mg360_approved",       "true");
    localStorage.setItem("mg360_onboarding_done", "true");
    localStorage.removeItem("mg360_waitlist");
  } catch {}
}

export function useSubscription() {
  const { isSignedIn, getToken } = useAuth();
  const { user, isLoaded }       = useUser();
  const [tier, setTier]    = useState("free");
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    (async () => {
      // ── Mode test (réservé aux emails admin) : simuler un compte Free ────────
      if (user) {
        const email         = user.primaryEmailAddress?.emailAddress || "";
        const isAdminEmail  = ADMIN_EMAILS.includes(email);
        const forceFreeTest = user.unsafeMetadata?.force_free_for_test === true;

        if (isAdminEmail && forceFreeTest) {
          try {
            localStorage.setItem("mg360_approved", "true");
            localStorage.setItem("mg360_onboarding_done", "true");
          } catch {}
          if (!cancelled) { setTier("free"); setLoading(false); }
          return;
        }

        // 1. Admin = email Clerk vérifié UNIQUEMENT (plus de code en dur)
        if (isAdminEmail || user.publicMetadata?.role === "admin") {
          setAdminFlags();
          if (!cancelled) { setTier("admin"); setLoading(false); }
          return;
        }
      }

      if (!isSignedIn || !user) {
        if (!cancelled) { setTier("free"); setLoading(false); }
        return;
      }

      // 2. Abonnement Stripe actif (via Clerk metadata, posé par le webhook)
      const meta = user.publicMetadata || {};
      const subscribed = meta.isSubscribed === true ||
                         meta.subscriptionStatus === "active" ||
                         meta.subscriptionStatus === "trialing";
      // Invité validé : flag guestAccess posé dans Clerk par validate-guest.
      // Chemin fiable (lu par useUser, sans RLS ni fetch) — comme un abonné Stripe.
      const guestAccess = meta.guestAccess === true;
      if (subscribed || guestAccess) {
        if (!cancelled) { setTier("paid"); setLoading(false); }
        return;
      }

      // 3. Premium invité — VÉRITÉ SERVEUR via endpoint dédié.
      //    On NE lit PLUS user_access côté client (bloqué par le RLS au rechargement).
      //    Le serveur lit en service_role et nous répond { isGuest: true/false }.
      try {
        const token = await getToken();
        if (token) {
          const res  = await fetch("/api/send?type=guest-status", {
            method:  "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          });
          const data = await res.json();
          if (!cancelled && data?.isGuest) {
            setTier("paid"); setLoading(false);
            return;
          }
        }
      } catch { /* réseau indisponible — on retombe sur free */ }

      if (!cancelled) { setTier("free"); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, isLoaded, user]); // eslint-disable-line

  return {
    tier,
    isAdmin:      tier === "admin",
    isPaid:       tier === "paid" || tier === "admin",
    isFree:       tier === "free",
    isSubscribed: tier === "paid" || tier === "admin",
    isLoading,
  };
}
