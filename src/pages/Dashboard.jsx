import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO } from "../lib/lawn";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, pill, btn, scroll, header } from "../lib/styles";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { weather, locationName, alerts = [], loading, locLoading, refreshLocation } = useWeather() || {};
  const { profile } = useProfile();
  const { history } = useHistory();
  const { isPaid = false, isAdmin = false } = useSubscription() || {};

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];

  return (
    <div>
      <div style={{ ...header, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", paddingRight:4, marginBottom:8 }}>
          <div style={{ fontSize:11, color:"#81c784" }}>
            {today.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
          </div>
          <UserButton appearance={{ variables: { colorPrimary:"#43a047" } }} />
        </div>
        <div style={{ fontSize:24, fontWeight:800, color:"#a5d6a7" }}>
          Bonjour {user?.firstName || ""} 👋
        </div>
        {isAdmin && <div style={{ fontSize:11, color:"#f9a825", marginTop:2 }}>👑 Mode Admin</div>}
      </div>

      <div style={scroll}>

        {/* SCORE */}
        <div style={{ ...card(), textAlign:"center", padding:24 }}>
          <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1, marginBottom:8 }}>🌿 SCORE SANTÉ DU GAZON</div>
          <div style={{ fontSize:64, fontWeight:800, color:"#43a047" }}>72</div>
          <div style={{ fontSize:14, color:"#43a047", fontWeight:700 }}>Bon</div>
          <div style={{ fontSize:12, color:"#81c784", marginTop:6 }}>Score dynamique — bientôt actif</div>
        </div>

        {/* ALERTES */}
        {isPaid && alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}

        {/* MÉTÉO */