// api/veilleMarque.cjs
// Veille de marque — noms de domaine proches de « Mongazon360 », chaque soir (send.js, créneau soir).
// Source gratuite : journaux publics des certificats HTTPS (crt.sh). Un site qui se lance obtient presque
// toujours un certificat : ses noms y apparaissent en quelques heures. Premier passage = référence (sans
// alerte) ; ensuite, tout nouveau nom est signalé par email (alerting.cjs) et dans Pilotage → Bugs.
// État : system_status « veille_domaines » = { domaines: { nom: date de 1re détection }, reference, verifie_le }.

const alerting = require("./alerting.cjs");

// Recherche par préfixe (crt.sh ne sait pas chercher « au milieu » d'un nom)
const PREFIXES = ["mongazon", "mon-gazon", "mongason", "gazon360"];

async function nomsCertifies(prefixe) {
  const r = await fetch(`https://crt.sh/?q=${encodeURIComponent(prefixe)}%25&output=json`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`crt.sh HTTP ${r.status}`);
  const noms = new Set();
  for (const c of await r.json()) {
    for (const n of String(c.name_value || "").split("\n")) {
      const nom = n.trim().toLowerCase().replace(/^\*\./, "").replace(/^www\./, "");
      if (nom.startsWith(prefixe)) noms.add(nom);
    }
  }
  return noms;
}

async function veilleDomaines(today) {
  const resultats = await Promise.allSettled(PREFIXES.map(nomsCertifies));
  const trouves = new Set(resultats.flatMap(r => r.status === "fulfilled" ? [...r.value] : []));
  if (resultats.every(r => r.status === "rejected")) {
    console.warn("[veille] crt.sh indisponible :", resultats[0].reason?.message);
    return null; // réessai le lendemain ; pas d'alerte pour une panne du service public
  }

  const etat = (await alerting.getStatus("veille_domaines"))?.value;
  const domaines = { ...(etat?.domaines || {}) };
  const nouveaux = [...trouves].filter(n => !domaines[n]).sort();
  nouveaux.forEach(n => { domaines[n] = today; });
  const reference = etat?.reference || today;

  if (etat && nouveaux.length) {
    await alerting.recordError({
      source: "server", severity: "warning",
      kind: "Veille de marque — nouveau nom de domaine proche",
      message: `${nouveaux.length} nouveau(x) nom(s) détecté(s) : ${nouveaux.join(", ")}`,
      details: { "À faire": "Vérifier le site (activité, usage du nom Mongazon360). En cas d'atteinte à la marque : avocat avant toute action." },
    }, { forceEmail: true });
  }
  await alerting.setStatus("veille_domaines", { domaines, reference, verifie_le: today });
  return nouveaux.length;
}

module.exports = { veilleDomaines };
