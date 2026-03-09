export const MONTHLY_PLAN = {
  1:  { tonte:"Aucune", engrais:null, verticut:false, arrosage_base:0, aeration:false, label:"Repos hivernal" },
  2:  { tonte:"35 mm si repousse", engrais:null, verticut:false, arrosage_base:3, aeration:true, label:"Réveil de la pelouse" },
  3:  { tonte:"30 mm · 1-2x/sem", engrais:"NPK 12-5-5 organo-minéral · 30-40 g/m²", verticut:false, arrosage_base:10, aeration:true, label:"Reprise printanière" },
  4:  { tonte:"25-30 mm · 2x/sem", engrais:"NPK 15-5-10 · 30-40 g/m²", verticut:true, arrosage_base:13, aeration:false, label:"Croissance active" },
  5:  { tonte:"25 mm · 2-3x/sem", engrais:"NPK 15-5-10 · 30 g/m²", verticut:true, arrosage_base:15, aeration:false, label:"Pleine saison" },
  6:  { tonte:"28-30 mm · 2x/sem", engrais:"NPK 10-5-15 équilibré · 25-30 g/m²", verticut:true, arrosage_base:17, aeration:false, label:"Surveillance chaleur" },
  7:  { tonte:"30-35 mm · 1-2x/sem", engrais:"NPK 8-0-20 riche K · 20-25 g/m²", verticut:false, arrosage_base:22, aeration:false, label:"Protection estivale" },
  8:  { tonte:"30-35 mm · 1-2x/sem", engrais:"NPK 8-0-20 · 20 g/m²", verticut:false, arrosage_base:20, aeration:false, label:"Stress hydrique" },
  9:  { tonte:"28-30 mm · 1-2x/sem", engrais:"NPK 5-10-25 automne · 40 g/m²", verticut:false, arrosage_base:16, aeration:true, label:"Rénovation automnale" },
  10: { tonte:"30 mm · 1x/sem", engrais:null, verticut:false, arrosage_base:10, aeration:false, label:"Préparation hiver" },
  11: { tonte:"35 mm si pousse", engrais:"Chaux magnésienne si pH<6 · 150-200 g/m²", verticut:false, arrosage_base:0, aeration:false, label:"Fin de saison" },
  12: { tonte:"Aucune", engrais:null, verticut:false, arrosage_base:0, aeration:false, label:"Repos complet" },
};

export const MONTHS_FR = ["","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
export const DAYS_FR = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

export const SOIL_COEFF   = { argileux:0.8, limoneux:1.0, sableux:1.3, calcaire:1.1 };
export const LAWN_COEFF   = { ornement:1.2, sport:1.4, rustique:0.8, "ombre-semi-ombre":0.9 };

export function calcArrosage(month, profile, weather) {
  const base = MONTHLY_PLAN[month]?.arrosage_base ?? 0;
  if (base === 0) return null;
  const soil = SOIL_COEFF[profile?.sol] ?? 1;
  const lawn = LAWN_COEFF[profile?.pelouse] ?? 1;
  let mm = base * soil * lawn;
  if (weather) {
    if (weather.temp_max > 30) mm *= 1.3;
    else if (weather.temp_max > 25) mm *= 1.15;
    if (weather.precip > 5) mm = Math.max(0, mm - weather.precip * 0.8);
    if (weather.humidity > 80) mm *= 0.85;
  }
  mm = Math.round(mm * 10) / 10;
  const minutes = Math.round((mm / 10) * 60);
  return { mm, minutes };
}

export function getWMO(code) {
  if (code === 0) return { label:"Ciel dégagé", icon:"☀️" };
  if (code <= 3)  return { label:"Partiellement nuageux", icon:"⛅" };
  if (code <= 49) return { label:"Brouillard", icon:"🌫️" };
  if (code <= 59) return { label:"Bruine", icon:"🌦️" };
  if (code <= 69) return { label:"Pluie", icon:"🌧️" };
  if (code <= 79) return { label:"Neige", icon:"❄️" };
  if (code <= 84) return { label:"Averses", icon:"🌦️" };
  if (code <= 99) return { label:"Orages", icon:"⛈️" };
  return { label:"Variable", icon:"🌡️" };
}

export function computeAlerts(days) {
  const alerts = [];
  if (!days?.length) return alerts;
  const d = days[0];
  if (d.temp_min <= 2)  alerts.push({ type:"danger",  msg:"⚠️ Risque de gel cette nuit — ne pas marcher sur le gazon !" });
  if (d.temp_max >= 33) alerts.push({ type:"warning", msg:"🔥 Canicule — arrosage renforcé, éviter la tonte" });
  if (d.precip >= 8)    alerts.push({ type:"info",    msg:"🌧️ Forte pluie prévue — arrosage inutile aujourd'hui" });
  if (d.wind >= 40)     alerts.push({ type:"warning", msg:"💨 Vents forts — reporter la tonte" });
  const gelProchain = days.slice(1,3).some(x => x.temp_min <= 0);
  if (gelProchain && !alerts.find(a => a.msg.includes("gel")))
    alerts.push({ type:"info", msg:"❄️ Gel prévu dans les 3 prochains jours" });
  return alerts;
}
