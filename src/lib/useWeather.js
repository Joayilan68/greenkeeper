// This file re-exports useWeather from the global context
// All components import from here for backward compatibility
import { useContext } from "react";
import { WeatherContext } from "./WeatherContext";

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) return {
    location: null, locationName: "", weather: null, weekWeather: [],
    alerts: [], loading: false, locLoading: false, error: null,
    fetchLocation: () => {}, refreshLocation: () => {}, isPaid: false
  };
  return context;
}
