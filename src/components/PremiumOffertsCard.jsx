// src/components/PremiumOffertsCard.jsx
// Pilotage → Finances : Premium offerts (famille, bêta-testeurs…).
// Ajout par email, date de fin (vide = à vie), retrait. Fin automatique par la tâche du matin.
import { useState, useEffect } from "react";
import { card, cardTitle } from "../lib/styles";

const field = { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"7px 8px", color:"#e8f5e9", fontSize:12, fontFamily:"inherit", minWidth:0 };
const small = { border:"none", borderRadius:8, padding:"7px 9px", fontSize:12, cursor:"pointer" };
const frDate = (d) => new Date(d).toLocaleDateString("fr-FR");

export default function PremiumOffertsCard({ getToken }) {
  const [guests, setGuests] = useState(null);
  const [edits, setEdits]   = useState({});   // userId → { until, label }
  const [form, setForm]     = useState({ email:"", label:"", until:"" });
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState("");

  async function call(body) {
    setBusy(true); setMsg("");
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=guests", {
        method:  body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setGuests(data.guests);
      setEdits({});
      if (body) setMsg("✅ Enregistré");
      return true;
    } catch (e) {
      setMsg("❌ " + e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { call(); }, []); // eslint-disable-line

  const add = async () => {
    if (!form.email.trim()) return setMsg("❌ Saisis l'email du compte");
    if (await call({ action:"add", email: form.email.trim(), label: form.label.trim() || null, until: form.until || null }))
      setForm({ email:"", label:"", until:"" });
  };

  return (
    <div style={card()}>
      <div style={cardTitle}><span>🎁 Premium offerts</span><span style={{ fontSize:11, color:"#81c784" }}>{guests ? guests.length : "…"}</span></div>
      {msg && <div style={{ fontSize:12, color: msg.startsWith("✅") ? "#a5d6a7" : "#ef9a9a", marginBottom:8 }}>{msg}</div>}

      {(guests || []).map(g => {
        const e = edits[g.userId] || { until: g.until || "", label: g.label || "" };
        const changed = edits[g.userId] && (e.until !== (g.until || "") || e.label !== (g.label || ""));
        const set = (k, v) => setEdits(x => ({ ...x, [g.userId]: { ...e, [k]: v } }));
        return (
          <div key={g.userId} style={{ padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.name || g.email}</div>
            <div style={{ fontSize:10, color:"#81c784", marginBottom:6 }}>
              {g.name && `${g.email} · `}{g.until ? `jusqu'au ${frDate(g.until)}` : "à vie"} · {g.lastActive ? `vu le ${frDate(g.lastActive)}` : "jamais connecté"}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <input placeholder="Libellé" value={e.label} onChange={ev => set("label", ev.target.value)} style={{ ...field, flex:1 }} />
              <input type="date" value={e.until} onChange={ev => set("until", ev.target.value)} title="Vide = à vie" style={{ ...field, width:130 }} />
              {changed && (
                <button disabled={busy} onClick={() => call({ action:"update", userId: g.userId, until: e.until || null, label: e.label.trim() || null })}
                  style={{ ...small, background:"rgba(76,175,80,0.25)", color:"#a5d6a7" }}>✓</button>
              )}
              <button disabled={busy} onClick={() => { if (confirm(`Retirer le Premium offert de ${g.email} ?`)) call({ action:"remove", userId: g.userId }); }}
                style={{ ...small, background:"rgba(198,40,40,0.15)", color:"#ef9a9a" }}>✕</button>
            </div>
          </div>
        );
      })}

      <div style={{ fontSize:12, fontWeight:700, color:"#a5d6a7", margin:"12px 0 6px" }}>➕ Offrir le Premium</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <input type="email" placeholder="Email du compte (déjà inscrit)" value={form.email} onChange={ev => setForm(f => ({ ...f, email: ev.target.value }))} style={field} />
        <div style={{ display:"flex", gap:6 }}>
          <input placeholder="Libellé (ex. Famille)" value={form.label} onChange={ev => setForm(f => ({ ...f, label: ev.target.value }))} style={{ ...field, flex:1 }} />
          <input type="date" value={form.until} onChange={ev => setForm(f => ({ ...f, until: ev.target.value }))} title="Vide = à vie" style={{ ...field, width:130 }} />
        </div>
        <button disabled={busy} onClick={add} style={{ ...small, padding:"9px", background:"rgba(76,175,80,0.2)", border:"1px solid #43a047", color:"#a5d6a7", fontWeight:700 }}>
          {busy ? "…" : "Offrir le Premium"}
        </button>
      </div>
      <div style={{ fontSize:10, color:"#4a7c5c", lineHeight:1.5, marginTop:8 }}>
        Date vide = à vie. La date est le dernier jour inclus : le Premium est retiré automatiquement le lendemain matin.
      </div>
    </div>
  );
}
