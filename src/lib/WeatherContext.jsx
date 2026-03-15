import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { computeAlerts } from "./lawn";

export const WeatherContext = createContext(null);

export function WeatherProvider({ children }) {
  const [location, setLocation] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gk_location")) || null; } catch { return null; }
  });
  const [locationName, setLocName] = useState(() => localStorage.getItem("gk_location_name") || "");
  const [weather, setWeather]     = useState(null);
  const [weekWeather, setWeek]    = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError]         = useState(null);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) { setError("Non supporté"); return; }
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
          const name = d.address?.city || d.address?.town || d.address?.village || "";
          setLocName(name);
          localStorage.setItem("gk_location_name", name);
        } catch {}
        setLocLoading(false);
      },
      (err) => { setError(err.message); setLocLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const refreshLocation = useCallback(() => {
    localStorage.removeItem("gk_location");
    localStorage.removeItem("gk_location_name");
    setLocation(null);
    setLocName("");
    fetchLocation();
  }, [fetchLocation]);

  // Auto-fetch location on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  // Fetch weather when location changes
  useEffect(() => {
    if (!location) return;
    setLoading(true);
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
      .catch(() => setLoading(false));
  }, [location]);

  return (
    <WeatherContext.Provider value={{
      location, locationName, weather, weekWeather, alerts,
      loading, locLoading, error, fetchLocation, refreshLocation
    }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) return {
    location: null, locationName: "", weather: null, weekWeather: [],
    alerts: [], loading: false, locLoading: false, error: null,
    fetchLocation: () => {}, refreshLocation: () => {}
  };
  return context;
}