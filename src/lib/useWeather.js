import { useState, useEffect, useCallback } from "react";
import { computeAlerts } from "./lawn";

export function useWeather() {
  const [location, setLocation]       = useState(null);
  const [locationName, setLocName]    = useState("");
  const [weather, setWeather]         = useState(null);   // today
  const [weekWeather, setWeek]        = useState([]);
  const [alerts, setAlerts]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [locLoading, setLocLoading]   = useState(false);
  const [error, setError]             = useState(null);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) { setError("Géolocalisation non supportée"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLocation({ lat, lon });
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const d = await r.json();
          setLocName(d.address?.city || d.address?.town || d.address?.village || d.address?.county || "");
        } catch {}
        setLocLoading(false);
      },
      () => { setError("Permission géolocalisation refusée"); setLocLoading(false); }
    );
  }, []);

  useEffect(() => {
    if (!location) return;
    setLoading(true); setError(null);
    const { lat, lon } = location;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,relative_humidity_2m_mean,windspeed_10m_max&timezone=auto&forecast_days=7`)
      .then(r => r.json())
      .then(d => {
        const daily = d.daily;
        const days = daily.time.map((date, i) => ({
          date,
          temp_max:  daily.temperature_2m_max[i],
          temp_min:  daily.temperature_2m_min[i],
          precip:    daily.precipitation_sum[i],
          code:      daily.weathercode[i],
          humidity:  daily.relative_humidity_2m_mean[i],
          wind:      daily.windspeed_10m_max[i],
        }));
        setWeek(days);
        setWeather(days[0]);
        setAlerts(computeAlerts(days));
        setLoading(false);
      })
      .catch(() => { setError("Erreur météo"); setLoading(false); });
  }, [location]);

  return { location, locationName, weather, weekWeather, alerts, loading, locLoading, error, fetchLocation };
}
