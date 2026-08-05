// api/weather.js
// Proxy serveur Open-Meteo — licence commerciale (customer-api).
// La clé OPENMETEO_KEY reste côté serveur, jamais exposée au client.
// Phase A : mêmes champs daily qu'avant, aucune donnée nouvelle.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const lat = req.query.lat;
  const lon = req.query.lon;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Paramètres lat et lon requis" });
  }

  const apiKey = process.env.OPENMETEO_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Clé Open-Meteo non configurée" });
  }

  try {
    const url =
      `https://customer-api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,relative_humidity_2m_mean,windspeed_10m_max` +
      `&timezone=auto` +
      `&forecast_days=7` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const r = await fetch(url);

    if (!r.ok) {
      const detail = await r.text();
      console.error("Open-Meteo error:", r.status, detail);
      return res.status(502).json({ error: "Erreur Open-Meteo", status: r.status });
    }

    const data = await r.json();
    // Renvoie le JSON brut Open-Meteo tel quel :
    // WeatherContext lit d.daily exactement comme avant.
    return res.status(200).json(data);
  } catch (e) {
    console.error("weather.js:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
