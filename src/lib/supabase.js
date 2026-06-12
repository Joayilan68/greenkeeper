// src/lib/supabase.js — Client Supabase centralisé Mongazon360
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[MG360] Supabase env vars manquantes — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

// ── Intégration native Clerk ↔ Supabase (third-party auth) ───────────────────
// Le token de session Clerk est transmis à chaque requête Supabase, qui le valide
// via le provider Clerk configuré dans le dashboard (instance Production —
// domaine clerk.mongazon360.fr). Côté base : auth.jwt() ->> 'sub' = ID Clerk.
// NB : getToken() est appelé SANS argument 'template' (l'ancienne méthode
// getToken({ template: 'supabase' }) est la voie dépréciée — ne pas l'utiliser).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  accessToken: async () => {
    try {
      return (await window.Clerk?.session?.getToken()) ?? null;
    } catch {
      return null;
    }
  },
});
