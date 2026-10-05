// src/components/CarteParrainage.jsx
// Mon Gazon : code de parrainage de l'utilisateur, lien à partager et résultats ; saisie d'un code reçu
// dans les 7 jours qui suivent l'inscription (règles : api/parrainage.cjs, CGV « Parrainage et codes créateurs »).
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { card, cardTitle } from "../lib/styles";
import { appelParrainage, normCode, oublierCode } from "../lib/codeParrainage";

const bouton = { flex:1, border:"none", borderRadius:10, padding:"10px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" };

export default function CarteParrainage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [info, setInfo] = useState(null);
  const [saisie, setSaisie] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    appelParrainage(getToken, { action: "mon-code" }).then(setInfo).catch(() => setInfo(false));
  }, [getToken]);

  if (info === false) return null;
  if (!info) return null;

  const texte = `J'utilise Mongazon360 pour entretenir ma pelouse : avec mon code ${info.code}, tu as 1 mois de Premium offert.`;
  const partager = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Mongazon360", text: texte, url: info.lien });
      else { await navigator.clipboard.writeText(`${texte} ${info.lien}`); setMsg("✅ Lien copié"); }
    } catch { /* partage annulé */ }
  };
  const copier = async () => {
    try { await navigator.clipboard.writeText(info.lien); setMsg("✅ Lien copié"); } catch { setMsg(info.lien); }
  };
  const utiliser = async () => {
    setMsg("");
    try {
      const r = await appelParrainage(getToken, { action: "utiliser", code: saisie });
      oublierCode();
      setInfo({ ...info, codeUtilise: r.code });
      setMsg(r.until ? `✅ Code ${r.code} activé : Premium offert jusqu'au ${new Date(r.until).toLocaleDateString("fr-FR")}` : `✅ Code ${r.code} enregistré`);
      user?.reload();
    } catch (e) { setMsg(`❌ ${e.message}`); }
  };
  const peutSaisir = !info.codeUtilise && user?.createdAt && Date.now() - new Date(user.createdAt).getTime() < 7 * 86400000;

  return (
    <div style={card()}>
      <div style={cardTitle}><span>🎁 Parraine tes amis</span></div>
      <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.6, marginBottom:10 }}>
        Ton ami a <b style={{ color:"#e8f5e9" }}>1 mois de Premium offert</b> à l'inscription, et toi <b style={{ color:"#e8f5e9" }}>1 mois offert</b> dès qu'il utilise l'app (12 mois par an au plus).
      </div>
      <div style={{ textAlign:"center", fontSize:22, fontWeight:900, letterSpacing:2, color:"#ffe082", margin:"4px 0 10px" }}>{info.code}</div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={partager} style={{ ...bouton, background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff" }}>Partager mon lien</button>
        <button onClick={copier} style={{ ...bouton, flex:"0 0 auto", padding:"10px 14px", background:"rgba(255,255,255,0.08)", color:"#c8e6c9" }}>Copier</button>
      </div>
      <div style={{ fontSize:11, color:"#81c784", marginTop:8 }}>
        {info.filleuls ? `${info.filleuls} ami${info.filleuls > 1 ? "s" : ""} inscrit${info.filleuls > 1 ? "s" : ""} · ${info.recompenses} mois gagné${info.recompenses > 1 ? "s" : ""}` : "Aucun ami inscrit pour l'instant."}
      </div>
      {peutSaisir && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:12, color:"#c8e6c9", marginBottom:6 }}>Tu as reçu un code ?</div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={saisie} onChange={e => setSaisie(e.target.value.toUpperCase())} placeholder="CODE" maxLength={16}
              style={{ flex:1, minWidth:0, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"9px 10px", color:"#e8f5e9", fontSize:13, fontFamily:"inherit" }} />
            <button onClick={utiliser} disabled={normCode(saisie).length < 3} style={{ ...bouton, flex:"0 0 auto", padding:"9px 14px", background:"rgba(76,175,80,0.25)", color:"#a5d6a7" }}>Valider</button>
          </div>
        </div>
      )}
      {msg && <div style={{ fontSize:11, color: msg.startsWith("❌") ? "#ef9a9a" : "#a5d6a7", marginTop:8, wordBreak:"break-all" }}>{msg}</div>}
    </div>
  );
}
