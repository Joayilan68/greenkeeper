# Mongazon360 — règles de travail

## Environnements
- **PROD** = branche `main` (mongazon360.fr) · Supabase `kfagoxmwvxogciilbmze`
- **STA** = branche `Staging` (alias Vercel « Branch link Staging ») · Supabase `gwtsfjzzcivdymidlxwp` (Beta)
- **STA doit être identique à la PROD.** Seule exception : un développement en cours de test sur STA,
  qui peut alors être en avance sur la PROD jusqu'à sa validation et son passage en prod.
- Après chaque passage en prod, vérifier l'alignement : `git diff --quiet origin/main origin/Staging`.
- **Jusqu'à décembre 2026 (décision du 05/10/2026)** : les nouvelles évolutions restent sur STA (validées par un test STA)
  et partent toutes ensemble en prod en décembre ; STA est donc en avance sur la PROD jusque-là. Un correctif urgent
  de PROD se fait sur `main`, puis `main` est fusionné dans `Staging`.
  Chaque évolution laissée sur STA ajoute ses lignes de test dans `docs/recette/Recette_prod_decembre_2026.xlsx`
  (recette à dérouler après la mise en prod).
  Exception (décision du 10/10/2026) : les articles Conseils (`content/conseils/*.md` : titres, descriptions, contenu)
  partent en prod dès qu'ils sont prêts, sans toucher à l'app, pour le référencement de saison ; `main` est ensuite
  fusionné dans `Staging`.
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

## Base de connaissances (agronomie)
- Référence unique : `docs/kb/Knowledge_et_cas_test_ENRICHI.xlsx` (voir `docs/kb/README.md`). Toute règle, date, seuil
  ou conseil donné aux utilisateurs (app, notifications, Bob, diagnostic, articles) en vient et ne la contredit jamais.
- Besoin non couvert : proposer l'ajout, le faire valider, l'ajouter à la base, puis coder. Base mise à jour :
  remplacer le fichier et aligner le code dans le même changement.

## SEO et contenus
- Pages publiques (titre, description, canonique) : `src/lib/seoPages.json`, pré-générées au build par
  `scripts/seo-build.mjs` (+ `sitemap.xml`). Toute nouvelle page publique : l'ajouter au JSON **et** à la règle
  dédiée de `vercel.json` (le build échoue sinon).
- Rubrique « Conseils gazon » : un article = un fichier `content/conseils/<slug>.md` (en-tête title, description,
  saison, date). Les paragraphes « Mongazon360 » ne citent que des fonctions qui existent réellement dans l'app.
  La liste des articles est publiée dans `/conseils.json` : Bob (api/ai-assistant.js) y renvoie automatiquement.
  Photo d'article facultative (en-tête `image` et `image_alt`, fichier dans `public/images/conseils`, 1200 × 800, sans
  métadonnées) ; « À lire aussi » = les articles les plus liés entre eux. Page « Qui sommes-nous » : `content/a-propos.md`,
  générée par `scripts/seo-build.mjs` (règle dans `vercel.json`).
- Bob : ses consignes listent les fonctions réelles de l'app ; toute nouvelle fonction doit y être ajoutée.
- Search Console et Pinterest : ne pas retirer les balises `google-site-verification` et `p:domain_verify` de
  `index.html` (site revendiqué).
- Réseaux sociaux : profils officiels dans `src/lib/reseaux.js` (pied de page de l'accueil et des pages Conseils,
  profils déclarés à Google), même liste dans les données structurées de `index.html`.
- Lots de comm (page Facebook et Instagram de Mongazon360, décisions de Jordan des 17 et 18/10/2026) : chaque samedi matin,
  la tâche programmée « Lot de comm du samedi » prépare la semaine qui commence 8 jours plus tard (du dimanche au samedi) :
  4 publications (dimanche 8 h, lundi, mercredi et vendredi 16 h 30, heure de Paris), texte Facebook avec un lien suivi
  (`utm_source=facebook`), légende Instagram (lien en bio, hashtags), visuel 1080 × 1350 (photo de notre pelouse ou Bob, sans
  métadonnées). Conseils tirés des articles et de la base, fonctions de l'app en prod uniquement. Bob dans les groupes
  Facebook reste géré par Jordan.
- Publication automatique des lots (`api/reseaux.cjs`, go prod de Jordan du 18/10/2026) : lot inséré dans la table
  `publications` de la PROD (serveur uniquement, RLS sans politique ; colonne `heure` = heure de Paris), visuels JPEG poussés
  sur `main` dans `public/images/reseaux/<lot>/` (lus par Meta sur mongazon360.fr, retirés 3 semaines après) ; Jordan valide
  dans Pilotage → Réseaux. Publication à l'heure prévue par `POST /api/send?type=publications`, appelé toutes les 15 min par
  pg_cron (Supabase PROD, tâche `mongazon360-publications-reseaux`, extension pg_net), tâches planifiées de Vercel en
  secours ; jour passé : plus publiée ; une publication n'est jamais publiée deux fois (statut `en_cours`). Graph API v26.0.
  Clé dans la variable Vercel `META_PAGE_TOKEN` (Sensitive, Production et Preview) : jeton sans expiration de l'utilisateur système
  « Publications Mongazon360 » du portefeuille business « Ayfer Ozkan Krebs » (propriétaire de la page et de l'Instagram),
  qui donne le jeton de la page à chaque passage ; pas de jeton lié à une session Facebook (invalidé à la déconnexion).
  Saisie par Jordan : jamais dans la conversation ni dans le dépôt ; contrôle dans Pilotage → Services. App Meta
  « Mongazon360 Publications » (administrateurs : Jordan et Ayfer), à garder publiée : sinon les publications ne sont
  visibles que par ses administrateurs.
- Pinterest : une épingle par article (1000 × 1500 : photo de notre pelouse, saison, titre), fichier
  `public/images/pinterest/<slug>.jpg` lu par Pinterest : ne jamais le supprimer ni le renommer. Nouvel article : créer
  son épingle au même format et l'importer dans Pinterest (fichier .csv), lien vers l'article suivi de
  `?utm_source=pinterest&utm_medium=social&utm_campaign=<slug>` (source « pinterest » dans Pilotage → Activité).
- Indexation : à chaque mise en prod qui touche `content/conseils`, `.github/workflows/indexnow.yml` signale les articles
  modifiés à Bing par IndexNow (`scripts/indexnow.mjs`, clé publique `public/<clé>.txt`) et renvoie le plan du site à Google
  (`scripts/gsc-stats.mjs plan`, secret GitHub `GSC_SERVICE_ACCOUNT_JSON`) ; Google lit la date `maj` de l'article et décide
  seul de l'indexation. Demande d'indexation à la main dans la Search Console en complément (une dizaine par jour).
- Stats Google : `scripts/gsc-stats.mjs` lit la Search Console, clics et positions, ou état d'indexation des pages avec
  `index` (compte de service `mongazon360-stats`, autorisation « Complète » pour l'envoi du plan du site) ; jeton et position
  moyenne par mois dans `api/searchConsole.cjs`, aussi utilisé par Pilotage → Activité (`/api/stats?type=seo`). Sa clé est
  dans la variable `GSC_SERVICE_ACCOUNT_JSON` (Vercel Production et Preview, secret GitHub, environnement cloud de Claude),
  jamais dans le dépôt ni affichée. Sert au point des stats tous les 15 jours et au choix des articles à améliorer.

## Offres et Premium offerts
- Premium offert (famille, bêta…) : règle unique `api/premium.cjs` (date de fin incluse, vide = à vie), gestion
  dans Pilotage → Finances ; retrait automatique par la tâche du matin.
- Offre saisonnière (annuel à 19,99 € la 1re année, 1/12→25/02 et 1/07→15/08) : `src/lib/offreSaison.json`,
  partagé par l'app et le serveur.

## Équipements connectés
- Table `equipements` (serveur uniquement, RLS sans politique) via `api/objets.js` ; logique et connecteurs dans
  `api/equipements.cjs`. Clés d'accès des utilisateurs chiffrées (AES-256-GCM) avec la variable Vercel
  `EQUIPEMENTS_SECRET` (Production et Preview) : ne jamais la changer sans reconnecter les équipements.
- Toute décision prise avec un équipement suit le calendrier unique et la base de connaissances.
- Husqvarna (robot) : connexion OAuth, adresse de retour `https://<domaine>/api/objets` à déclarer dans l'application
  Husqvarna (PROD et alias Staging) ; variables Vercel `HUSQVARNA_CLIENT_ID` (Application key) et
  `HUSQVARNA_CLIENT_SECRET`. Mode Proposition : aucune commande envoyée au robot sans validation de l'utilisateur.
- Arrosage : Gardena par la même connexion Husqvarna Group (l'API « GARDENA smart system » doit être rattachée à
  l'application Husqvarna ; 700 requêtes/semaine pour toute l'app : lecture au plus toutes les 10 min) ; Rachio par la clé
  API de l'utilisateur. Lancement d'une zone seulement le matin (heures de la base, src/lib/arrosageConnecte.js).

## Fichier de suivi (roadmap)
- Google Sheet « MG360_Suivi_Projet » (premier onglet), lu en direct par Pilotage → Roadmap.
- Mis à jour **une seule fois par semaine**, le dimanche vers 18 h (heure de Paris), par la tâche programmée
  « Fichier de suivi — mise à jour du dimanche », qui envoie ensuite un résumé à Jordan. Jamais de mise à jour du fichier
  à chaque évolution (crédits Claude).
- La tâche lit l'historique du code (`main` = PROD, `Staging` = STA) : messages de commit clairs, en français. Ce qui ne se
  voit pas dans le code (décision, ligne demandée par Jordan, validation sur STA) est noté le jour même dans
  `docs/suivi/journal.md`.

## Contraintes
- Vercel Hobby : 12 fonctions maximum dans `api/` — pas de nouvel endpoint sans en libérer un.
- Tâches planifiées : `GET /api/send` réservé aux tâches de Vercel (en-tête `Authorization: Bearer CRON_SECRET`, variable
  Vercel Sensitive, Production et Preview, saisie par Jordan ; refus d'une tâche de Vercel signalé dans Pilotage → Bugs) ;
  `POST /api/send?type=publications` réservé à la tâche pg_cron (secret Supabase Vault `tache_publications`, lu par la
  fonction `secret_tache_publications`, service_role uniquement).
- Dépôt GitHub public : jamais de clé, ni de valeur par défaut d'une clé, dans le code (une ancienne valeur de secours de
  `CRON_SECRET` est restée dans l'historique : valeur remplacée le 18/10/2026).
