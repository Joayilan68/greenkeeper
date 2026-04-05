// src/pages/Setup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { appShell, btn } from "../lib/styles";

const STEPS = [
  { title:"Type de gazon", field:"pelouse", options:[
    { v:"sport",       label:"⚽ Sport / résistant",      desc:"Résistance au piétinement" },
    { v:"ornemental",  label:"🌸 Ornemental",             desc:"Aspect parfait, usage limité" },
    { v:"ombre",       label:"🌳 Ombre / Mi-ombre",       desc:"Zones peu ensoleillées" },
    { v:"sec",         label:"🏜️ Sec / méditerranéen",   desc:"Résistant à la sécheresse" },
    { v:"universel",   label:"🌿 Universel / mélange",    desc:"Polyvalent, standard" },
    { v:"chaud",       label:"☀️ Gazon chaud",           desc:"Climat chaud, espèces adaptées" },
    { v:"synthetique", label:"🟩 Gazon synthétique",      desc:"Pas d'arrosage ni tonte" },
    { v:"inconnu",     label:"🤷 Je ne sais pas",         desc:"Recommandation automatique" },
  ]},
  { title:"Type de sol", field:"sol", options:[
    { v:"argileux",  label:"🏔️ Argileux",      desc:"Dense, retient l'eau" },
    { v:"limoneux",  label:"🌱 Limoneux",       desc:"Équilibré, idéal" },
    { v:"sableux",   label:"🏖️ Sableux",       desc:"Drainant, sèche vite" },
    { v:"calcaire",  label:"🪨 Calcaire",       desc:"pH élevé, chlorose possible" },
    { v:"humifere",  label:"🍂 Humifère",       desc:"Riche en matière organique" },
    { v:"compacte",  label:"🧱 Compacté",       desc:"Aération recommandée" },
    { v:"inconnu",   label:"🤷 Je ne sais pas", desc:"" },
  ]},
  { title:"Exposition du terrain", field:"exposition", options:[
    { v:"ensoleille", label:"☀️ Ensoleillé",  desc:"Plus de 6h de soleil/jour" },
    { v:"mi-ombre",   label:"⛅ Mi-ombre",    desc:"3 à 6h de soleil/jour" },
    { v:"ombrage",    label:"🌥️ Ombragé",    desc:"Moins de 3h de soleil/jour" },
  ]},
  { title:"Surface de la pelouse", field:"surface", isInput:true, placeholder:"Ex : 200", unit:"m²" },
  { title:"Mode d'arrosage", field:"arrosage", skipIfSynth:true, options:[
    { v:"automatique", label:"🤖 Arrosage automatique",       desc:"Programmateur ou goutte-à-goutte" },
    { v:"manuel",      label:"🪣 Tuyau / manuel",              desc:"Arrosage à la main" },
    { v:"aucun",       label:"❌ Pas d'arrosage",              desc:"" },
    { v:"rarement",    label:"🤷 Rarement / je ne sais pas",  desc:"" },
  ]},
  { title:"Tondeuse disponible", field:"tondeuse", isMulti:true, skipIfSynth:true, options:[
    { v:"electrique_filaire",  label:"🔌 Électrique filaire" },
    { v:"electrique_batterie", label:"🔋 Électrique batterie" },
    { v:"thermique",           label:"⛽ Thermique" },
    { v:"robot",               label:"🤖 Robot tondeuse" },
    { v:"helicoidale",         label:"🔧 Hélicoïdale" },
    { v:"autoportee",          label:"🚜 Autoportée / Rider" },
    { v:"inconnu",             label:"🤷 Je ne sais pas" },
  ]},
  { title:"Matériel disponible", field:"materiel", isMulti:true, options:[
    { v:"scarificateur",    label:"🔩 Scarificateur" },
    { v:"aerateur",         label:"🌀 Aérateur" },
    { v:"debroussailleuse", label:"✂️ Débroussailleuse" },
    { v:"epandeur",         label:"🌱 Épandeur" },
    { v:"pulverisateur",    label:"💧 Pulvérisateur" },
    { v:"rouleau",          label:"🛞 Rouleau à gazon" },
    { v:"arroseur",         label:"⏱️ Arroseur/programmateur" },
    { v:"souffleur",        label:"💨 Souffleur" },
    { v:"aucun",            label:"❌ Aucun matériel" },
  ]},
  { title:"Budget entretien annuel", field:"budget", options:[
    { v:"0-50",    label:"💶 0–50 € / an",        desc:"" },
    { v:"50-150",  label:"💶 50–150 € / an",      desc:"" },
    { v:"150-300", label:"💶 150–300 € / an",     desc:"" },
    { v:"300-600", label:"💶 300–600 € / an",     desc:"" },
    { v:"600+",    label:"💶 Plus de 600 € / an", desc:"" },
    { v:"inconnu", label:"🤷 Je ne sais pas",     desc:"" },
  ]},
];

export default function Setup() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [tmp, setTmp] = useState(profile || {
    pelouse:"", sol:"", exposition:"", surface:"",
    arrosage:"", tondeuse:[], materiel:[], budget:""
  });

  const isSynth = tmp.pelouse === "synthetique";

  // Filtrer les étapes selon type de gazon
  const stepsActifs = STEPS.filter(s => !(isSynth && s.skipIfSynth));
  const totalSteps  = stepsActifs.length;
  const stepActuel  = stepsActifs[step];
  const canNext     = stepActuel?.isMulti || !!tmp[stepActuel?.field];
  const progress    = (step / totalSteps) * 100;

  const toggleMulti = (field, val) => {
    setTmp(p => {
      const arr = p[field] || [];
      if (val === "aucun") return { ...p, [field]: ["aucun"] };
      const filtered = arr.filter(x => x !== "aucun");
      return { ...p, [field]: filtered.includes(val) ? filtered.filter(x => x !== val) : [...filtered, val] };
    });
  };

  const finish = () => {
    const p2Fields = [
      tmp.sol && tmp.sol !== "N/A",
      tmp.exposition,
      tmp.arrosage && tmp.arrosage !== "N/A",
      tmp.tondeuse?.length > 0,
      tmp.materiel?.length > 0,
      tmp.budget,
    ];
    const p2Done     = p2Fields.filter(Boolean).length;
    const completion = Math.min(90, 40 + Math.round((p2Done / 6) * 50));
    saveProfile({ ...tmp, profileCompletion: completion });
    navigate("/");
  };

  if (!stepActuel) return null;

  return (
    <div style={{ ...appShell, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ padding:"48px 20px 24px", textAlign:"center" }}>
        <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:52, height:52, objectFit:"contain", display:"block", margin:"0 auto 8px" }} />
        <div style={{ fontSize:18, fontWeight:800, color:"#a5d6a7", marginTop:4 }}>
          {profile ? "Compléter mon profil" : "Configuration"}
        </div>
        <div style={{ height:4, background:"rgba(255,255,255,0.1)", borderRadius:2, margin:"14px 20px 0" }}>
          <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#43a047,#a5d6a7)", borderRadius:2, transition:"width 0.4s" }} />
        </div>
        <div style={{ fontSize:11, color:"#81c784", marginTop:6, opacity:0.7 }}>Étape {step + 1} / {totalSteps}</div>
      </div>

      <div style={{ padding:"0 16px 40px" }}>
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:20, border:"1px solid rgba(165,214,167,0.15)", padding:18, marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:16 }}>{stepActuel.title}</div>

          {stepActuel.isInput ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input
                type="number" min={1}
                placeholder={stepActuel.placeholder}
                value={tmp[stepActuel.field] || ""}
                onChange={e => setTmp(p => ({ ...p, [stepActuel.field]: e.target.value }))}
                style={{ flex:1, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.3)", borderRadius:12, padding:"14px 16px", color:"#e8f5e9", fontSize:18, fontWeight:700, outline:"none", fontFamily:"inherit" }}
              />
              <span style={{ fontSize:16, color:"#81c784", fontWeight:700 }}>{stepActuel.unit}</span>
            </div>

          ) : stepActuel.isMulti ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {stepActuel.options.map(o => {
                const sel = (tmp[stepActuel.field] || []).includes(o.v);
                return (
                  <button key={o.v} onClick={() => toggleMulti(stepActuel.field, o.v)}
                    style={{ background:sel?"rgba(76,175,80,0.25)":"rgba(255,255,255,0.06)", border:`1px solid ${sel?"#43a047":"rgba(255,255,255,0.1)"}`, borderRadius:12, padding:"10px 8px", color:"#e8f5e9", cursor:"pointer", fontSize:12, fontWeight:600, textAlign:"center", fontFamily:"inherit" }}>
                    {o.label}
                  </button>
                );
              })}
            </div>

          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {stepActuel.options.map(o => {
                const sel = tmp[stepActuel.field] === o.v;
                return (
                  <button key={o.v} onClick={() => setTmp(p => ({ ...p, [stepActuel.field]: o.v }))}
                    style={{ background:sel?"rgba(76,175,80,0.2)":"rgba(255,255,255,0.04)", border:`1px solid ${sel?"#43a047":"rgba(255,255,255,0.08)"}`, borderRadius:14, padding:"14px 16px", color:"#e8f5e9", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between", fontFamily:"inherit" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{o.label}</div>
                      {o.desc && <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>{o.desc}</div>}
                    </div>
                    {sel && <span style={{ color:"#43a047", fontSize:18 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ ...btn.ghost, flex:1, width:"auto" }}>
              ← Retour
            </button>
          )}
          <button
            onClick={() => step < totalSteps - 1 ? setStep(s => s + 1) : finish()}
            disabled={!canNext}
            style={{ ...btn.primary, flex:2, width:"auto", opacity:canNext ? 1 : 0.4 }}
          >
            {step < totalSteps - 1 ? "Suivant →" : "Enregistrer ✓"}
          </button>
        </div>

        {profile && (
          <button onClick={() => navigate("/")} style={{ marginTop:12, width:"100%", background:"none", border:"none", color:"#4a7c5c", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
