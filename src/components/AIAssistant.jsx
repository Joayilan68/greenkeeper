// src/components/AIAssistant.jsx
// Bouton flottant + modal chat IA — tous les comptes connectés.
// Quota vérifié côté serveur (api/ai-assistant.js) : Premium 20 questions/jour, gratuit 3/mois.
// ════════════════════════════════════════════════════════════════════════════
// Conforme à l'exigence avocat (Cabinet Victoris) :
//   Mention 3 — Bandeau permanent indiquant que Bob est une IA, peut contenir
//   des inexactitudes et ne remplace pas l'avis d'un professionnel.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { isAndroidTWA } from "../lib/platform";
import { useProfile } from "../lib/useProfile";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { calcLawnScore } from "../lib/lawnScore";
import { useHistory } from "../lib/useHistory";

// Questions suggérées selon la saison
const SUGGESTIONS = {
  printemps: ["Quand faire ma première tonte ?", "Faut-il scarifier ce printemps ?", "Quel engrais de printemps choisir ?", "Comment regarnir les trous de l'hiver ?"],
  ete:       ["Combien arroser par forte chaleur ?", "Mon gazon jaunit, pourquoi ?", "À quelle hauteur tondre en été ?", "Faut-il arroser un gazon en dormance ?"],
  automne:   ["Quand regarnir mon gazon ?", "Comment éliminer la mousse ?", "Quel engrais d'automne choisir ?", "Faut-il ramasser les feuilles mortes ?"],
  hiver:     ["Comment préparer mon gazon pour l'hiver ?", "Peut-on marcher sur un gazon gelé ?", "Faut-il chauler ma pelouse ?", "Comment hiverner ma tondeuse ?"],
};
const saison = (m) => m >= 3 && m <= 5 ? "printemps" : m >= 6 && m <= 8 ? "ete" : m >= 9 && m <= 11 ? "automne" : "hiver";
const HISTORY_MAX = 20; // messages gardés sur l'appareil

// ── Message d'accueil avec mention IA obligatoire ──────────────────────────
const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Salut ! 🌿 Moi c'est Bob, ton assistant gazon.\n\n⚠️ Je suis une IA : mes réponses peuvent contenir des inexactitudes et ne remplacent pas l'avis d'un professionnel du jardinage.\n\nPose-moi tes questions sur ta pelouse et ton jardin !",
};

// Mise en forme légère des réponses de Bob (titres, gras, listes, liens vers mongazon360.fr), sans HTML injecté
const LIEN = /\[([^\]]+)\]\((https:\/\/mongazon360\.fr\/[^\s)]*)\)/;
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/mongazon360\.fr\/[^\s)]*\))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const lien = part.match(LIEN);
    if (lien) return <a key={i} href={lien[2]} style={{ color:"#a5d6a7", fontWeight:700 }}>{lien[1]}</a>;
    return part;
  });
}
function BobText({ text }) {
  return text.split("\n").map((line, i) => {
    const titre = line.match(/^#{1,6}\s+(.*)$/);
    if (titre) return <div key={i} style={{ fontWeight:800, color:"#a5d6a7", marginTop:i ? 6 : 0 }}>{inline(titre[1])}</div>;
    const puce = line.match(/^\s*[-*•]\s+(.*)$/);
    if (puce) return <div key={i} style={{ paddingLeft:14, textIndent:-10 }}>• {inline(puce[1])}</div>;
    return line.trim() ? <div key={i}>{inline(line)}</div> : <div key={i} style={{ height:8 }} />;
  });
}

function TypingIndicator() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"10px 14px", background:"rgba(255,255,255,0.06)", borderRadius:"18px 18px 18px 4px", width:"fit-content", maxWidth:80 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#81c784", animation:`bounce 1s infinite ${i*0.2}s` }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  );
}

export default function AIAssistant() {
  const { getToken }       = useAuth();
  const { user }           = useUser();
  const navigate           = useNavigate();
  const { profile }        = useProfile();
  const { weather }        = useWeather() || {};
  const { history = [] }   = useHistory();
  const { isPaid = false, isAdmin = false } = useSubscription() || {};

  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const storeKey = user?.id ? `mg360_bob_${user.id}` : null;
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [quota, setQuota]       = useState(null); // { remaining, limit, period } | { unlimited }

  // Conversation gardée sur l'appareil (par compte)
  useEffect(() => {
    if (!storeKey) return;
    try { const saved = JSON.parse(localStorage.getItem(storeKey)); if (Array.isArray(saved) && saved.length) setMessages([WELCOME_MESSAGE, ...saved]); }
    catch { /* stockage indisponible */ }
  }, [storeKey]);
  useEffect(() => {
    if (!storeKey) return;
    try { localStorage.setItem(storeKey, JSON.stringify(messages.slice(1).slice(-HISTORY_MAX))); }
    catch { /* stockage indisponible */ }
  }, [messages, storeKey]);

  // Solde de questions, relu à chaque ouverture
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "quota" }),
        });
        if (res.ok) setQuota(await res.json());
      } catch { /* affichage du solde non bloquant */ }
    })();
  }, [open]); // eslint-disable-line

  const bottomRef = useRef();
  const inputRef  = useRef();
  const month     = new Date().getMonth() + 1;
  const { score } = calcLawnScore({ weather, profile, history, month });

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior:"smooth" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  const epuise = quota && !quota.unlimited && quota.remaining <= 0;

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading || epuise) return;
    setInput("");

    const newMessages = [...messages, { role:"user", content:userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const token = await getToken();
      const res  = await fetch("/api/ai-assistant", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.slice(1).slice(-10).map(m => ({ role:m.role, content:m.content })),
          profile:  profile || {},
          score,
          month,
        })
      });
      const data = await res.json();
      if (typeof data.remaining === "number") setQuota({ remaining: data.remaining, limit: data.limit, period: data.period });
      const fallback = res.status === 429
        ? (data.error || "Limite journalière atteinte. Revenez demain !")
        : "Désolé, une erreur est survenue.";
      setMessages(prev => [...prev, {
        role:"assistant",
        content: data.reply || fallback
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role:"assistant",
        content:"❌ Impossible de contacter Bob. Vérifie ta connexion."
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <>
      {/* ── BOUTON FLOTTANT ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:"fixed", bottom:80, right:16, zIndex:500,
          width:52, height:52, borderRadius:"50%",
          background: open ? "#c62828" : "linear-gradient(135deg,#2d7d52,#1a4731)",
          border:"2px solid rgba(165,214,167,0.4)",
          boxShadow:"0 4px 16px rgba(0,0,0,0.4)",
          cursor:"pointer", fontSize:22,
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all 0.2s",
        }}
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* ── MODAL CHAT ── */}
      {open && (
        <div style={{
          position:"fixed", bottom:140, right:16, left:16,
          zIndex:499, maxWidth:460, margin:"0 auto",
          background:"linear-gradient(180deg,#1a3d2b,#0d2b1a)",
          border:"1px solid rgba(165,214,167,0.25)",
          borderRadius:20, overflow:"hidden",
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          display:"flex", flexDirection:"column",
          maxHeight:"65vh",
        }}>

          {/* Header */}
          <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(67,160,71,0.2)", border:"1px solid rgba(67,160,71,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                🤖
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"#a5d6a7" }}>Bob</div>
                <div style={{ fontSize:10, color:"#81c784" }}>
                  Assistant gazon IA · Score : {score}/100
                  {isAdmin && " · 👑 Admin"}
                  {quota && !quota.unlimited && ` · ${quota.remaining}/${quota.limit} question${quota.limit > 1 ? "s" : ""} ${quota.period === "day" ? "aujourd'hui" : "ce mois-ci"}`}
                </div>
              </div>
            </div>
            <button onClick={clearChat} style={{ background:"none", border:"none", color:"#4a7c5c", fontSize:11, cursor:"pointer" }}>
              🗑️ Effacer
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MENTION 3 AVOCAT — BANDEAU PERMANENT INFO IA                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            padding: "8px 14px",
            background: "rgba(245,158,11,0.08)",
            borderBottom: "1px solid rgba(245,158,11,0.2)",
            fontSize: 10,
            color: "#fde68a",
            lineHeight: 1.4,
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
          }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>⚠️</span>
            <span>
              <strong>Bob est une IA.</strong> Ses réponses peuvent contenir des inexactitudes et <strong>ne remplacent pas l'avis d'un professionnel</strong> du jardinage.
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>

            {/* Suggestions au 1er message */}
            {messages.length === 1 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, color:"#4a7c5c", marginBottom:8, fontWeight:700, letterSpacing:1 }}>QUESTIONS FRÉQUENTES</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {SUGGESTIONS[saison(month)].map(s => (
                    <button key={s} onClick={() => sendMessage(s)} style={{ background:"rgba(67,160,71,0.12)", border:"1px solid rgba(67,160,71,0.3)", borderRadius:20, padding:"5px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Historique messages */}
            {messages.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth:"85%",
                  background: m.role === "user"
                    ? "linear-gradient(135deg,#2d7d52,#1a4731)"
                    : "rgba(255,255,255,0.06)",
                  border: m.role === "user"
                    ? "1px solid rgba(165,214,167,0.3)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: m.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  padding:"10px 14px",
                  fontSize:13, lineHeight:1.6, color:"#e8f5e9",
                  whiteSpace: m.role === "user" ? "pre-wrap" : "normal",
                }}>
                  {m.role === "assistant" ? <BobText text={m.content} /> : m.content}
                </div>
              </div>
            ))}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Questions épuisées */}
          {epuise && (
            <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,0.08)", fontSize:12, color:"#ffe082", lineHeight:1.5, flexShrink:0 }}>
              {quota.period === "day"
                ? "Tu as posé toutes tes questions du jour. Bob te retrouve demain ! 🌿"
                : <>Tes {quota.limit} questions gratuites du mois sont utilisées. Elles reviennent le 1er du mois.
                    {!isPaid && !isAndroidTWA() && <> <span onClick={() => { setOpen(false); navigate("/subscribe"); }} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer", fontWeight:700 }}>Passe Premium</span> pour 20 questions par jour.</>}</>}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", gap:8, flexShrink:0 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Pose ta question à Bob..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={loading || epuise}
              style={{
                flex:1, background:"rgba(255,255,255,0.08)",
                border:"1px solid rgba(165,214,167,0.25)",
                borderRadius:12, padding:"10px 14px",
                color:"#e8f5e9", fontSize:13, outline:"none",
                fontFamily:"inherit", opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                background: input.trim() && !loading ? "rgba(67,160,71,0.3)" : "rgba(255,255,255,0.06)",
                border:`1px solid ${input.trim() && !loading ? "rgba(67,160,71,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius:12, padding:"10px 14px",
                color: input.trim() && !loading ? "#a5d6a7" : "#4a7c5c",
                fontSize:16, cursor: input.trim() && !loading ? "pointer" : "default",
                transition:"all 0.2s",
              }}
            >
              {loading ? "⌛" : "➤"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
