// src/components/CodesCreateursCard.jsx
// Pilotage → Finances : codes créateurs (influenceurs) avec inscrits, actifs, abonnés, chiffre d'affaires et commission due,
// et résumé du parrainage entre utilisateurs. Règles : api/parrainage.cjs.
import { useState, useEffect } from "react";
import { card, cardTitle } from "../lib/styles";

const field = { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"7px 8px", color:"#e8f5e9", fontSize:12, fontFamily:"inherit", minWidth:0 };
const small = { border:"none", borderRadius:8, padding:"7px 9px", fontSize:12, cursor:"pointer" };
const euros = (n) => `${Number(n || 0).toFixed(2).replace(".", ",")} €`;
const VIDE = { code:"", nom:"", email:"", commissionPct:"30", dureeMois:"12" };

export default function CodesCreateursCard({ getToken }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(VIDE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");

  async function call(body) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/stats?type=codes", {
        method:  body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${await getToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || `HTTP ${res.status}`);
      setData(d);
      if (body) setMsg("✅ Enregistré");
      return true;
    } catch (e) { setMsg("❌ " + e.message); return false; }
    finally { setBusy(false); }
  }

  useEffect(() => { call(); }, []); // eslint-disable-line

  const ajouter = async () => { if (await call(form)) setForm(VIDE); };
  const basculer = (c) => call({ code: c.code, nom: c.nom, email: c.email, commissionPct: c.commissionPct, dureeMois: c.dureeMois, actif: !c.actif });
  const p = data?.parrainage;

  return (
    <div style={card()}>
      <div style={cardTitle}><span>🎟️ Codes créateurs & parrainage</span><span style={{ fontSize:11, color:"#81c784" }}>{data ? data.createurs.length : "…"}</span></div>
      {msg && <div style={{ fontSize:12, color: msg.startsWith("✅") ? "#a5d6a7" : "#ef9a9a", marginBottom:8 }}>{msg}</div>}

      {(data?.createurs || []).map(c => (
        <div key={c.code} style={{ padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", opacity: c.actif ? 1 : 0.5 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#ffe082" }}>{c.code} <span style={{ fontSize:11, fontWeight:600, color:"#c8e6c9" }}>{c.nom || ""}</span></div>
            <button disabled={busy} onClick={() => basculer(c)} style={{ ...small, background:"rgba(255,255,255,0.08)", color:"#c8e6c9" }}>{c.actif ? "Désactiver" : "Réactiver"}</button>
          </div>
          <div style={{ fontSize:11, color:"#81c784", marginTop:3 }}>
            {c.inscrits} inscrit{c.inscrits > 1 ? "s" : ""} · {c.actifs} actif{c.actifs > 1 ? "s" : ""} · {c.abonnes} abonné{c.abonnes > 1 ? "s" : ""} · CA {euros(c.ca)} · commission {c.commissionPct} % = <b style={{ color:"#e8f5e9" }}>{euros(c.commission)}</b>
          </div>
          <div style={{ fontSize:10, color:"#4a7c5c", marginTop:2, wordBreak:"break-all" }}>{c.lien} · {c.dureeMois} mois de commission{c.email ? ` · ${c.email}` : ""}</div>
        </div>
      ))}

      <div style={{ fontSize:12, fontWeight:700, color:"#a5d6a7", margin:"12px 0 6px" }}>➕ Nouveau code créateur</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"flex", gap:6 }}>
          <input placeholder="CODE (ex. DRGAZON)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={16} style={{ ...field, flex:1 }} />
          <input placeholder="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={{ ...field, flex:1 }} />
        </div>
        <input type="email" placeholder="Email du créateur (facultatif)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={field} />
        <div style={{ display:"flex", gap:6, alignItems:"center", fontSize:11, color:"#81c784" }}>
          Commission <input type="number" min="0" max="100" value={form.commissionPct} onChange={e => setForm(f => ({ ...f, commissionPct: e.target.value }))} style={{ ...field, width:56 }} /> %
          pendant <input type="number" min="1" max="36" value={form.dureeMois} onChange={e => setForm(f => ({ ...f, dureeMois: e.target.value }))} style={{ ...field, width:56 }} /> mois
        </div>
        <button disabled={busy || !form.code} onClick={ajouter} style={{ ...small, padding:"9px", background:"rgba(76,175,80,0.2)", border:"1px solid #43a047", color:"#a5d6a7", fontWeight:700 }}>
          {busy ? "…" : "Créer le code"}
        </button>
      </div>

      {p && (
        <div style={{ fontSize:11, color:"#81c784", marginTop:12, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          👥 Parrainage entre utilisateurs : {p.parrains} parrain{p.parrains > 1 ? "s" : ""} · {p.filleuls} filleul{p.filleuls > 1 ? "s" : ""} · {p.recompenses} mois offert{p.recompenses > 1 ? "s" : ""} aux parrains
        </div>
      )}
      <div style={{ fontSize:10, color:"#4a7c5c", lineHeight:1.5, marginTop:8 }}>
        Lien à donner : mongazon360.fr/?p=CODE (ou code saisi à l'inscription) → 1 mois offert au filleul. Commission = % des paiements Stripe des filleuls abonnés pendant la durée indiquée, à verser au créateur.
      </div>
    </div>
  );
}
