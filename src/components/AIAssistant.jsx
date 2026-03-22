// src/components/AIAssistant.jsx
// Bouton flottant + modal chat IA — Premium & Admin uniquement

import { useState, useRef, useEffect } from "react";
import { useProfile } from "../lib/useProfile";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { calcLawnScore } from "../lib/lawnScore";
import { useHistory } from "../lib/useHistory";

const SUGGESTIONS = [
  "Quand faut-il tondre en mars ?",
  "Comment éliminer la mousse ?",
  "Mon gazon jaunit, pourquoi ?",
  "Quel engrais choisir ce mois ?",
  "Comment aérer mon sol argileux ?",
  "Fréquence d'arrosage idéale ?",
];

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
  // ── TOUS LES HOOKS EN PREMIER — règle absolue React ──────────────────────
  const { profile }        = useProfile();
  const { weather }        = useWeather() || {};
  const { history = [] }   = useHistory();
  const { isPaid = false, isAdmin = false } = useSubscription() || {};

  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{
    role:"assistant",
    content:"Bonjour ! 🌿 Je suis Ilan, votre assistant gazon. Posez-moi toutes vos questions sur l'entretien de votre pelouse !",
  }]);

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

  // ── RETURN CONDITIONNEL APRÈS TOUS LES HOOKS ─────────────────────────────
  if (!isPaid && !isAdmin) return null;

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages = [...messages, { role:"user", content:userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res  = await fetch("/api/ai-assistant", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role:m.role, content:m.content })),
          profile:  profile || {},
          weather:  weather || {},
          score,
          month,
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role:"assistant",
        content: data.reply || "Désolé, une erreur est survenue."
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role:"assistant",
        content:"❌ Impossible de contacter l'assistant. Vérifiez votre connexion."
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{
      role:"assistant",
      content:"Bonjour ! 🌿 Je suis Ilan, votre assistant gazon. Posez-moi toutes vos questions sur l'entretien de votre pelouse !"
    }]);
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
                <div style={{ fontSize:14, fontWeight:800, color:"#a5d6a7" }}>Ilan</div>
                <div style={{ fontSize:10, color:"#81c784" }}>
                  Assistant gazon IA · Score : {score}/100
                  {isAdmin && " · 👑 Admin"}
                </div>
              </div>
            </div>
            <button onClick={clearChat} style={{ background:"none", border:"none", color:"#4a7c5c", fontSize:11, cursor:"pointer" }}>
              🗑️ Effacer
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>

            {/* Suggestions au 1er message */}
            {messages.length === 1 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, color:"#4a7c5c", marginBottom:8, fontWeight:700, letterSpacing:1 }}>QUESTIONS FRÉQUENTES</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {SUGGESTIONS.map(s => (
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
                  whiteSpace:"pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", gap:8, flexShrink:0 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Posez votre question à Ilan..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={loading}
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
