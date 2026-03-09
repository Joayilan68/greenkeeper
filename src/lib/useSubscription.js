import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useSubscription() {
  const { getToken, isSignedIn } = useAuth();
  const [isSubscribed, setSubscribed] = useState(false);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/subscription-status", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSubscribed(data.isSubscribed);
      } catch {
        setSubscribed(false);
      }
      setLoading(false);
    })();
  }, [isSignedIn]);

  return { isSubscribed, isLoading };
}
