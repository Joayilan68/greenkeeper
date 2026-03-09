import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { DAYS_FR, calcArrosage, getWMO } from "../lib/lawn";
import { card, scroll, header } from "../lib/styles";

export default function Week() {
  const { weekWeather, loading } = useWeather();
  const { profile } = useProfile();
  const month = new Date().getMonth() + 1;

  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>Planning Semaine</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>Adapté à la météo en temps réel</div>
      </div>
      <div style={scroll}>
        {!weekWeather.length ? (
          <div style={{ textAlign:"center", padding:40, color:"#81c784" }}>
            {loading ? "🌿 Chargement..." : "Activez la géolocalisation sur l'Accueil pour voir le planning"}
          </div>
        ) : weekWeather.map((day, i) => {
          const d = new Date(day.date);
          const w = getWMO(day.code);
          const a = profile ? calcArrosage(month, profile, day) : null;
          const canTonte = day.precip < 3 && day.wind < 35 && day.temp_max > 8;
          const needArros = a && a.mm > 0 && day.precip < 5;
          const tags = [];
          if (canTonte)   tags.push({ txt:`✂️ Tonte possible`,      bg:"rgba(76,175,80,0.2)" });
          else            tags.push({ txt:`❌ Tonte déconseillée`,   bg:"rgba(211,47,47,0.2)" });
          if (needArros)  tags.push({ txt:`💧 ${a.minutes}min`,      bg:"rgba(25,118,210,0.2)" });
          if (day.precip>=5) tags.push({ txt:`🌧️ ${day.precip}mm`,  bg:"rgba(100,181,246,0.15)" });
          if (day.temp_min<=2) tags.push({ txt:"❄️ Gel possible",     bg:"rgba(144,202,249,0.15)" });
          if (day.temp_max>=30) tags.push({ txt:"🔥 Forte chaleur",   bg:"rgba(245,124,0,0.2)" });

          return (
            <div key={day.date} style={{ ...card(), border: i===0?"1px solid rgba(76,175,80,0.4)":"1px solid rgba(165,214,167,0.1)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:14, color: i===0?"#a5d6a7":"#e8f5e9" }}>
                    {i===0?"Aujourd'hui":i===1?"Demain":DAYS_FR[d.getDay()]}
                  </div>
                  <div style={{ fontSize:11, color:"#81c784" }}>{d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:22 }}>{w.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{Math.round(day.temp_max)}° / {Math.round(day.temp_min)}°</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {tags.map(t => (
                  <span key={t.txt} style={{ background:t.bg, border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600 }}>{t.txt}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
