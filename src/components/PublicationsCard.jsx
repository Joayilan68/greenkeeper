// src/components/PublicationsCard.jsx
// Pilotage → Réseaux : lots de comm Facebook et Instagram préparés chaque samedi (api/reseaux.cjs).
// Jordan valide ou refuse chaque publication ; la tâche planifiée publie les validées le jour prévu, au créneau du matin
// (vers 7-8 h) ou du soir (vers 16-17 h) ; jour passé : plus d'action possible. Test de la connexion Meta sans rien publier.
import { useState, useEffect } from "react";
import { card, cardTitle } from "../lib/styles";

const small = { border:"none", borderRadius:8, padding:"7px 10px", fontSize:12, fontWeight:700, cursor:"pointer" };
const vert = { ...small, background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff" };
const gris = { ...small, background:"rgba(255,255,255,0.08)", color:"#c8e6c9" };
const STATUTS = {
  a_valider: { label:"À valider", color:"#f9a825" }, validee: { label:"Validée", color:"#90caf9" },
  publiee: { label:"Publiée", color:"#66bb6a" }, refusee: { label:"Refusée", color:"#9e9e9e" }, erreur: { label:"Erreur", color:"#ef9a9a" },
};
const CRENEAUX = { matin:"matin (vers 7-8 h)", soir:"soir (vers 16-17 h)" };
const jour = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short" });
// Visuel servi par le site lui-même (aperçu aussi visible sur STA)
const apercu = (url) => url.replace(/^https:\/\/mongazon360\.fr(?=\/)/, "");

export default function PublicationsCard({ getToken }) {
  const [pubs, setPubs]     = useState(null);
  const [compte, setCompte] = useState(null);
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState("");

  async function call(body) {
    setBusy(true); setMsg("");
    try {
      const token = await getToken();
      const res   = await fetch("/api/stats?type=publications", {
        method:  body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setPubs(data.publications);
      if (data.compte) setCompte(data.compte);
      return data;
    } catch (e) {
      setMsg("❌ " + e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { call(); }, []); // eslint-disable-line

  const tester = async () => {
    const d = await call({ action:"tester" });
    if (d) setMsg(`✅ Connexion Meta valide : page ${d.compte.page}${d.compte.instagram ? ` et Instagram @${d.compte.instagram}` : ", mais aucun compte Instagram professionnel relié"}. Rien n'a été publié.`);
  };

  const aujourdhui = new Date().toLocaleDateString("sv-SE", { timeZone:"Europe/Paris" });
  const lots = [...new Set((pubs || []).map(p => p.lot))].sort().reverse();
  const aValider = (pubs || []).filter(p => p.statut === "a_valider").length;

  return (
    <div style={card()}>
      <div style={cardTitle}><span>📣 Publications Facebook et Instagram</span><span style={{ fontSize:11, color:"#f9a825" }}>{pubs ? `${aValider} à valider` : "…"}</span></div>
      <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6, marginBottom:8 }}>
        Chaque samedi, le lot de la semaine suivante arrive ici. Une publication validée part toute seule le jour prévu, au créneau du matin ou du soir, sur la page Facebook et le compte Instagram de Mongazon360.
      </div>
      {msg && <div style={{ fontSize:12, color: msg.startsWith("✅") ? "#a5d6a7" : "#ef9a9a", marginBottom:8, lineHeight:1.5 }}>{msg}</div>}
      {pubs && !pubs.length && <div style={{ fontSize:12, color:"#a5d6a7", marginBottom:8 }}>Aucune publication pour l'instant : le prochain lot arrive samedi.</div>}

      {lots.map(lot => {
        const duLot = pubs.filter(p => p.lot === lot);
        const enAttente = duLot.filter(p => p.statut === "a_valider").length;
        return (
          <div key={lot} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, margin:"6px 0" }}>
              <span style={{ fontSize:12, fontWeight:800, color:"#e8f5e9" }}>Semaine du {jour(lot)}</span>
              {enAttente > 1 && <button onClick={() => call({ action:"valider_lot", lot })} disabled={busy} style={vert}>Tout valider ({enAttente})</button>}
            </div>
            {duLot.map(p => {
              const s = STATUTS[p.statut];
              return (
                <div key={p.id} style={{ display:"flex", gap:10, padding:"8px 0", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                  <img src={apercu(p.visuel)} alt="" width="64" height="80" loading="lazy" style={{ width:64, height:80, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
                  <div style={{ minWidth:0, flex:1, display:"grid", gap:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:6, alignItems:"baseline" }}>
                      <span style={{ fontSize:11, color:"#81c784" }}>{jour(p.date_publication)} · {CRENEAUX[p.creneau]}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:s.color, whiteSpace:"nowrap" }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>{p.titre}</div>
                    {p.erreur && <div style={{ fontSize:11, color:"#ef9a9a" }}>⚠️ {p.erreur}</div>}
                    <details>
                      <summary style={{ fontSize:11, color:"#a5d6a7", cursor:"pointer" }}>Voir les textes</summary>
                      <div style={{ fontSize:11, color:"#c8e6c9", whiteSpace:"pre-wrap", overflowWrap:"anywhere", margin:"6px 0" }}><b>Facebook</b>{"\n"}{p.texte_facebook}</div>
                      <div style={{ fontSize:11, color:"#c8e6c9", whiteSpace:"pre-wrap", overflowWrap:"anywhere" }}><b>Instagram</b>{"\n"}{p.texte_instagram}</div>
                    </details>
                    {p.date_publication >= aujourdhui && <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {p.statut === "a_valider" && <>
                        <button onClick={() => call({ action:"valider", id:p.id })} disabled={busy} style={vert}>Valider</button>
                        <button onClick={() => call({ action:"refuser", id:p.id })} disabled={busy} style={gris}>Refuser</button>
                      </>}
                      {(p.statut === "validee" || p.statut === "refusee") && <button onClick={() => call({ action:"remettre", id:p.id })} disabled={busy} style={gris}>Remettre à valider</button>}
                      {p.statut === "erreur" && <>
                        <button onClick={() => call({ action:"reessayer", id:p.id })} disabled={busy} style={vert}>Réessayer</button>
                        <button onClick={() => call({ action:"refuser", id:p.id })} disabled={busy} style={gris}>Abandonner</button>
                      </>}
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginTop:4 }}>
        <button onClick={tester} disabled={busy} style={gris}>{busy ? "…" : "Tester la connexion Meta"}</button>
        {compte && <span style={{ fontSize:11, color:"#81c784" }}>Page {compte.page}{compte.instagram ? ` · @${compte.instagram}` : ""}</span>}
      </div>
    </div>
  );
}
