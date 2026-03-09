import { useState, useEffect } from "react";

const KEY = "gk_profile_v1";

export function useProfile() {
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  });

  const saveProfile = (p) => {
    setProfile(p);
    localStorage.setItem(KEY, JSON.stringify(p));
  };

  return { profile, saveProfile };
}
