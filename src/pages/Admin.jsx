import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";
import { appShell, btn } from "../lib/styles";
export default function Admin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { activateAdmin } = useSubscription();
  const navigate = useNavigate();
  const handleSubmit = () => {
    const ok = activateAdmin(code);
    if (ok) { setSuccess(true); setTimeout(() => navigate("/"), 1500); }
    else setError("Code incorrect. Réessayez.");
  };
  return (
    <div style={{...appShell,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:52}}>🔐</div>
        <div style={{fontSize:22,fontWeight:800,color:"#a5d6a7",marginTop:8}}>Accès Admin</div>
        <div style={{fontSize:13,color:"#81c784",marginTop:6}}>Entrez votre code secret</div>
      </div>
      {success ? (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:48}}>✅</div>
          <div style={{fontSize:16,fontWeight:700,color:"#a5d6a7",marginTop:12}}>Accès Admin activé !</div>
          <div style={{fontSize:13,color:"#81c784",marginTop:6}}>Redirection...</div>
        </div>
      ) : (
        <div style={{width:"100%",maxWidth:320}}>
          <input type="password" placeholder="Code secret" value={code} onChange={e => { setCode(e.target.value); setError(""); }} onKeyDown={e => e.key==="Enter" && handleSubmit()}
            style={{width:"100%",background:"rgba(255,255,255,0.08)",border:`1px solid ${error?"#ef5350":"rgba(165,214,167,0.3)"}`,borderRadius:14,padding:"14px 16px",color:"#e8f5e9",fontSize:16,fontWeight:600,outline:"none",fontFamily:"inherit",marginBottom:8,boxSizing:"border-box"}}
          />
          {error && <div style={{color:"#ef9a9a",fontSize:12,marginBottom:12,textAlign:"center"}}>{error}</div>}
          <button onClick={handleSubmit} style={{...btn.primary,marginTop:8}}>🔓 Accéder</button>
          <button onClick={() => navigate("/")} style={{...btn.ghost,marginTop:10}}>← Retour</button>
        </div>
      )}
    </div>
  );
}