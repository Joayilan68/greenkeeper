# Mongazon360 — règles de travail

## Environnements
- **PROD** = branche `main` (mongazon360.fr) · Supabase `kfagoxmwvxogciilbmze`
- **STA** = branche `Staging` (alias Vercel « Branch link Staging ») · Supabase `gwtsfjzzcivdymidlxwp` (Beta)
- **STA doit être identique à la PROD.** Seule exception : un développement en cours de test sur STA,
  qui peut alors être en avance sur la PROD jusqu'à sa validation et son passage en prod.
- Après chaque passage en prod, vérifier l'alignement : `git diff --quiet origin/main origin/Staging`.
- Toute modification de schéma Supabase s'applique aux **deux** projets.
- **Google Play** : l'app Android est une TWA (`fr.mongazon360.app`) qui charge mongazon360.fr en direct
  (service worker sans cache, `index.html` en no-store) → tout déploiement de `main` met à jour l'app
  Play Store au prochain lancement. Un nouvel `.aab` n'est nécessaire que si le paquet Android change
  (nom/icône du lanceur, `assetlinks.json`, version `targetSdk` exigée par Google).

## Propreté du code
- Code et fichiers les plus propres possible, en PROD comme en STA : pas de code mort, de fichiers
  orphelins ni de commentaires périmés.
- Avant toute suppression, vérifier qu'il n'existe aucune dépendance (imports, routes, appels d'API,
  vercel.json, robots.txt ; en base : clés étrangères, vues, fonctions, triggers, cron).

## Monitoring des erreurs
- Toute erreur est stockée dans `error_events` (serveur uniquement) et alertée par email via `api/alerting.cjs`
  (dédoublonnage 6 h, 20 emails/h max) ; consultation : Pilotage → Bugs.
- Côté serveur : dans chaque `catch` critique d'une fonction `api/`, appeler `reportServerError(kind, err, details)`
  plutôt qu'un simple `console.error`.
- Côté app : erreurs globales et plantages d'écran remontés automatiquement (`usePilotage.js`, `ErrorBoundary`).

## SEO et contenus
- Pages publiques (titre, description, canonique) : `src/lib/seoPages.json`, pré-générées au build par
  `scripts/seo-build.mjs` (+ `sitemap.xml`). Toute nouvelle page publique : l'ajouter au JSON **et** à la règle
  dédiée de `vercel.json` (le build échoue sinon).
- Rubrique « Conseils gazon » : un article = un fichier `content/conseils/<slug>.md` (en-tête title, description,
  saison, date). Les paragraphes « Mongazon360 » ne citent que des fonctions qui existent réellement dans l'app.
  La liste des articles est publiée dans `/conseils.json` : Bob (api/ai-assistant.js) y renvoie automatiquement.
- Bob : ses consignes listent les fonctions réelles de l'app ; toute nouvelle fonction doit y être ajoutée.
- Search Console : ne pas retirer les balises `google-site-verification` de `index.html`.

## Offres et Premium offerts
- Premium offert (famille, bêta…) : règle unique `api/premium.cjs` (date de fin incluse, vide = à vie), gestion
  dans Pilotage → Finances ; retrait automatique par la tâche du matin.
- Offre saisonnière (annuel à 19,99 € la 1re année, 1/12→25/02 et 1/07→15/08) : `src/lib/offreSaison.json`,
  partagé par l'app et le serveur.

## Contraintes
- Vercel Hobby : 12 fonctions maximum dans `api/` — pas de nouvel endpoint sans en libérer un.
- Roadmap : Google Sheet « MG360_Suivi_Projet » (premier onglet), lu en direct par Pilotage → Roadmap.
