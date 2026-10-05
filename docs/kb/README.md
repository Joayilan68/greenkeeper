# Base de connaissances Mongazon360

`Knowledge_et_cas_test_ENRICHI.xlsx` est la référence agronomique de l'app : toute règle, date, seuil ou
conseil donné aux utilisateurs (plan d'entretien, notifications, Bob, diagnostic photo, parcours, kits,
articles Conseils) doit en venir, et ne jamais la contredire.

- Un besoin non couvert par la base : proposer l'ajout, le faire valider, l'ajouter à la base, puis coder.
- Une base mise à jour : remplacer ce fichier (même nom) et aligner le code dans le même changement.

Onglets les plus utilisés par le code :

| Onglet | Utilisé par |
|---|---|
| Zones x Mois | `src/lib/planEntretien.js` (mois des actions), `src/lib/kitSaison.js` |
| Fenêtres Semis par Zone | `api/parcoursEngine.cjs` (via `src/lib/zonesGazon.json`), `api/bobContext.cjs` |
| Tonte Précise, Arrosage Précis | `api/bobContext.cjs`, articles Conseils |
| Gazons Spécifiques, Objectifs Profil, Règles Objectifs | plan d'entretien, recommandations, diagnostic photo |
| Maladies & Nuisibles | `api/notificationEngine.cjs` (risques de maladie), diagnostic photo |
| pH & Amendements | notifications (pH), kits (chaulage), articles |
| Règles Notifications | `api/notificationEngine.cjs` |
| Parcours Semis | `api/parcoursEngine.cjs`, `src/pages/Parcours.jsx` |
| Température Sol & ET0 | `src/lib/zonesGazon.json` (semis 10 °C, pousse 8 °C), `api/parcoursEngine.cjs` |
| Règles complémentaires | 1re tonte, reprise du printemps, notifications d'hiver, kits, relances, anti-fatigue |

L'onglet « Journal » trace chaque évolution de la base.
