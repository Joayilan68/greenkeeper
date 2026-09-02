// src/components/OpenInBrowser.jsx
// Affiché UNIQUEMENT à l'étape de connexion/inscription quand on est dans un
// navigateur in-app (Instagram, TikTok…), où l'authentification est bloquée.
// La landing, elle, reste visible dans ces navigateurs → l'utilisateur a déjà
// vu la valeur avant d'arriver ici.
import { useState } from "react";

export default function OpenInBrowser() {
  const [copied, setCopied] = useState(false);
  const url = "https://mongazon360.fr";
  const ua = typeof navigator !== "undefined" ? (navigator.userAgent || "") : "";
  const isAndroid = /Android/i.test(ua);
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);

  const handleOpen = () => {
    if (isAndroid) {
      window.location.href =
        `intent://mongazon360.fr#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    } else if (isIOS) {
      try {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true); setTimeout(() => setCopied(false), 3000);
        });
      } catch {
        setCopied(true); setTimeout(() => setCopied(false), 3000);
      }
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(165deg,#0F2F1F 0%,#164a2b 45%,#0d2519 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"32px 24px", textAlign:"center", fontFamily:"'Nunito','Segoe UI',sans-serif",
    }}>
      <img src="/mg360-mascot-transparent.png" alt="Mongazon360"
        style={{ width:88, height:88, objectFit:"contain", marginBottom:18 }}
        onError={(e)=>{ e.currentTarget.style.display="none"; }} />

      <div style={{ display:"inline-block", fontSize:12, fontWeight:700, color:"#66BB6A",
        background:"rgba(76,175,80,0.14)", border:"1px solid rgba(102,187,106,0.3)",
        borderRadius:999, padding:"5px 14px", marginBottom:16 }}>
        Plus qu'une étape 🌱
      </div>

      <div style={{ fontSize:21, fontWeight:800, color:"#F1F8F2", marginBottom:10, maxWidth:320, lineHeight:1.25 }}>
        Ouvre Mongazon360 dans ton navigateur pour créer ton compte
      </div>
      <div style={{ fontSize:14, color:"#81c784", marginBottom:26, lineHeight:1.6, maxWidth:320 }}>
        Le navigateur intégré d'Instagram bloque l'inscription. Un simple appui et tu continues dans Chrome ou Safari — ton diagnostic gratuit t'attend.
      </div>

      <button onClick={handleOpen} style={{
        background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff", border:"none",
        borderRadius:14, padding:"15px 28px", fontSize:15, fontWeight:800, cursor:"pointer",
        marginBottom:16, boxShadow:"0 6px 20px rgba(46,125,50,0.4)", width:"100%", maxWidth:320,
        fontFamily:"inherit",
      }}>
        {copied ? "✅ Lien copié — colle-le dans Safari" : isIOS ? "📋 Copier le lien" : "Ouvrir dans Chrome →"}
      </button>

      <div style={{ fontSize:11.5, color:"#4a7c5c", lineHeight:1.8 }}>
        {isIOS ? "Colle ensuite le lien dans la barre d'adresse de Safari" : "Ou saisis l'adresse manuellement :"}<br/>
        <span style={{ color:"#66BB6A", fontWeight:700, fontSize:13 }}>mongazon360.fr</span>
      </div>
    </div>
  );
}
