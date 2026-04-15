// src/lib/useSubscription.js
import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

const ADMIN_CODE = "GREENKEEPER2024";

export function useSubscription() {
  const { isSignedIn }     = useAuth();
  const { user, isLoaded } = useUser();
  const [tier, setTier]    = useState("free");
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Admin via localStorage (code secret)
    const savedCode = localStorage.getItem("gk_admin_code");
    if (savedCode === ADMIN_CODE) {
      setTier("admin"); setLoading(false); return;
    }

    if (!isLoaded) return;
    if (!isSignedIn || !user) { setTier("free"); setLoading(false); return; }

    // 2. Lire les publicMetadata Clerk
    const meta = user.publicMetadata || {};

    // Role admin → tier admin (accès complet)
    if (meta.role === "admin") {
      setTier("admin"); setLoading(false); return;
    }

    // isSubscribed → tier paid
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
