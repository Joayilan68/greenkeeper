import { createContext, useContext, useState, useEffect } from "react";
import { computeAlerts } from "./lawn";

const WeatherContext = createContext(null);

export function WeatherProvider({ children, isPaid }) {
  const [location, setLocation]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("gk_location")) || null; } catch { return null; }
  });
  const [locationName, setLocName]  = useState(() => localStorage.getItem("gk_location_name") || "");
  const [weather, setWeather]       = useState(null);
  const [weekWeather, setWeek]      = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError]           = useState(null);

  // Auto-geolocate on mount — Premium uniquement
  // (demande permission GPS visible → réservé aux abonnés)
  useEffect(() => {
    if (!isPaid) return;
    if (location) return; // already have location
    fetchLocation();
  }, [isPaid]);

  // Fetch météo dès qu'une localisation est disponible — TOUS les utilisateurs
  // L'affichage reste Premium (Today.jsx, MyLawn.jsx) mais les données de blocage
  // (pluie, gel, vent) sont nécessaires pour buildActions() même en Free
  useEffect(() => {
    if (!location) return; // pas de location = pas de fetch (normal)
    fetchWeather(location);
  }, [location]); // eslint-disable-line

  const fetchLocation = () => {
    if (!navigator.geolocation) { setError("Géolocalisation non supportée"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const loc = { lat, lon };
        setLocation(loc);
        localStorage.setItem("gk_location", JSON.stringify(loc));
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const d = await r.json();
          const name = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "";
          setLocName(name);
          localStorage.setItem("gk_location_name", name);
        } catch {}
        setLocLoading(false);
      },
      () => { setError("Permission géolocalisation refusée"); setLocLoading(false); }
    );
  };

  const fetchWeather = async (loc) => {
    setLoading(true); setError(null);
    const { lat, lon } = loc;
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,relative_humidity_2m_mean,windspeed_10m_max&timezone=auto&forecast_days=7`);
      const d = await r.json();
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
    } catch { setError("Erreur météo"); }
    setLoading(false);
  };

  const refreshLocation = () => {
    localStorage.removeItem("gk_location");
    localStorage.removeItem("gk_location_name");
    setLocation(null);
    setLocName("");
    fetchLocation();
  };

  return (
    <WeatherContext.Provider value={{
      location, locationName, weather, weekWeather, alerts,
      loading, locLoading, error, fetchLocation, refreshLocation, isPaid
    }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  return useContext(WeatherContext);
}
