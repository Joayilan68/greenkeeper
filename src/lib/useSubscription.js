// src/lib/useSubscription.js
import { useState, useEffect, useCallback } from "react";
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

  // ── Calcul du tier (logique inchangée) — renvoie "admin" | "paid" | "free" ──
  //    Aucune écriture d'état ici : permet de l'appeler depuis le useEffect ET
  //    depuis refresh() sans dupliquer la logique.
  const computeTier = useCallback(async () => {
    if (user) {
      const email         = user.primaryEmailAddress?.emailAddress || "";
      const isAdminEmail  = ADMIN_EMAILS.includes(email);
      const forceFreeTest = user.unsafeMetadata?.force_free_for_test === true;

      // Mode test (réservé aux emails admin) : simuler un compte Free
      if (isAdminEmail && forceFreeTest) {
        try {
          localStorage.setItem("mg360_approved", "true");
          localStorage.setItem("mg360_onboarding_done", "true");
        } catch {}
        return "free";
      }

      // 1. Admin = email Clerk vérifié UNIQUEMENT (plus de code en dur)
      if (isAdminEmail || user.publicMetadata?.role === "admin") {
        setAdminFlags();
        return "admin";
      }
    }

    if (!isSignedIn || !user) return "free";

    // 2. Premium via Clerk metadata (Stripe OU invité validé).
    //    On force user.reload() pour récupérer un guestAccess fraîchement posé
    //    côté serveur : sinon la session garde l'ancien publicMetadata en cache.
    let meta = user.publicMetadata || {};
    const subscribed = meta.isSubscribed === true ||
                       meta.subscriptionStatus === "active" ||
                       meta.subscriptionStatus === "trialing";
    let guestAccess = meta.guestAccess === true;

    if (!subscribed && !guestAccess && typeof user.reload === "function") {
      try {
        await user.reload();
        meta = user.publicMetadata || {};
        guestAccess = meta.guestAccess === true;
      } catch { /* reload impossible — on garde la valeur en cache */ }
    }

    if (subscribed || guestAccess) return "paid";

    // 3. Premium invité — VÉRITÉ SERVEUR via endpoint dédié (fallback).
    //    On NE lit PLUS user_access côté client (bloqué par le RLS au rechargement).
    try {
      const token = await getToken();
      if (token) {
        const res  = await fetch("/api/send?type=guest-status", {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.isGuest) return "paid";
      }
    } catch { /* réseau indisponible — on retombe sur free */ }

    return "free";
  }, [isSignedIn, user, getToken]);

  // ── Au montage / changement d'utilisateur ────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      const t = await computeTier();
      if (!cancelled) { setTier(t); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, computeTier]);

  // ── refresh() : recalcule le tier à la demande, SANS recharger la page.
  //    Utilisé après validation d'un code invité pour basculer en Premium en douceur.
  const refresh = useCallback(async () => {
    const t = await computeTier();
    setTier(t);
    return t;
  }, [computeTier]);

  return {
    tier,
    isAdmin:      tier === "admin",
    isPaid:       tier === "paid" || tier === "admin",
    isFree:       tier === "free",
    isSubscribed: tier === "paid" || tier === "admin",
    isLoading,
    refresh,
  };
}
