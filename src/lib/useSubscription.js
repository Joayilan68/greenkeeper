import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
const ADMIN_CODE = "GREENKEEPER2024";
export function useSubscription() {
  const { getToken, isSignedIn } = useAuth();
  const [tier, setTier] = useState("free");
  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    const savedCode = localStorage.getItem("gk_admin_code");
    if (savedCode === ADMIN_CODE) { setTier("admin"); setLoading(false); return; }
    if (!isSignedIn) { setLoading(false); return; }
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/subscription-status", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setTier(data.isSubscribed ? "paid" : "free");
      } catch { setTier("free"); }
      setLoading(false);
    })();
  }, [isSignedIn]);
  const activateAdmin = (code) => {
    if (code.trim().toUpperCase() === ADMIN_CODE) {
      localStorage.setItem("gk_admin_code", ADMIN_CODE);
      setTier("admin"); return true;
    }
    return false;
  };
  return { tier, isAdmin: tier==="admin", isPaid: tier==="paid"||tier==="admin", isFree: tier==="free", isSubscribed: tier==="paid"||tier==="admin", isLoading, activateAdmin };
}