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
  const { isSignedIn }     = useAuth();
  const { user, isLoaded } = useUser();
  const [tier, setTier]    = useState("free");
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    (async () => {
      // ── Mode test (réservé aux emails admin) : simuler un compte Free ────────
      // Activer  : window.Clerk.user.update({ unsafeMetadata: { force_free_for_test: true } })
      // Désactiver : ...force_free_for_test: false
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
      if (subscribed) {
        if (!cancelled) { setTier("paid"); setLoading(false); }
        return;
      }

      // 3. Premium invité — VÉRITÉ SERVEUR : user_access.status === "guest"
      //    Lecture scopée par RLS (chacun ne lit que sa propre ligne).
      try {
        const { supabase } = await import("./supabase");
        const { data, error } = await supabase
          .from("user_access")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();

        // ── DIAGNOSTIC TEMPORAIRE — à retirer une fois la cause comprise ──
        console.log("[MG360][guest-check] user_id:", user.id,
                    "| data:", data,
                    "| error:", error ? `${error.code || ""} ${error.message}` : "aucune");

        if (!cancelled && data?.status === "guest") {
          setTier("paid"); setLoading(false);
          return;
        }
      } catch (e) {
        console.log("[MG360][guest-check] EXCEPTION:", e.message);
      }

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
