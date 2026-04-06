// src/pages/Diagnostic.jsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { useDiagnostic } from "../lib/useDiagnostic";
import { calcLawnScore } from "../lib/lawnScore";
import { useHistory } from "../lib/useHistory";
import { card, cardTitle, btn, scroll } from "../lib/styles";

const SEV_COLORS = {
  faible:   { bg:"rgba(76,175,80,0.15)",   border:"rgba(76,175,80,0.4)",   text:"#a5d6a7", badge:"#2e7d32" },
  moyenne:  { bg:"rgba(255,152,0,0.15)",    border:"rgba(255,152,0,0.4)",   text:"#ffcc80", badge:"#e65100" },
  elevee:   { bg:"rgba(244,67,54,0.15)",    border:"rgba(244,67,54,0.4)",   text:"#ef9a9a", badge:"#c62828" },
  critique: { bg:"rgba(183,28,28,0.25)",    border:"rgba(229,57,53,0.6)",   text:"#ef9a9a", badge:"#b71c1c" },
};

const ETAT_COLORS = {
  excellent: "#43a047", bon: "#66bb6a", moyen: "#ffa726",
  mauvais:   "#ef5350", critique: "#c62828",
};

export default function Diagnostic() {
  const navigate   = useNavigate();
  const { profile }  = useProfile();
  const { weather }  = useWeather() || {};
  const { isPaid, isAdmin } = useSubscription() || {};
  const { history = [] } = useHistory();
  const { diagnostics, save } = useDiagnostic();

  const [view, setView]         = useState("home");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [preview, setPreview]   = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [result, setResult]     = useState(null);
  const [selected, setSelected] = useState(null);

  const fileRef    = useRef(); // caméra (capture="environment")
  const galleryRef = useRef(); // galerie (sans capture)

  const { score } = calcLawnScore({ weather, profile, history, month: new Date().getMonth()+1 });
  const canUse = isPaid || isAdmin;

  const handleFile = (file) => {
    if (!file) return;
    setMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const full = e.target.result;
      setPreview(full);
      setImageB64(full.split(",")[1]);
      setView("camera");
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => { handleFile(e.target.files[0]); e.target.value = ""; };

  const analyze = async () => {
    if (!imageB64) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze-lawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageB64, mimeType, profile: profile || {}, weather: weather || {}, score })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erreur serveur");
      const diag = { id: Date.now().toString(), date: data.date, imageUrl: data.imageUrl, analysis: data.analysis, scoreAvant: score };
      save(diag);
      setResult(diag);
      setView("result");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setView("home"); setPreview(null); setImageB64(null); setResult(null); setError(""); };

  // Inputs cachés partagés entre toutes les vues
  const hiddenInputs = (
    <>
      <input ref={fileRef}    type="file" accept="image/*" capture="environment" onChange={handleInputChange} style={{ display:"none" }} />
      <input ref={galleryRef} type="file" accept="image/*"                       onChange={handleInputChange} style={{ display:"none" }} />
    </>
  );

  // Boutons photo réutilisables
  const photoButtons = (label1="📷 Prendre une photo", label2="🖼️ Choisir depuis la galerie") => (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <button onClick={() => fileRef.current.click()}    style={{ ...btn.primary, fontSize:14, padding:"14px" }}>{label1}</button>
      <button onClick={() => galleryRef.current.click()} style={{ ...btn.ghost,   fontSize:14, padding:"14px" }}>{label2}</button>
    </div>
  );

  // ── VUE ACCUEIL ──────────────────────────────────────────────────────────
  if (view === "home") return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Diagnostic Photo</div>
            <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>Analyse IA de votre gazon</div>
          </div>
        </div>
      </div>
      <div style={scroll}>
        {hiddenInputs}

        {!canUse ? (
          <div style={{ ...card(), textAlign:"center", padding:24, background:"rgba(15,47,31,0.6)", border:"1px solid rgba(102,187,106,0.2)" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#66BB6A", marginBottom:8 }}>Diagnostic Photo — Premium</div>
            <div style={{ fontSize:13, color:"#81c784", lineHeight:1.6, marginBottom:16 }}>
              Prenez une photo de votre gazon et laissez l'IA détecter les maladies, carences et problèmes en quelques secondes.
            </div>

            {/* Avant / Après floutés */}
            <div style={{ display:"flex", gap:8, marginBottom:16, borderRadius:14, overflow:"hidden" }}>
              <div style={{ flex:1, position:"relative" }}>
                <img src="/gazon-avant.jpg" alt="Avant" style={{ width:"100%", height:110, objectFit:"cover", filter:"blur(3px) brightness(0.7)", borderRadius:10 }} />
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#ef9a9a", background:"rgba(0,0,0,0.5)", borderRadius:20, padding:"2px 10px" }}>AVANT</div>
                </div>
              </div>
              <div style={{ flex:1, position:"relative" }}>
                <img src="/gazon-apres.jpg" alt="Après" style={{ width:"100%", height:110, objectFit:"cover", filter:"blur(3px) brightness(0.7)", borderRadius:10 }} />
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#66BB6A", background:"rgba(0,0,0,0.5)", borderRadius:20, padding:"2px 10px" }}>APRÈS</div>
                </div>
              </div>
            </div>
            <div style={{ fontSize:11, color:"#4a7c5c", marginBottom:16, fontStyle:"italic" }}>
              🔒 Résultats réels d'un utilisateur Premium — débloquez le diagnostic pour voir votre gazon évoluer
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              {[
                "🦠 Détection maladies, carences et zones mortes",
                "⚡ Résultat en moins de 10 secondes",
                "📈 +15 pts de score en moyenne après action",
                "💰 Économisez sur les produits inutiles",
                "🏆 +100 GreenPoints + profil complété à 100%",
              ].map(f => (
                <div key={f} style={{ fontSize:12, color:"#81c784", textAlign:"left" }}>✓ {f}</div>
              ))}
            </div>
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"12px 28px" }}>
              ⭐ Passer Premium
            </button>
          </div>
        ) : (
          <>
            <div style={{ ...card(), background:"linear-gradient(135deg,rgba(15,47,31,0.7),rgba(27,94,32,0.4))", border:"1px solid rgba(102,187,106,0.25)", textAlign:"center", padding:24 }}>
              <div style={{ fontSize:52, marginBottom:12 }}>📸</div>
              <div style={{ fontSize:16, fontWeight:800, color:"#F1F8F2", marginBottom:8 }}>Photographiez votre gazon</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.6, marginBottom:20 }}>
                Prenez une photo en pleine lumière à environ 1m du sol pour un diagnostic précis.
              </div>
              {photoButtons()}
            </div>

            <div style={card()}>
              <div style={cardTitle}><span>💡 Pour un meilleur diagnostic</span></div>
              {[
                ["☀️","Lumière naturelle","Photographiez en plein jour, sans ombre portée"],
                ["📐","Distance","À environ 50cm-1m du sol, gazon visible en entier"],
                ["🎯","Cadrage","Incluez la zone problématique bien centrée"],
                ["🔍","Netteté","Photo nette et bien exposée — pas de flou"],
              ].map(([icon, label, tip]) => (
                <div key={icon} style={{ display:"flex", gap:10, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                  <span style={{ fontSize:16, minWidth:24 }}>{icon}</span>
                  <div><span style={{ fontWeight:700 }}>{label} — </span><span style={{ color:"#81c784" }}>{tip}</span></div>
                </div>
              ))}
            </div>

            {diagnostics.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}>
                  <span>🕐 Derniers diagnostics</span>
                  <button onClick={() => setView("history")} style={{ background:"rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer" }}>
                    Voir tout ({diagnostics.length})
                  </button>
                </div>
                {diagnostics.slice(0, 3).map(d => (
                  <div key={d.id} onClick={() => { setSelected(d); setView("history"); }}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", cursor:"pointer" }}>
                    <img src={d.imageUrl} alt="gazon" style={{ width:44, height:44, borderRadius:8, objectFit:"cover" }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700 }}>{d.analysis.emoji} {d.analysis.etat_general}</div>
                      <div style={{ fontSize:11, color:"#81c784" }}>{new Date(d.date).toLocaleDateString("fr-FR")}</div>
                    </div>
                    <div style={{ fontSize:18, fontWeight:800, color: ETAT_COLORS[d.analysis.etat_general] || "#a5d6a7" }}>
                      {d.analysis.score_visuel}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── VUE PREVIEW ──────────────────────────────────────────────────────────
  if (view === "camera") return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>📸 Vérification photo</div>
      </div>
      <div style={scroll}>
        {hiddenInputs}
        {error && (
          <div style={{ background:"rgba(198,40,40,0.2)", border:"1px solid #c62828", borderRadius:12, padding:"12px 16px", marginBottom:12, fontSize:13, color:"#ef9a9a" }}>
            ⚠️ {error}
          </div>
        )}
        {preview && (
          <div style={{ borderRadius:16, overflow:"hidden", marginBottom:16 }}>
            <img src={preview} alt="preview" style={{ width:"100%", maxHeight:320, objectFit:"cover", display:"block" }} />
          </div>
        )}
        <div style={{ ...card(), textAlign:"center", padding:16 }}>
          <div style={{ fontSize:13, color:"#81c784", marginBottom:16, lineHeight:1.6 }}>
            La photo est-elle nette et bien exposée ?
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={analyze} disabled={loading} style={{ ...btn.primary, fontSize:14, padding:"14px", opacity: loading ? 0.7 : 1 }}>
              {loading ? "🔍 Analyse en cours..." : "🔬 Lancer le diagnostic IA"}
            </button>
            <button onClick={() => fileRef.current.click()}    style={{ ...btn.ghost, fontSize:13 }}>📷 Reprendre une photo</button>
            <button onClick={() => galleryRef.current.click()} style={{ ...btn.ghost, fontSize:13 }}>🖼️ Choisir depuis la galerie</button>
            <button onClick={reset} style={{ background:"none", border:"none", color:"#81c784", fontSize:12, cursor:"pointer", padding:"4px" }}>← Retour</button>
          </div>
        </div>
        {loading && (
          <div style={{ ...card(), textAlign:"center", padding:20 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🌿</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#a5d6a7", marginBottom:8 }}>Analyse en cours...</div>
            <div style={{ fontSize:12, color:"#81c784", lineHeight:1.8 }}>
              1. Upload de la photo sur le serveur<br/>
              2. Analyse par Gemini Vision IA<br/>
              3. Génération du rapport
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── VUE RÉSULTAT ──────────────────────────────────────────────────────────
  if (view === "result" && result) {
    const { analysis, imageUrl, scoreAvant } = result;
    const scoreDiff = analysis.score_visuel - scoreAvant;
    const etatColor = ETAT_COLORS[analysis.etat_general] || "#a5d6a7";
    return (
      <div>
        <div style={header}>
          <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🔬 Résultat du diagnostic</div>
          <div style={{ fontSize:11, color:"#81c784", marginTop:4 }}>
            {new Date(result.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", hour:"2-digit", minute:"2-digit" })}
          </div>
        </div>
        <div style={scroll}>
          {hiddenInputs}

          <div style={{ ...card(), background:"linear-gradient(135deg,rgba(27,94,32,0.4),rgba(13,43,26,0.6))", border:`1px solid ${etatColor}44`, textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:8 }}>{analysis.emoji}</div>
            <div style={{ fontSize:32, fontWeight:800, color:etatColor }}>{analysis.score_visuel}<span style={{ fontSize:18 }}>/100</span></div>
            <div style={{ fontSize:14, fontWeight:700, color:etatColor, marginBottom:8, textTransform:"capitalize" }}>{analysis.etat_general}</div>
            {scoreDiff !== 0 && (
              <div style={{ fontSize:12, color: scoreDiff > 0 ? "#a5d6a7" : "#ef9a9a", marginBottom:8 }}>
                {scoreDiff > 0 ? "+" : ""}{scoreDiff} pts vs score calculé ({scoreAvant}/100)
              </div>
            )}
            <div style={{ fontSize:13, color:"#81c784", lineHeight:1.6, fontStyle:"italic" }}>"{analysis.resume}"</div>
          </div>

          <div style={{ borderRadius:16, overflow:"hidden" }}>
            <img src={imageUrl} alt="gazon analysé" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} />
          </div>

          {analysis.points_positifs?.length > 0 && (
            <div style={{ ...card(), background:"rgba(76,175,80,0.08)", border:"1px solid rgba(76,175,80,0.25)" }}>
              <div style={cardTitle}><span>✅ Points positifs</span></div>
              {analysis.points_positifs.map((p, i) => (
                <div key={i} style={{ fontSize:12, color:"#a5d6a7", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>✓ {p}</div>
              ))}
            </div>
          )}

          {analysis.problemes?.length > 0 && (
            <div style={card()}>
              <div style={cardTitle}><span>⚠️ Problèmes détectés ({analysis.problemes.length})</span></div>
              {analysis.problemes.map((prob) => {
                const c = SEV_COLORS[prob.severite] || SEV_COLORS.moyenne;
                return (
                  <div key={prob.id} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:c.text }}>{prob.nom}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ background:c.badge, color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{prob.severite}</span>
                        <span style={{ fontSize:11, color:"#ef9a9a", fontWeight:700 }}>{prob.impact_score} pts</span>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:"#81c784", marginBottom:6 }}>{prob.description}</div>
                    <div style={{ fontSize:11, color:"#a5d6a7", fontStyle:"italic" }}>💊 {prob.solution}</div>
                  </div>
                );
              })}
            </div>
          )}

          {analysis.actions_urgentes?.length > 0 && (
            <div style={{ ...card(), background:"rgba(198,40,40,0.08)", border:"1px solid rgba(198,40,40,0.25)" }}>
              <div style={cardTitle}><span>🚨 Actions urgentes</span></div>
              {analysis.actions_urgentes.map((a, i) => (
                <div key={i} style={{ display:"flex", gap:10, fontSize:12, color:"#ef9a9a", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span>⚡</span><span>{a}</span>
                </div>
              ))}
            </div>
          )}

          {analysis.actions_prochaines?.length > 0 && (
            <div style={card()}>
              <div style={cardTitle}><span>📅 Prochainement</span></div>
              {analysis.actions_prochaines.map((a, i) => (
                <div key={i} style={{ display:"flex", gap:10, fontSize:12, color:"#81c784", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span>→</span><span>{a}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:10, paddingBottom:24 }}>
            <button onClick={() => { setPreview(null); setImageB64(null); fileRef.current.click(); }}
              style={{ ...btn.primary, fontSize:14, padding:"14px" }}>📷 Nouveau diagnostic — photo</button>
            <button onClick={() => { setPreview(null); setImageB64(null); galleryRef.current.click(); }}
              style={{ ...btn.ghost, fontSize:14, padding:"14px" }}>🖼️ Nouveau diagnostic — galerie</button>
            <button onClick={() => setView("history")} style={{ ...btn.ghost, fontSize:13 }}>🕐 Voir l'historique</button>
            <button onClick={reset} style={{ background:"none", border:"none", color:"#81c784", fontSize:12, cursor:"pointer" }}>
              ← Retour à l'accueil diagnostic
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── VUE HISTORIQUE ────────────────────────────────────────────────────────
  if (view === "history") {
    if (selected) {
      const { analysis, imageUrl } = selected;
      const etatColor = ETAT_COLORS[analysis.etat_general] || "#a5d6a7";
      return (
        <div>
          <div style={{ padding:"48px 20px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"#F1F8F2" }}>Diagnostic Photo</div>
                <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>{new Date(selected.date).toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
          </div>
          <div style={scroll}>
            <div style={{ borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              <img src={imageUrl} alt="gazon" style={{ width:"100%", maxHeight:220, objectFit:"cover", display:"block" }} />
            </div>
            <div style={{ ...card(), textAlign:"center" }}>
              <div style={{ fontSize:40 }}>{analysis.emoji}</div>
              <div style={{ fontSize:28, fontWeight:800, color:etatColor }}>{analysis.score_visuel}/100</div>
              <div style={{ fontSize:13, color:etatColor, textTransform:"capitalize", marginBottom:6 }}>{analysis.etat_general}</div>
              <div style={{ fontSize:12, color:"#81c784", fontStyle:"italic" }}>"{analysis.resume}"</div>
            </div>
            {analysis.problemes?.length > 0 && (
              <div style={card()}>
                <div style={cardTitle}><span>Problèmes détectés</span></div>
                {analysis.problemes.map(prob => {
                  const c = SEV_COLORS[prob.severite] || SEV_COLORS.moyenne;
                  return (
                    <div key={prob.id} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:10, padding:"10px 12px", marginBottom:6 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:c.text, marginBottom:4 }}>{prob.nom} <span style={{ color:"#ef9a9a" }}>({prob.impact_score} pts)</span></div>
                      <div style={{ fontSize:11, color:"#81c784" }}>{prob.description}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setSelected(null)} style={{ ...btn.ghost, marginBottom:24 }}>← Retour historique</button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={{ padding:"48px 20px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Historique</div>
              <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>{diagnostics.length} diagnostic{diagnostics.length>1?"s":""} enregistré{diagnostics.length>1?"s":""}</div>
            </div>
          </div>
        </div>
        <div style={scroll}>
          {diagnostics.length === 0 ? (
            <div style={{ ...card(), textAlign:"center", padding:24 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
              <div style={{ fontSize:14, color:"#81c784" }}>Aucun diagnostic encore</div>
            </div>
          ) : (
            diagnostics.map(d => {
              const etatColor = ETAT_COLORS[d.analysis.etat_general] || "#a5d6a7";
              return (
                <div key={d.id} onClick={() => setSelected(d)} style={{ ...card(), cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:14 }}>
                  <img src={d.imageUrl} alt="gazon" style={{ width:64, height:64, borderRadius:12, objectFit:"cover", flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>
                      {d.analysis.emoji} <span style={{ textTransform:"capitalize" }}>{d.analysis.etat_general}</span>
                    </div>
                    <div style={{ fontSize:11, color:"#81c784", marginBottom:4 }}>
                      {new Date(d.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })}
                    </div>
                    {d.analysis.problemes?.length > 0 && (
                      <div style={{ fontSize:10, color:"#ef9a9a" }}>
                        ⚠️ {d.analysis.problemes.length} problème{d.analysis.problemes.length>1?"s":""}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:22, fontWeight:800, color:etatColor }}>{d.analysis.score_visuel}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>/100</div>
                  </div>
                </div>
              );
            })
          )}
          <button onClick={reset} style={{ ...btn.ghost, marginBottom:24 }}>← Retour accueil</button>
        </div>
      </div>
    );
  }

  return null;
}
