// src/pages/EssaiDiagnostic.jsx
// Parcours PUBLIC « valeur d'abord » : un visiteur non connecté fait un
// diagnostic gratuit, voit son score + un aperçu, puis s'inscrit pour débloquer
// l'analyse complète (rattachée à son compte). Aucune inscription en amont.
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAnonId, setAnonPending } from "../lib/anonId";
import { trackFunnel } from "../lib/funnel";

const G = {
  bg:     "linear-gradient(165deg,#0F2F1F 0%,#164a2b 45%,#0d2519 100%)",
  text:   "#F1F8F2", muted:"#A5D6A7", soft:"#81C784", faint:"#4a7c5c",
  card:   "rgba(255,255,255,0.06)", border:"1px solid rgba(165,214,167,0.18)", accent:"#66BB6A",
};
const ETAT_COLORS = { excellent:"#43a047", bon:"#66bb6a", moyen:"#ffa726", mauvais:"#ef5350", critique:"#c62828" };

// Compression image avant envoi (identique au parcours Premium).
const compressImage = (file, maxSize = 1280, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Impossible de charger l'image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round(height * (maxSize / width)); width = maxSize; }
          else { width = Math.round(width * (maxSize / height)); height = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.split(",")[1], dataUrl, mimeType: "image/jpeg" });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

const btnPrimary = { background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff", border:"none",
  borderRadius:14, padding:"15px 22px", fontSize:15, fontWeight:800, cursor:"pointer", width:"100%",
  boxShadow:"0 6px 20px rgba(46,125,50,0.4)", fontFamily:"inherit" };
const btnGhost = { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.25)",
  color:"#e8f5e9", borderRadius:12, padding:"13px 18px", fontSize:14, fontWeight:700, cursor:"pointer",
  width:"100%", fontFamily:"inherit" };

export default function EssaiDiagnostic() {
  const navigate = useNavigate();
  const [view, setView]       = useState("home");   // home | camera | result | wall
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [preview, setPreview] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [result, setResult]   = useState(null);
  const fileRef = useRef();
  const galleryRef = useRef();

  const goSignup = (from) => {
    trackFunnel("signup_from_teaser", { from });
    setAnonPending(true);       // → sera rattaché au compte après inscription
    navigate("/signup");
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    try {
      const { base64, dataUrl, mimeType: mt } = await compressImage(file);
      setImageB64(base64); setPreview(dataUrl); setMimeType(mt);
      setView("camera");
    } catch (e) { setError(e.message || "Erreur lors du traitement de la photo"); }
  };
  const onInput = (e) => { handleFile(e.target.files[0]); e.target.value = ""; };

  const analyze = async () => {
    if (!imageB64) return;
    setLoading(true); setError("");
    trackFunnel("anon_diag_started");
    try {
      const res = await fetch("/api/analyze-lawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anon: true, anonId: getAnonId(), imageBase64: imageB64, mimeType, score: 0 }),
      });
      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch { throw new Error(`Erreur serveur (${res.status}).`); }

      if (res.status === 429 && (data.error === "trial_used" || data.error === "ip_limit")) {
        setError(""); setView("wall"); return;   // quota atteint → mur d'inscription
      }
      if (!res.ok || data.error) throw new Error(data.message || data.error || "Erreur serveur");

      setResult({ analysis: data.analysis, imageUrl: data.imageUrl });
      setView("result");
      trackFunnel("anon_diag_result", { score: data.analysis?.score_visuel ?? null });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const hidden = (
    <>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onInput} style={{ display:"none" }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={onInput} style={{ display:"none" }} />
    </>
  );

  const Shell = ({ children }) => (
    <div style={{ background:G.bg, minHeight:"100vh", color:G.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"22px 18px 48px" }}>
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <img src="/mg360-mascot-transparent.png" alt="" style={{ width:34, height:34, objectFit:"contain" }} />
            <span style={{ fontSize:17, fontWeight:800, color:G.muted }}>Mongazon360<sup style={{ fontSize:8, color:G.soft }}>™</sup></span>
          </div>
          <button onClick={() => navigate("/login")} style={{ ...btnGhost, width:"auto", padding:"7px 13px", fontSize:12.5 }}>Se connecter</button>
        </header>
        {children}
      </div>
    </div>
  );

  // ── ACCUEIL ──
  if (view === "home") return (
    <Shell>
      {hidden}
      <div style={{ textAlign:"center", padding:"14px 0 24px" }}>
        <div style={{ display:"inline-block", fontSize:12.5, fontWeight:800, color:"#0b1f12",
          background:"linear-gradient(135deg,#66BB6A,#43A047)", borderRadius:999, padding:"6px 15px", marginBottom:16 }}>
          🎁 Gratuit · sans inscription
        </div>
        <h1 style={{ fontSize:26, fontWeight:900, margin:"0 0 10px", lineHeight:1.2 }}>Diagnostique ta pelouse en 10 secondes</h1>
        <p style={{ fontSize:14.5, color:G.soft, margin:"0 0 4px", lineHeight:1.5 }}>
          Prends une photo, Bob l'analyse et te donne ton <b style={{ color:G.muted }}>Score Santé /100</b>. Pas besoin de compte pour essayer.
        </p>
      </div>

      {error && <div style={{ background:"rgba(198,40,40,0.2)", border:"1px solid #c62828", borderRadius:12, padding:"12px 16px", marginBottom:14, fontSize:13, color:"#ef9a9a" }}>⚠️ {error}</div>}

      <div style={{ background:G.card, border:G.border, borderRadius:18, padding:22, textAlign:"center", marginBottom:16 }}>
        <div style={{ fontSize:48, marginBottom:10 }}>📸</div>
        <div style={{ fontSize:13, color:G.soft, marginBottom:18, lineHeight:1.6 }}>
          Photo en pleine lumière, à ~1 m du sol, zone bien visible.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={() => fileRef.current.click()} style={btnPrimary}>📷 Prendre une photo</button>
          <button onClick={() => galleryRef.current.click()} style={btnGhost}>🖼️ Choisir depuis la galerie</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", fontSize:11.5, color:G.faint }}>
        <span>✓ Score /100</span><span>·</span><span>✓ Sans carte bancaire</span><span>·</span><span>✓ Résultat immédiat</span>
      </div>
    </Shell>
  );

  // ── PREVIEW ──
  if (view === "camera") return (
    <Shell>
      {hidden}
      {error && <div style={{ background:"rgba(198,40,40,0.2)", border:"1px solid #c62828", borderRadius:12, padding:"12px 16px", marginBottom:14, fontSize:13, color:"#ef9a9a" }}>⚠️ {error}</div>}
      {preview && <div style={{ borderRadius:16, overflow:"hidden", marginBottom:16 }}><img src={preview} alt="aperçu" style={{ width:"100%", maxHeight:320, objectFit:"cover", display:"block" }} /></div>}
      <div style={{ background:G.card, border:G.border, borderRadius:18, padding:18, textAlign:"center" }}>
        <div style={{ fontSize:13, color:G.soft, marginBottom:16 }}>La photo est-elle nette et bien exposée ?</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={analyze} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading ? "🔍 Bob analyse ta pelouse…" : "🔬 Lancer mon diagnostic gratuit"}
          </button>
          <button onClick={() => fileRef.current.click()} style={btnGhost}>📷 Reprendre</button>
          <button onClick={() => galleryRef.current.click()} style={btnGhost}>🖼️ Galerie</button>
          <button onClick={() => { setView("home"); setPreview(null); setImageB64(null); }} style={{ background:"none", border:"none", color:G.soft, fontSize:12, cursor:"pointer" }}>← Retour</button>
        </div>
      </div>
    </Shell>
  );

  // ── RÉSULTAT TEASÉ ──
  if (view === "result" && result) {
    const a = result.analysis;
    const etatColor = ETAT_COLORS[a.etat_general] || G.muted;
    const nbProb = a.problemes?.length || 0;
    return (
      <Shell>
        {hidden}
        {/* Score : MONTRÉ en entier */}
        <div style={{ background:"linear-gradient(135deg,rgba(27,94,32,0.45),rgba(13,43,26,0.6))", border:`1px solid ${etatColor}55`, borderRadius:18, padding:22, textAlign:"center", marginBottom:14 }}>
          <div style={{ fontSize:50, marginBottom:6 }}>{a.emoji}</div>
          <div style={{ fontSize:38, fontWeight:900, color:etatColor, lineHeight:1 }}>{a.score_visuel}<span style={{ fontSize:18 }}>/100</span></div>
          <div style={{ fontSize:14, fontWeight:800, color:etatColor, marginTop:4, textTransform:"capitalize" }}>{a.etat_general}</div>
          <div style={{ fontSize:13, color:G.soft, lineHeight:1.6, fontStyle:"italic", marginTop:10 }}>« {a.resume} »</div>
        </div>

        {result.imageUrl && <div style={{ borderRadius:16, overflow:"hidden", marginBottom:14 }}><img src={result.imageUrl} alt="ta pelouse" style={{ width:"100%", maxHeight:190, objectFit:"cover", display:"block" }} /></div>}

        {/* Analyse détaillée : VERROUILLÉE */}
        <div style={{ position:"relative", borderRadius:18, overflow:"hidden", marginBottom:16 }}>
          <div style={{ filter:"blur(6px)", pointerEvents:"none", userSelect:"none", padding:2 }} aria-hidden="true">
            <div style={{ background:G.card, border:G.border, borderRadius:14, padding:16, marginBottom:8 }}>
              <div style={{ fontWeight:800, fontSize:13, color:G.muted, marginBottom:8 }}>⚠️ {nbProb || 2} problème{(nbProb||2)>1?"s":""} détecté{(nbProb||2)>1?"s":""}</div>
              {(a.problemes?.length ? a.problemes : [{nom:"Analyse détaillée"},{nom:"Solutions de Bob"}]).slice(0,3).map((p,i) => (
                <div key={i} style={{ background:"rgba(255,152,0,0.12)", border:"1px solid rgba(255,152,0,0.3)", borderRadius:10, padding:"10px 12px", marginBottom:7 }}>
                  <div style={{ fontWeight:700, fontSize:12.5, color:"#ffcc80" }}>{p.nom}</div>
                  <div style={{ fontSize:11.5, color:G.soft, marginTop:3 }}>Description détaillée, cause et solution concrète adaptées à ta pelouse…</div>
                </div>
              ))}
            </div>
            <div style={{ background:G.card, border:G.border, borderRadius:14, padding:16 }}>
              <div style={{ fontWeight:800, fontSize:13, color:G.muted, marginBottom:6 }}>📅 Ton plan d'entretien</div>
              <div style={{ fontSize:12, color:G.soft }}>Actions urgentes, prochaines étapes, recommandations produits…</div>
            </div>
          </div>
          {/* Overlay CTA */}
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            background:"linear-gradient(180deg,rgba(13,37,25,0.55),rgba(13,37,25,0.9))", padding:22, textAlign:"center" }}>
            <div style={{ fontSize:30, marginBottom:8 }}>🔓</div>
            <div style={{ fontSize:17, fontWeight:900, color:G.text, marginBottom:6, lineHeight:1.3 }}>Débloque ton analyse complète</div>
            <div style={{ fontSize:13, color:G.muted, marginBottom:16, lineHeight:1.55, maxWidth:300 }}>
              Les solutions de Bob, ton plan d'entretien et ton suivi — <b>+ 7 jours de Premium offerts</b>. Ton diagnostic est déjà prêt, on le garde pour toi.
            </div>
            <button onClick={() => goSignup("result")} style={{ ...btnPrimary, width:"auto", padding:"14px 26px" }}>Créer mon compte gratuit →</button>
            <div style={{ fontSize:11, color:G.soft, marginTop:12 }}>Sans carte bancaire · 1 clic avec Google</div>
          </div>
        </div>

        <div style={{ fontSize:11.5, color:G.faint, textAlign:"center" }}>Puis l'app reste gratuite — tu ne perds rien.</div>
      </Shell>
    );
  }

  // ── MUR (quota gratuit atteint) ──
  if (view === "wall") return (
    <Shell>
      <div style={{ background:G.card, border:G.border, borderRadius:18, padding:26, textAlign:"center", marginTop:20 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🌱</div>
        <div style={{ fontSize:19, fontWeight:900, marginBottom:8 }}>Tu as utilisé ton diagnostic gratuit</div>
        <div style={{ fontSize:14, color:G.soft, marginBottom:20, lineHeight:1.6 }}>
          Crée ton compte pour des diagnostics illimités, l'analyse complète et ton suivi — <b style={{ color:G.muted }}>+ 7 jours de Premium offerts</b>.
        </div>
        <button onClick={() => goSignup("wall")} style={{ ...btnPrimary, width:"auto", padding:"14px 26px" }}>Créer mon compte gratuit →</button>
        <div style={{ fontSize:12, color:G.soft, marginTop:14 }}>Déjà un compte ? <button onClick={() => navigate("/login")} style={{ background:"none", border:"none", color:G.accent, fontWeight:800, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Se connecter</button></div>
      </div>
    </Shell>
  );

  return <Shell><div /></Shell>;
}
