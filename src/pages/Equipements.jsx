import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { card, scroll } from "../lib/styles";
import { useEquipements } from "../lib/useEquipements";
import { useProfile } from "../lib/useProfile";
import { hasRobotTondeuse, hasArrosageAuto } from "../lib/planEntretien";
import CarteRobot from "../components/CarteRobot";
import CarteArrosage from "../components/CarteArrosage";

const nombre = (v, u) => typeof v === "number" ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${u}` : "—";
const champ = { width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"9px 10px", color:"#e8f5e9", fontSize:12, marginTop:4 };
const bouton = { background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", border:"none", borderRadius:10, padding:"10px 16px", fontSize:13, fontWeight:800, cursor:"pointer" };

// Retours des connexions chez le fabricant (api/objets.js → /equipements?husqvarna=…, ?gardena=…, ?netatmo=…)
const EXPIRE = "La connexion a pris trop de temps, recommence.";
const REFUS = "Connexion annulée : rien n'a été enregistré.";
const RETOURS_HUSQVARNA = {
  ok: "✅ Robot connecté : « Aujourd'hui » te proposera de le mettre au repos ou de le relancer selon la météo et tes conseils.",
  aucun: "Aucun robot trouvé sur ce compte Husqvarna.",
  expire: EXPIRE, refus: REFUS,
  erreur: "La connexion Husqvarna a échoué, réessaie plus tard.",
};
const RETOURS_NETATMO = {
  ok: "✅ Station Netatmo connectée : la pluie tombée, la température et le vent mesurés chez toi remplacent les prévisions de la journée.",
  aucun: "Aucune station météo trouvée sur ce compte Netatmo.",
  expire: EXPIRE, refus: REFUS,
  erreur: "La connexion Netatmo a échoué, réessaie plus tard.",
};

// Gardena : même compte Husqvarna Group (?gardena=… pour l'arrosage, ?gardena_robot=… pour le robot)
const ECHECS_GARDENA = {
  expire: EXPIRE, refus: REFUS,
  erreur: "La connexion Gardena a échoué : l'accès Gardena n'est peut-être pas encore ouvert, réessaie plus tard.",
};
const TOUT_GARDENA = "✅ Arrosage et robot Gardena connectés : « Aujourd'hui » te proposera d'arroser à la bonne dose le matin, de suspendre les programmes quand il pleut, et de mettre ton robot au repos ou de le relancer.";
const RETOURS_GARDENA = {
  ok: "✅ Arrosage Gardena connecté : « Aujourd'hui » te proposera d'arroser à la bonne dose le matin, ou de suspendre les programmes quand il pleut.",
  ok_tout: TOUT_GARDENA,
  aucun: "Aucun programmateur Gardena trouvé sur ce compte.",
  ...ECHECS_GARDENA,
};
const RETOURS_GARDENA_ROBOT = {
  ok: "✅ Robot Gardena connecté : « Aujourd'hui » te proposera de le mettre au repos ou de le relancer selon la météo et tes conseils.",
  ok_tout: TOUT_GARDENA,
  aucun: "Aucun robot Gardena trouvé sur ce compte.",
  ...ECHECS_GARDENA,
};

const A_VENIR = [
  { icone:"📷", titre:"Caméra", texte:"Une photo de ta pelouse chaque semaine, analysée comme un diagnostic." },
];
const NOMS_STATION = { netatmo:"Netatmo", ecowitt:"Ecowitt", davis:"Davis" };
const NOMS_ROBOT = { husqvarna:"Husqvarna Automower", gardena:"Gardena SILENO", mammotion:"Mammotion" };
const lien = { background:"none", border:"none", padding:0, color:"#81c784", fontSize:11, cursor:"pointer", textDecoration:"underline" };

// Mes équipements (depuis Mon Gazon) : station météo Netatmo, Ecowitt ou Davis, robot Husqvarna, Gardena ou Mammotion et
// arrosage Gardena ou Rachio connectés ; caméras à venir
export default function Equipements() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { profile, saveProfile } = useProfile();
  const { donnees, erreur, setErreur, envoi, charger, action } = useEquipements();
  const [cles, setCles] = useState({ applicationKey:"", apiKey:"" });
  const [stations, setStations] = useState(null);
  const [clesDavis, setClesDavis] = useState({ apiKey:"", apiSecret:"" });
  const [stationsDavis, setStationsDavis] = useState(null);
  const [idsMammotion, setIdsMammotion] = useState({ clientId:"", clientSecret:"" });
  const retourHq = RETOURS_HUSQVARNA[params.get("husqvarna")] || RETOURS_GARDENA[params.get("gardena")]
    || RETOURS_GARDENA_ROBOT[params.get("gardena_robot")] || RETOURS_NETATMO[params.get("netatmo")];
  const [cleRachio, setCleRachio] = useState("");
  const [programmateurs, setProgrammateurs] = useState(null);

  const chercher = async () => {
    const d = await action({ action:"stations", ...cles });
    if (!d) return;
    setStations(d.stations);
    if (!d.stations.length) setErreur("Aucune station météo sur ce compte Ecowitt.");
  };
  const connecter = async (s) => {
    if (!await action({ action:"ajouter", ...cles, mac: s.mac, nom: s.nom })) return;
    setCles({ applicationKey:"", apiKey:"" }); setStations(null); charger();
  };
  const retirer = async (id) => { if (await action({ action:"retirer", id })) charger(); };
  // Connexion sur le site du fabricant (husqvarna, gardena, gardena_robot, netatmo), qui revient sur cette page
  const connexion = async (objet) => {
    const d = await action({ action: objet });
    if (d?.url) window.location.href = d.url;
  };
  const chercherRachio = async () => {
    const d = await action({ action:"rachio_programmateurs", apiKey: cleRachio });
    if (!d) return;
    setProgrammateurs(d.programmateurs);
    if (!d.programmateurs.length) setErreur("Aucun programmateur sur ce compte Rachio.");
  };
  const connecterRachio = async (p) => {
    if (!await action({ action:"rachio", apiKey: cleRachio, programmateur: p.id })) return;
    setCleRachio(""); setProgrammateurs(null); charger();
  };
  const chercherDavis = async () => {
    const d = await action({ action:"davis_stations", ...clesDavis });
    if (!d) return;
    setStationsDavis(d.stations);
    if (!d.stations.length) setErreur("Aucune station sur ce compte WeatherLink.");
  };
  const connecterDavis = async (s) => {
    if (!await action({ action:"davis", ...clesDavis, station: s.id, nom: s.nom })) return;
    setClesDavis({ apiKey:"", apiSecret:"" }); setStationsDavis(null); charger();
  };
  const connecterMammotion = async () => {
    if (!await action({ action:"mammotion", ...idsMammotion })) return;
    setIdsMammotion({ clientId:"", clientSecret:"" }); charger();
  };

  // Robot ou arrosage connecté : déclaré aussi dans le profil (rappels et conseils adaptés à l'équipement)
  const robot = donnees?.robot;
  const arrosage = donnees?.arrosage;
  useEffect(() => {
    if (!profile) return;
    if (robot && !hasRobotTondeuse(profile)) {
      saveProfile({ ...profile, tondeuse: [...(profile.tondeuse || []).filter(t => t !== "aucun"), "robot"] });
    } else if (arrosage && !hasArrosageAuto(profile)) {
      saveProfile({ ...profile, arrosage: "automatique" });
    }
  }, [robot, arrosage, profile]); // eslint-disable-line

  const eq = donnees?.equipements?.find(e => e.type === "station");
  const eqRobot = donnees?.equipements?.find(e => e.type === "robot");
  const eqArrosage = donnees?.equipements?.find(e => e.type === "arrosage");
  const m = donnees?.station || eq?.mesures;

  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>📡 Mes équipements</div>
        <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>Tes appareils au service de ta pelouse</div>
      </div>
      <div style={scroll}>
        {retourHq && <div style={{ ...card(), color:"#a5d6a7", fontSize:12, lineHeight:1.6 }}>{retourHq}</div>}
        {erreur && <div style={{ ...card(), color:"#ef9a9a", fontSize:12 }}>⚠️ {erreur}</div>}

        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2" }}>🌡️ Station météo</div>
          {!donnees && !erreur && <div style={{ fontSize:12, color:"#81c784", marginTop:8 }}>Chargement…</div>}

          {eq && (
            <>
              <div style={{ fontSize:12, color: eq.statut === "erreur" ? "#f9a825" : "#a5d6a7", margin:"6px 0 10px" }}>
                {eq.nom} · {NOMS_STATION[eq.marque]} · {eq.statut === "erreur" ? `⚠️ ${eq.erreur}` : "✓ connectée"}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[["🌡️", nombre(m?.temp, "°C"), "Température"], ["💧", nombre(m?.pluie_jour, "mm"), "Pluie aujourd'hui"],
                  ["💦", nombre(m?.humidite, "%"), "Humidité de l'air"], ["💨", nombre(m?.vent, "km/h"), "Vent"],
                  ...(typeof m?.sol_humidite === "number" ? [["🌱", nombre(m.sol_humidite, "%"), "Humidité du sol"]] : []),
                ].map(([i, v, l]) => (
                  <div key={l} style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:18 }}>{i}</div>
                    <div style={{ fontSize:16, fontWeight:900, color:"#F1F8F2" }}>{v}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>{l}</div>
                  </div>
                ))}
              </div>
              {m?.at && <div style={{ fontSize:10, color:"#66BB6A", marginTop:6 }}>Relevé à {new Date(m.at).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}</div>}
              <div style={{ fontSize:11, color:"#a5d6a7", lineHeight:1.6, margin:"10px 0" }}>
                La pluie tombée, la température et le vent mesurés chez toi remplacent les prévisions pour la journée : arrosage, tonte, alertes gel, notifications et Bob s'appuient sur ton jardin.
              </div>
              {eq.statut === "erreur" && eq.marque === "netatmo" && (
                <button onClick={() => connexion("netatmo")} disabled={envoi} style={{ ...bouton, display:"block", marginBottom:10 }}>Reconnecter ma station Netatmo</button>
              )}
              <button onClick={() => retirer(eq.id)} disabled={envoi} style={lien}>
                Déconnecter la station (l'accès est effacé)
              </button>
            </>
          )}

          {donnees && !eq && (
            <>
              <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.6, margin:"6px 0 10px" }}>
                Connecte ta station : la pluie réellement tombée et la température de ton jardin remplacent les prévisions pour décider d'arroser, de tondre ou de protéger ton gazon du gel.
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", marginBottom:6 }}>Netatmo (Station Météo, avec module extérieur ou pluviomètre)</div>
              <button onClick={() => connexion("netatmo")} disabled={envoi} style={bouton}>{envoi ? "Ouverture…" : "Connecter ma station Netatmo"}</button>
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", margin:"14px 0 0" }}>Ecowitt (station reliée à ecowitt.net)</div>
              <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6, margin:"6px 0 10px" }}>
                1. Sur <a href="https://www.ecowitt.net/home/user" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7" }}>ecowitt.net</a>, ouvre « Private Center » et crée une <strong>Application Key</strong> et une <strong>API Key</strong>.<br/>
                2. Colle-les ci-dessous, puis choisis ta station.
              </div>
              <label style={{ fontSize:11, color:"#81c784" }}>Application Key
                <input value={cles.applicationKey} onChange={e => setCles({ ...cles, applicationKey: e.target.value })} autoComplete="off" style={champ} />
              </label>
              <div style={{ height:8 }} />
              <label style={{ fontSize:11, color:"#81c784" }}>API Key
                <input value={cles.apiKey} onChange={e => setCles({ ...cles, apiKey: e.target.value })} autoComplete="off" style={champ} />
              </label>
              {!stations?.length ? (
                <button onClick={chercher} disabled={envoi || !cles.applicationKey || !cles.apiKey} style={{ ...bouton, marginTop:12, opacity: cles.applicationKey && cles.apiKey ? 1 : 0.5 }}>
                  {envoi ? "Recherche…" : "Trouver ma station"}
                </button>
              ) : (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:"#81c784", marginBottom:6 }}>Station à connecter :</div>
                  {stations.map(s => (
                    <button key={s.mac} onClick={() => connecter(s)} disabled={envoi} style={{ ...bouton, display:"block", width:"100%", marginBottom:6 }}>
                      {envoi ? "Connexion…" : `📡 ${s.nom}`}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", margin:"14px 0 0" }}>Davis (Vantage Pro2 ou Vantage Vue, avec WeatherLink Live ou console WeatherLink)</div>
              <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6, margin:"6px 0 10px" }}>
                1. Sur <a href="https://www.weatherlink.com/account" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7" }}>weatherlink.com</a>, ouvre ton compte et touche « Generate v2 Key » : une <strong>API Key v2</strong> et un <strong>API Secret</strong> s'affichent.<br/>
                2. Colle-les ci-dessous, puis choisis ta station.
              </div>
              <label style={{ fontSize:11, color:"#81c784" }}>API Key v2
                <input value={clesDavis.apiKey} onChange={e => setClesDavis({ ...clesDavis, apiKey: e.target.value })} autoComplete="off" style={champ} />
              </label>
              <div style={{ height:8 }} />
              <label style={{ fontSize:11, color:"#81c784" }}>API Secret
                <input value={clesDavis.apiSecret} onChange={e => setClesDavis({ ...clesDavis, apiSecret: e.target.value })} autoComplete="off" style={champ} />
              </label>
              {!stationsDavis?.length ? (
                <button onClick={chercherDavis} disabled={envoi || !clesDavis.apiKey || !clesDavis.apiSecret} style={{ ...bouton, marginTop:12, opacity: clesDavis.apiKey && clesDavis.apiSecret ? 1 : 0.5 }}>
                  {envoi ? "Recherche…" : "Trouver ma station Davis"}
                </button>
              ) : (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:"#81c784", marginBottom:6 }}>Station à connecter :</div>
                  {stationsDavis.map(s => (
                    <button key={s.id} onClick={() => connecterDavis(s)} disabled={envoi} style={{ ...bouton, display:"block", width:"100%", marginBottom:6 }}>
                      {envoi ? "Connexion…" : `📡 ${s.nom}`}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize:10, color:"#4a7c5c", lineHeight:1.5, marginTop:10 }}>
                Netatmo : connexion sur le site de Netatmo, Mongazon360 ne voit jamais ton mot de passe ; accès en lecture seule, retirable dans ton compte Netatmo. Ecowitt et Davis : clés chiffrées, supprimables sur ecowitt.net ou régénérables sur weatherlink.com. Dans tous les cas, tu peux déconnecter la station ici à tout moment. Autres marques de stations : en préparation.
              </div>
            </>
          )}
        </div>

        {eqRobot && robot && <CarteRobot robot={robot} profile={profile} />}
        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2" }}>🤖 Robot tondeuse</div>
          {eqRobot ? (
            <>
              <div style={{ fontSize:12, color: eqRobot.statut === "erreur" ? "#f9a825" : "#a5d6a7", margin:"6px 0 8px" }}>
                {eqRobot.nom} · {NOMS_ROBOT[eqRobot.marque]} · {eqRobot.statut === "erreur" ? `⚠️ ${eqRobot.erreur}` : "✓ connecté"}
              </div>
              <div style={{ fontSize:11, color:"#a5d6a7", lineHeight:1.6, marginBottom:10 }}>
                {eqRobot.marque === "mammotion"
                  ? "Dans « Aujourd'hui », l'app te propose de le faire rentrer à sa base quand la tonte est déconseillée (pluie, gel, vent, semis en cours, hors saison) ou de reprendre une tonte en pause : rien n'est envoyé au robot sans ta validation."
                  : "Dans « Aujourd'hui », l'app te propose de mettre ton robot au repos (pluie, gel, vent, semis en cours, hors saison) ou de relancer son planning : rien n'est envoyé au robot sans ta validation."}
              </div>
              {eqRobot.statut === "erreur" && (eqRobot.marque === "mammotion" ? (
                <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6, marginBottom:10 }}>Si tes identifiants ont été réinitialisés, déconnecte le robot puis reconnecte-le avec les nouveaux.</div>
              ) : (
                <button onClick={() => connexion(eqRobot.marque === "gardena" ? "gardena_robot" : "husqvarna")} disabled={envoi} style={{ ...bouton, marginBottom:10 }}>Reconnecter mon robot</button>
              ))}
              <div>
                <button onClick={() => retirer(eqRobot.id)} disabled={envoi} style={lien}>
                  Déconnecter le robot (l'accès est {eqRobot.marque === "mammotion" ? "effacé" : "révoqué"})
                </button>
              </div>
            </>
          ) : donnees && (
            <>
              <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.6, margin:"6px 0 10px" }}>
                Connecte ton robot : l'app te propose de le mettre au repos quand il pleut, gèle ou pendant un semis, et de le relancer quand les conditions sont bonnes.
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", marginBottom:6 }}>Husqvarna Automower (application Automower Connect)</div>
              <button onClick={() => connexion("husqvarna")} disabled={envoi} style={bouton}>{envoi ? "Ouverture…" : "Connecter mon Automower"}</button>
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", margin:"14px 0 6px" }}>Gardena SILENO (application GARDENA smart system)</div>
              <button onClick={() => connexion("gardena_robot")} disabled={envoi} style={bouton}>{envoi ? "Ouverture…" : "Connecter mon robot Gardena"}</button>
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", margin:"14px 0 0" }}>Mammotion (modèles sortis à partir de 2025)</div>
              <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6, margin:"6px 0 10px" }}>
                1. Sur <a href="https://developer.mammotion.com" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7" }}>developer.mammotion.com</a>, connecte-toi avec ton compte Mammotion et touche « Create Credentials » : note le <strong>client_id</strong> et le <strong>client_secret</strong>, affichés une seule fois.<br/>
                2. Colle-les ci-dessous.
              </div>
              <label style={{ fontSize:11, color:"#81c784" }}>client_id
                <input value={idsMammotion.clientId} onChange={e => setIdsMammotion({ ...idsMammotion, clientId: e.target.value })} autoComplete="off" style={champ} />
              </label>
              <div style={{ height:8 }} />
              <label style={{ fontSize:11, color:"#81c784" }}>client_secret
                <input value={idsMammotion.clientSecret} onChange={e => setIdsMammotion({ ...idsMammotion, clientSecret: e.target.value })} autoComplete="off" style={champ} />
              </label>
              <button onClick={connecterMammotion} disabled={envoi || !idsMammotion.clientId || !idsMammotion.clientSecret} style={{ ...bouton, marginTop:12, opacity: idsMammotion.clientId && idsMammotion.clientSecret ? 1 : 0.5 }}>
                {envoi ? "Connexion…" : "Connecter mon robot Mammotion"}
              </button>
              <div style={{ fontSize:10, color:"#4a7c5c", lineHeight:1.5, marginTop:10 }}>
                Husqvarna et Gardena : tu te connectes sur le site du groupe Husqvarna, Mongazon360 ne voit jamais ton mot de passe ; si ton arrosage Gardena est sur le même compte, il est connecté en même temps. Mammotion : identifiants chiffrés ; les réinitialiser sur developer.mammotion.com coupe l'accès. Autres marques de robots : en préparation.
              </div>
            </>
          )}
        </div>

        {eqArrosage && arrosage && <CarteArrosage arrosage={arrosage} />}
        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2" }}>💧 Arrosage connecté</div>
          {eqArrosage ? (
            <>
              <div style={{ fontSize:12, color: eqArrosage.statut === "erreur" ? "#f9a825" : "#a5d6a7", margin:"6px 0 8px" }}>
                {eqArrosage.nom} · {eqArrosage.marque === "gardena" ? "Gardena" : "Rachio"} · {eqArrosage.statut === "erreur" ? `⚠️ ${eqArrosage.erreur}` : "✓ connecté"}
              </div>
              <div style={{ fontSize:11, color:"#a5d6a7", lineHeight:1.6, marginBottom:10 }}>
                Dans « Aujourd'hui », l'app te propose d'arroser chaque zone à la dose du jour (le matin seulement), de suspendre les programmes quand la pluie suffit, ou de mettre l'arrosage en veille l'hiver : rien n'est envoyé sans ta validation.
              </div>
              {eqArrosage.statut === "erreur" && eqArrosage.marque === "gardena" && (
                <button onClick={() => connexion("gardena")} disabled={envoi} style={{ ...bouton, marginBottom:10 }}>Reconnecter Gardena</button>
              )}
              <button onClick={() => retirer(eqArrosage.id)} disabled={envoi} style={lien}>
                Déconnecter l'arrosage (l'accès est effacé)
              </button>
            </>
          ) : donnees && (
            <>
              <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.6, margin:"6px 0 10px" }}>
                Connecte ton programmateur : l'app te propose d'arroser à la bonne dose le matin et de suspendre les programmes quand il pleut.
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", marginBottom:6 }}>Gardena smart system (Water Control, Smart Irrigation Control)</div>
              <button onClick={() => connexion("gardena")} disabled={envoi} style={bouton}>{envoi ? "Ouverture…" : "Connecter mon arrosage Gardena"}</button>
              <div style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", margin:"14px 0 4px" }}>Rachio</div>
              <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6 }}>
                Sur <a href="https://app.rach.io" target="_blank" rel="noopener noreferrer" style={{ color:"#a5d6a7" }}>app.rach.io</a>, ouvre les réglages de ton compte et copie ta clé API (« Get API Key »).
              </div>
              <input value={cleRachio} onChange={e => setCleRachio(e.target.value)} autoComplete="off" placeholder="Clé API Rachio" style={champ} />
              {!programmateurs?.length ? (
                <button onClick={chercherRachio} disabled={envoi || !cleRachio} style={{ ...bouton, marginTop:10, opacity: cleRachio ? 1 : 0.5 }}>Trouver mon programmateur</button>
              ) : programmateurs.map(p => (
                <button key={p.id} onClick={() => connecterRachio(p)} disabled={envoi} style={{ ...bouton, display:"block", width:"100%", marginTop:8 }}>💧 {p.nom}</button>
              ))}
              <div style={{ fontSize:10, color:"#4a7c5c", lineHeight:1.5, marginTop:10 }}>
                Gardena : connexion sur le site du groupe Husqvarna, Mongazon360 ne voit jamais ton mot de passe. Rachio : clé chiffrée, révocable sur app.rach.io. Autres marques : en préparation.
              </div>
            </>
          )}
        </div>

        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:4 }}>🔜 En préparation</div>
          {A_VENIR.map(a => (
            <div key={a.titre} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize:18 }}>{a.icone}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>{a.titre}</div>
                <div style={{ fontSize:11, color:"#81c784", lineHeight:1.5 }}>{a.texte}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize:11, color:"#a5d6a7", lineHeight:1.6, marginTop:8 }}>
            En attendant, indique ton équipement dans ton profil : l'app adapte déjà ses conseils.{" "}
            <span onClick={() => navigate("/setup")} style={{ textDecoration:"underline", cursor:"pointer" }}>Mon profil →</span>
          </div>
        </div>

        <div onClick={() => navigate("/my-lawn")} style={{ textAlign:"center", fontSize:12, color:"#81c784", textDecoration:"underline", cursor:"pointer", margin:"8px 0 24px" }}>
          Retour à Mon Gazon
        </div>
      </div>
    </div>
  );
}
