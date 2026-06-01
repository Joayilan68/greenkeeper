// src/lib/useUTMCapture.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook qui capture les UTM parameters et le referer dès l'arrivée sur le site.
// Stocke le tout en sessionStorage pour que useUTMInjection puisse les pousser
// dans Clerk unsafeMetadata une fois le user authentifié.
//
// Stratégie FIRST-TOUCH : si une capture existe déjà en sessionStorage,
// on ne l'écrase pas (même session de navigation = première source gagne).
//
// Détection de la source :
//   1. utm_source explicite (priorité absolue)
//   2. Sinon, mapping depuis document.referrer (instagram.com → instagram, etc.)
//   3. Sinon "direct"
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";

const STORAGE_KEY = "mg360_utm_capture";

// ── Map des referers → sources normalisées ───────────────────────────────────
const REFERER_MAP = [
  { match: /instagram\.com/i,       source: "instagram" },
  { match: /tiktok\.com/i,          source: "tiktok"    },
  { match: /facebook\.com|fb\.com/i,source: "facebook"  },
  { match: /(twitter|x)\.com/i,     source: "twitter"   },
  { match: /youtube\.com|youtu\.be/i, source: "youtube" },
  { match: /linkedin\.com/i,        source: "linkedin"  },
  { match: /google\./i,             source: "google"    },
  { match: /bing\./i,               source: "google"    },
  { match: /duckduckgo\./i,         source: "google"    },
  { match: /mail\.|gmail|outlook|yahoo/i, source: "email" },
];

function normalizeSource(rawSource) {
  if (!rawSource) return null;
  const s = String(rawSource).toLowerCase().trim();
  if (["ig", "insta"].includes(s)) return "instagram";
  if (["fb", "meta"].includes(s))  return "facebook";
  if (["tt"].includes(s))          return "tiktok";
  if (["yt"].includes(s))          return "youtube";
  if (["x", "tw"].includes(s))     return "twitter";
  if (["li"].includes(s))          return "linkedin";
  const known = ["instagram","tiktok","facebook","twitter","youtube","google","email","linkedin","direct"];
  if (known.includes(s)) return s;
  return s;
}

function detectSourceFromReferer(referer) {
  if (!referer) return "direct";
  for (const { match, source } of REFERER_MAP) {
    if (match.test(referer)) return source;
  }
  return "autre";
}

// ── API publique ─────────────────────────────────────────────────────────────
export function getCapturedUTM() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    source:      "direct",
    medium:      "",
    campaign:    "",
    referer:     "",
    landingPath: "",
    capturedAt:  new Date().toISOString(),
  };
}

export function clearCapturedUTM() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

// ── Hook principal ───────────────────────────────────────────────────────────
export function useUTMCapture() {
  useEffect(() => {
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (existing) return;

      const params  = new URLSearchParams(window.location.search);
      const referer = document.referrer || "";

      let source = normalizeSource(params.get("utm_source"));
      if (!source) source = detectSourceFromReferer(referer);

      const capture = {
        source,
        medium:      params.get("utm_medium")   || "",
        campaign:    params.get("utm_campaign") || "",
        referer,
        landingPath: window.location.pathname + window.location.search,
        capturedAt:  new Date().toISOString(),
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(capture));
      console.log("[MG360 UTM] Capture first-touch:", capture);
    } catch (e) {
      console.warn("[MG360 UTM] capture failed:", e?.message);
    }
  }, []);
}
