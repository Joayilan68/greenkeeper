// src/lib/useSubscription.js
// ─────────────────────────────────────────────────────────────────────────────
// Lit isSubscribed depuis les publicMetadata Clerk (écrites par le webhook Stripe)
// Zéro appel API — lecture directe du token JWT
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

const ADMIN_CODE = "GREENKEEPER2024";

export function useSubscription() {
  const { isSignedIn }    = useAuth();
  const { user, isLoaded } = useUser();
  const [tier, setTier]    = useState("free");
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    // Admin via localStorage
    const savedCode = localStorage.getItem("gk_admin_code");
    if (savedCode === ADMIN_CODE) {
      setTier("admin"); setLoading(false); return;
    }

    if (!isLoaded) return; // attendre que Clerk soit prêt
    if (!isSignedIn || !user) { setTier("free"); setLoading(false); return; }

    // Lire isSubscribed depuis les publicMetadata Clerk
    // Écrites par webhook.js à chaque événement Stripe
    const meta = user.publicMetadata || {};
    const subscribed = meta.isSubscribed === true ||
                       meta.subscriptionStatus === "active" ||
                       meta.subscriptionStatus === "trialing";

    setTier(subscribed ? "paid" : "free");
    setLoading(false);
  }, [isSignedIn, isLoaded, user]);

  const activateAdmin = (code) => {
    if (code.trim().toUpperCase() === ADMIN_CODE) {
      localStorage.setItem("gk_admin_code", ADMIN_CODE);
      setTier("admin");
      return true;
    }
    return false;
  };

  return {
    tier,
    isAdmin:      tier === "admin",
    isPaid:       tier === "paid" || tier === "admin",
    isFree:       tier === "free",
    isSubscribed: tier === "paid" || tier === "admin",
    isLoading,
    activateAdmin,
  };
}
