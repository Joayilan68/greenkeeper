// api/weather.js
// Proxy serveur Open-Meteo — licence commerciale (customer-api).
// La clé OPENMETEO_KEY reste côté serveur, jamais exposée au client.
//
// Itération 1 (agronomie) :
//   - Ajout des variables sol/ET₀ (soil_temperature_6cm, soil_moisture_1_3cm,
//     et0_fao_evapotranspiration), agrégées en daily. PREMIUM UNIQUEMENT.
//   - Cache serveur Supabase (table weather_cache), 3 fenêtres/jour, par zone
//     arrondie — protège le quota Open-Meteo.
//
// Principe de non-régression : la structure daily existante est INCHANGÉE.
// Les nouveaux champs (soil_temp, soil_moisture, et0) s'AJOUTENT à daily.
// Tout est défensif : si le cache échoue OU si l'agrégation échoue, on
// retombe sur un appel direct / la donnée de base. Jamais de blocage.

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // sécurité : borne max même si fenêtre longue

// Fenêtre courante (matin / midi / soir) selon l'heure locale serveur.
// Sert de composante de clé de cache : 3 rafraîchissements/jour max par zone.
function currentWindow(date = new Date()) {
  const h = date.getHours();
  if (h >= 6 && h < 12) return "matin";
  if (h >= 12 && h < 18) return "midi";
  return "soir";
}

// Fin de la fenêtre courante → sert à calculer expires_at.
function windowExpiry(date = new Date()) {
  const d = new Date(date);
  const h = d.getHours();
  if (h >= 6 && h < 12) { d.setHours(12, 0, 0, 0); return d; }
  if (h >= 12 && h < 18) { d.setHours(18, 0, 0, 0); return d; }
  // soir : jusqu'au lendemain 6h (ou aujourd'hui 6h si on est entre 0h et 6h)
  if (h >= 18) { d.setDate(d.getDate() + 1); d.setHours(6, 0, 0, 0); return d; }
  d.setHours(6, 0, 0, 0); return d;
}

// Clé de cache : zone arrondie à 2 décimales (~1 km) + fenêtre + mode premium.
// Le mode premium fait partie de la clé car la charge utile diffère
// (premium = avec sol/ET₀ ; free = daily de base seulement).
function buildCacheKey(lat, lon, isPremium) {
  const rlat = Number(lat).toFixed(2);
  const rlon = Number(lon).toFixed(2);
  return `${rlat}_${rlon}_${currentWindow()}_${isPremium ? "p" : "f"}`;
}

// Client Supabase (service_role, côté serveur). Renvoie null si indisponible
// → déclenche le fallback "sans cache" plutôt qu'une erreur.
function getSupabase() {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  } catch {
    return null;
  }
}

// Agrège les séries horaires Open-Meteo en valeurs quotidiennes alignées
// sur daily.time. Défensif : toute donnée manquante → null pour ce jour,
// jamais d'exception qui casserait la réponse.
function aggregateHourlyToDaily(data) {
  try {
    const daily = data?.daily;
    const hourly = data?.hourly;
    if (!daily?.time || !hourly?.time) return data;

    const soilSrc = hourly.soil_temperature_6cm;
    const moistSrc = hourly.soil_moisture_1_3cm;
    const et0Src = hourly.et0_fao_evapotranspiration;

    // Rien à agréger (cas free ou variables absentes) → renvoyer tel quel.
    if (!soilSrc && !moistSrc && !et0Src) return data;

    // Regroupe les index horaires par jour (préfixe date ISO "YYYY-MM-DD").
    const idxByDay = {};
    hourly.time.forEach((t, i) => {
      const day = String(t).slice(0, 10);
      (idxByDay[day] = idxByDay[day] || []).push(i);
    });

    const soilTemp = [];
    const soilMoist = [];
    const et0 = [];

    daily.time.forEach((day) => {
      const idxs = idxByDay[day] || [];

      // Moyenne du sol (ignore les null/NaN).
      if (soilSrc) {
        const vals = idxs.map(i => soilSrc[i]).filter(v => typeof v === "number" && !isNaN(v));
        soilTemp.push(vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null);
      }
      // Moyenne de l'humidité sol.
      if (moistSrc) {
        const vals = idxs.map(i => moistSrc[i]).filter(v => typeof v === "number" && !isNaN(v));
        soilMoist.push(vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000 : null);
      }
      // Somme de l'ET₀ (cumul journalier).
      if (et0Src) {
        const vals = idxs.map(i => et0Src[i]).filter(v => typeof v === "number" && !isNaN(v));
        et0.push(vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100 : null);
      }
    });

    if (soilSrc) daily.soil_temp = soilTemp;
    if (moistSrc) daily.soil_moisture = soilMoist;
    if (et0Src) daily.et0 = et0;

    // On retire le bloc hourly de la réponse renvoyée au client : lourd et inutile
    // côté front (l'app lit daily). Réduit la taille de la réponse et du cache.
    delete data.hourly;
    delete data.hourly_units;

    return data;
  } catch (e) {
    console.error("weather.js aggregate:", e.message);
    return data; // en cas de souci, on renvoie la donnée brute (daily intact)
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const lat = req.query.lat;
  const lon = req.query.lon;
  // Premium piloté par le client (Option B). Par défaut : free.
  const isPremium = req.query.premium === "true" || req.query.premium === "1";

  if (!lat || !lon) {
    return res.status(400).json({ error: "Paramètres lat et lon requis" });
  }

  const apiKey = process.env.OPENMETEO_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Clé Open-Meteo non configurée" });
  }

  const cacheKey = buildCacheKey(lat, lon, isPremium);
  const supabase = getSupabase();

  // ── 1. Tentative de lecture du cache (best-effort, jamais bloquant) ────────
  if (supabase) {
    try {
      const { data: row } = await supabase
        .from("weather_cache")
        .select("data, expires_at")
        .eq("cache_key", cacheKey)
        .maybeSingle();

      if (row && row.expires_at && new Date(row.expires_at) > new Date() && row.data) {
        return res.status(200).json({ ...row.data, cached: true });
      }
    } catch (e) {
      console.error("weather.js cache read:", e.message);
      // on continue : appel direct
    }
  }

  // ── 2. Appel Open-Meteo réel ───────────────────────────────────────────────
  try {
    let url =
      `https://customer-api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,relative_humidity_2m_mean,windspeed_10m_max` +
      `&timezone=auto` +
      `&forecast_days=7`;

    // PREMIUM UNIQUEMENT : on ajoute les variables agronomiques horaires.
    // Free → aucune donnée sol/ET₀ tirée (économie de quota et de charge).
    if (isPremium) {
      url += `&hourly=soil_temperature_6cm,soil_moisture_1_3cm,et0_fao_evapotranspiration`;
    }

    url += `&apikey=${encodeURIComponent(apiKey)}`;

    const r = await fetch(url);

    if (!r.ok) {
      const detail = await r.text();
      console.error("Open-Meteo error:", r.status, detail);
      return res.status(502).json({ error: "Erreur Open-Meteo", status: r.status });
    }

    let data = await r.json();

    // Agrégation sol/ET₀ → daily (no-op si free ou variables absentes).
    if (isPremium) {
      data = aggregateHourlyToDaily(data);
    }

    // ── 3. Écriture du cache (best-effort, jamais bloquant) ──────────────────
    if (supabase) {
      try {
        const now = new Date();
        let expires = windowExpiry(now);
        // borne de sécurité : jamais plus de CACHE_TTL_MS
        const maxExpiry = new Date(now.getTime() + CACHE_TTL_MS);
        if (expires > maxExpiry) expires = maxExpiry;

        await supabase.from("weather_cache").upsert({
          cache_key: cacheKey,
          data,
          fetched_at: now.toISOString(),
          expires_at: expires.toISOString(),
        }, { onConflict: "cache_key" });
      } catch (e) {
        console.error("weather.js cache write:", e.message);
        // pas grave : la réponse part quand même
      }
    }

    return res.status(200).json({ ...data, cached: false });
  } catch (e) {
    console.error("weather.js:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
