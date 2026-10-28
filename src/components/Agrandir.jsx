// src/components/Agrandir.jsx
// Pilotage : un graphique se touche pour s'ouvrir en plein écran, en grand (demande de Jordan du 28/10/2026).
// children(taille) dessine le graphique : taille = null dans sa carte, { largeur, hauteur } (place disponible, en px)
// dans la fenêtre agrandie. Fermeture : ✕, toucher du fond, Échap ou bouton retour du téléphone (l'ouverture ajoute
// une étape à l'historique, pour que le retour ferme la fenêtre au lieu de quitter Pilotage).
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { appShell } from "../lib/styles";

const place = () => ({ largeur: Math.min(window.innerWidth, 900) - 32, hauteur: window.innerHeight });

export default function Agrandir({ titre, children }) {
  const [ouvert, setOuvert] = useState(false);
  const [taille, setTaille] = useState(null);

  const ouvrir = () => { setTaille(place()); setOuvert(true); };
  const fermer = () => { if (window.history.state?.agrandi) window.history.back(); else setOuvert(false); };

  useEffect(() => {
    if (!ouvert) return;
    if (!window.history.state?.agrandi) window.history.pushState({ ...window.history.state, agrandi: true }, "");
    const retour = () => setOuvert(false);
    const echap = (e) => { if (e.key === "Escape") fermer(); };
    const redimension = () => setTaille(place());
    window.addEventListener("popstate", retour);
    window.addEventListener("keydown", echap);
    window.addEventListener("resize", redimension);
    return () => {
      window.removeEventListener("popstate", retour);
      window.removeEventListener("keydown", echap);
      window.removeEventListener("resize", redimension);
    };
  }, [ouvert]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div role="button" tabIndex={0} aria-label={`Agrandir : ${titre}`} onClick={ouvrir} style={{ cursor:"zoom-in" }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(); } }}>
        {children(null)}
        <div style={{ textAlign:"right", fontSize:10, color:"#81c784", marginTop:4 }}>⤢ Agrandir</div>
      </div>
      {ouvert && createPortal(
        <div role="dialog" aria-modal="true" aria-label={titre} onClick={fermer}
          style={{ position:"fixed", inset:0, zIndex:1000, overflowY:"auto", overscrollBehavior:"contain",
            background:"#0c2417", color:"#F1F8F2", fontFamily:appShell.fontFamily }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth:900, margin:"0 auto", padding:"16px 16px 40px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#e8f5e9" }}>{titre}</div>
              <button onClick={fermer} aria-label="Fermer" autoFocus style={{ flexShrink:0, width:36, height:36, borderRadius:10,
                background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.3)", color:"#e8f5e9", fontSize:16, cursor:"pointer" }}>✕</button>
            </div>
            {children(taille)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
