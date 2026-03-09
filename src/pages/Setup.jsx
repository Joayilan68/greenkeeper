import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { appShell, btn } from "../lib/styles";

const STEPS = [
  { title:"Type de pelouse", field:"pelouse", options:[
    { v:"ornement",          label:"🌸 Ornement",        desc:"Aspect parfait, usage limité" },
    { v:"sport",             label:"⚽ Sport / Jeux",    desc:"Résistance au piétinement" },
    { v:"rustique",          label:"🌾 Rustique",        desc:"Peu d'entretien" },
    { v:"ombre-semi-ombre",  label:"🌳 Ombre / Mi-ombre",desc:"Zones peu ensoleillées" },
  ]},
  { title:"Type de sol", field:"sol", options:[
    { v:"argileux",  label:"🏔️ Argileux",  desc:"Dense, retient l'eau" },
    { v:"limoneux",  label:"🌱 Limoneux",   desc:"Équilibré, idéal" },
    { v:"sableux",   label:"🏖️ Sableux",   desc:"Drainant, sèche vite" },
    { v:"calcaire",  label:"🪨 Calcaire",   desc:"pH élevé, chlorose possible" },
  ]},
  { title:"Surface de la pelouse", field:"surface", isInput:true, placeholder:"Ex : 200", unit:"m²" },
  { title:"Matériel disponible", field:"materiel", isMulti:true, options:[
    { v:"arrosage-auto",      label:"💧 Arrosage auto" },
    { v:"scarificateur",      label:"🔧 Scarificateur" },
    { v:"aerateur",           label:"🌀 Aérateur/carotteur" },
    { v:"tondeuse-robot",     label:"🤖 Tondeuse robot" },
    { v:"tondeuse-thermique", label:"⛽ Tondeuse thermique" },
    { v:"epandeur",           label:"📦 Épandeur engrais" },
  ]},
];

export default function Setup() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [tmp, setTmp] = useState(profile || { pelouse:"", sol:"", surface:"", materiel:[] });

  const s = STEPS[step];
  const progress = (step / STEPS.length) * 100;
  const canNext = s.isMulti || !!tmp[s.field];

  const finish = () => { saveProfile(tmp); navigate("/"); };

  return (
    <div style={{ ...appShell, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ padding:"48px 20px 24px", textAlign:"center" }}>
        <div style={{ fontSize:28 }}>🌿</div>
        <div style={{ fontSize:18, fontWeight:800, color:"#a5d6a7", marginTop:4 }}>
          {profile ? "Modifier le profil" : "Configuration"}
        </div>
        <div style={{ marginTop:14, height:4, background:"rgba(255,255,255,0.1)", borderRadius:2, margin:"14px 0 0" }}>
          <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#43a047,#a5d6a7)", borderRadius:2, transition:"width 0.4s" }} />
        </div>
        <div style={{ fontSize:11, color:"#81c784", marginTop:6, opacity:0.7 }}>Étape {step+1} / {STEPS.length}</div>
      </div>

      <div style={{ padding:"0 16px 40px" }}>
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:20, border:"1px solid rgba(165,214,167,0.15)", padding:18, marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:16 }}>{s.title}</div>
          {s.isInput ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="number" placeholder={s.placeholder} value={tmp[s.field]}
                onChange={e => setTmp(p=>({...p,[s.field]:e.target.value}))}
                style={{ flex:1, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.3)", borderRadius:12, padding:"14px 16px", color:"#e8f5e9", fontSize:18, fontWeight:700, outline:"none", fontFamily:"inherit" }}
              />
              <span style={{ fontSize:16, color:"#81c784", fontWeight:700 }}>{s.unit}</span>
            </div>
          ) : s.isMulti ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {s.options.map(o => {
                const sel = (tmp.materiel||[]).includes(o.v);
                return (
                  <button key={o.v} onClick={() => setTmp(p=>({ ...p, materiel: sel?p.materiel.filter(x=>x!==o.v):[...(p.materiel||[]),o.v] }))}
                    style={{ background:sel?"rgba(76,175,80,0.25)":"rgba(255,255,255,0.06)", border:`1px solid ${sel?"#43a047":"rgba(255,255,255,0.1)"}`, borderRadius:12, padding:"10px 8px", color:"#e8f5e9", cursor:"pointer", fontSize:12, fontWeight:600, textAlign:"center" }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {s.options.map(o => {
                const sel = tmp[s.field]===o.v;
                return (
                  <button key={o.v} onClick={() => setTmp(p=>({...p,[s.field]:o.v}))}
                    style={{ background:sel?"rgba(76,175,80,0.2)":"rgba(255,255,255,0.04)", border:`1px solid ${sel?"#43a047":"rgba(255,255,255,0.08)"}`, borderRadius:14, padding:"14px 16px", color:"#e8f5e9", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
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
          {step > 0 && <button onClick={() => setStep(s=>s-1)} style={{ ...btn.ghost, flex:1, width:"auto" }}>← Retour</button>}
          <button onClick={() => step<STEPS.length-1 ? setStep(s=>s+1) : finish()}
            disabled={!canNext}
            style={{ ...btn.primary, flex:2, width:"auto", opacity:canNext?1:0.4 }}>
            {step<STEPS.length-1 ? "Suivant →" : "Enregistrer ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
