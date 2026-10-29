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
  fusionné dans `Staging`. Accord permanent de Jordan (10/10/2026) : pas de nouvelle confirmation pour ces publications,
  mais Jordan est informé à chaque fois du contenu des articles publiés.
  Exception (décision du 28/10/2026) : la refonte de l'app et les nouveaux prix partent en prod au plus tard le week-end
  du 31/10-1/11/2026, pour en mesurer les effets avant le bilan du 15/02/2027 ; le reste de STA attend décembre.
- Toute modification de schéma Supabase s'applique aux **deux** projets. Depuis le 30/10/2026, une nouvelle table du schéma
  `public` n'est plus ouverte automatiquement à l'API : la migration qui la crée donne ses droits explicitement
  (`grant select, insert, update, delete on public.<table> to service_role;` pour une table serveur uniquement ; `anon` et
  `authenticated` seulement si l'app y accède directement, avec des politiques RLS). Les tables existantes gardent leurs droits.
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
  Facebook reste géré par Jordan. Pendant la ligue d'hiver, la publication du dimanche reprend la 1re question du quiz de la
  semaine (`src/lib/ligueHiver.json`), avec le lien vers l'app.
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

## Ligue d'hiver
- Décision de Jordan du 19/10/2026 : du dimanche 1er novembre 2026 au samedi 30 janvier 2027, 13 semaines du dimanche au
  samedi (heure de Paris), un défi et un quiz de 3 questions par semaine, sans classement ; mise en prod en avance, seule,
  par exception à la règle de décembre. Contenu unique `src/lib/ligueHiver.json` (gestes, questions, réponses et explications
  tirés de la base de connaissances, articles liés), partagé par l'app (`src/lib/ligueHiver.js` ; écran de la page
  Classement, ouverte pendant la ligue par un 5e onglet « Quiz » de la barre du bas (décisions de Jordan du 26/10), carte de
  « Aujourd'hui » et annonce :
  `src/components/LigueHiver.jsx`) et le serveur (`api/ligueHiver.cjs`, `POST /api/send?type=ligue`). Hors production (STA,
  préversions), la ligue démarre à `debutTest` pour être testée.
- Table `ligue_hiver` (serveur uniquement, RLS sans politique) : une ligne par utilisateur, saison et semaine ; supprimée le
  1er août qui suit la saison par la tâche du matin. Un défi ou un quiz manqué ne se rattrape pas.
- Quiz (anti-triche, décision de Jordan du 26/10) : une seule tentative, 1 minute pour les 3 questions à partir de
  « Commencer » (`dureeQuiz`, chrono tenu par le serveur, colonne `quiz_debut`) ; le quiz compte comme fait dès qu'il est
  commencé, une question sans réponse dans la minute est fausse, des réponses envoyées hors délai ne comptent pas. Règle
  citée dans le règlement (CGU 6 g), l'annonce et la notification du quiz.
- Défi 50 GreenPoints, quiz 30 (aussi pendant la pause d'hiver) ; badge « Gardien de l'hiver 2026-2027 » à 10 semaines
  complètes (défi et quiz). Notifications au même rythme (une le matin au plus) : quiz (dimanche, sinon les jours suivants)
  et défi (à partir du mercredi), chacun une fois par semaine s'il n'est pas fait ; astuces « Le savais-tu ? » tirées des
  quiz passés.
- Dotation (règlement : CGU, article 6 g) : 1 an de Premium au plus de points d'assiduité (1 par défi, 1 par quiz) le
  30/01/2027 à 23 h 59 ; égalité (décision de Jordan du 20/10) : accès Premium (abonnement, essai ou Premium offert)
  devant compte gratuit, puis compte le plus ancien ; gagnant désigné au plus tard le 7/02 et prévenu par email au plus
  tard le 10/02 ; comptes de test et admins exclus (`compteExclu`, `api/auth.cjs`). Suivi et plus assidus : Pilotage → Activité. Remise :
  Premium offert 12 mois (Pilotage → Finances), ou, s'il est déjà abonné, coupon Stripe à 100 % sur ses 12 prochains mois.

## Offres et Premium offerts
- Premium offert (famille, bêta…) : règle unique `api/premium.cjs` (date de fin incluse, vide = à vie), gestion
  dans Pilotage → Finances ; retrait automatique par la tâche du matin.
- Prix de Premium (décision de Jordan du 26/10/2026) : 2,99 € par mois, 24,99 € par an ; offre saisonnière (annuel à 12,99 €
  la 1re année, 1/11→25/02 depuis la décision de Jordan du 28/10/2026, et 1/07→15/08). Source unique
  `src/lib/offreSaison.json`, partagée par l'app et le serveur ; prix Stripe dans les variables Vercel `STRIPE_PRICE_MONTHLY`
  et `STRIPE_PRICE_YEARLY` (prix de test en Preview, réels en Production), vérifiés à chaque abonnement (montant différent
  → abonnement bloqué et alerte).
- Niveaux (refonte, décisions de Jordan du 26/10/2026) : Visiteur, Gratuit, Premium ; contenu unique `src/lib/niveaux.json`
  (page « Choisir son niveau » `/subscribe`, carte « Avec Premium », consignes de Bob), une ligne par fonction réelle. Plan annuel
  inclus dans Premium, plus vendu à l'unité (plans déjà achetés gardés : `publicMetadata.plansAnnuels`).
  Accueil visiteur (`src/pages/AccueilVisiteur.jsx`, remplace la présentation et la démo, `/demo` redirigée vers `/`) :
  météo du jour de sa commune, conseil de Bob du jour (`src/lib/conseilsBob.json`, partagé avec les notifications),
  diagnostic d'essai, articles de saison ; barre visiteur Accueil, Conseils, Diagnostic, Compte.
- Parrainage et codes créateurs : `api/parrainage.cjs` (tables `codes` et `parrainages`, serveur uniquement), conditions
  dans les CGV (article 7 ter) ; filleul 1 mois offert, parrain 1 mois par filleul actif (tâche du matin) ; codes
  créateurs et commissions dans Pilotage → Finances. Lien : `https://mongazon360.fr/?p=CODE`.

## Équipements connectés
- Table `equipements` (serveur uniquement, RLS sans politique) via `api/objets.js` ; logique et connecteurs dans
  `api/equipements.cjs`. Clés d'accès des utilisateurs chiffrées (AES-256-GCM) avec la variable Vercel
  `EQUIPEMENTS_SECRET` (Production et Preview) : ne jamais la changer sans reconnecter les équipements.
- Équipements connectés inclus dans Premium (niveaux.json ; constat de Jordan du 29/10/2026) : un compte gratuit voit
  « Inclus dans Premium » dans « Mes équipements », sans connexion possible (un équipement déjà connecté s'y déconnecte
  seulement) ; connexions et commandes refusées par `api/objets.js` sans Premium (abonnement, essai, Premium offert ou
  admin) ; robot, arrosage et station ne sont utilisés par l'app qu'avec Premium.
- Toute décision prise avec un équipement suit le calendrier unique et la base de connaissances.
- Équipements demandés : formulaire « Ton équipement n'est pas dans la liste ? » en bas de « Mes équipements » (type,
  marque, modèle), demandes anonymes dans la table `equipements_demandes` (serveur uniquement, RLS sans politique),
  synthèse dans Pilotage → Activité : choix des prochains connecteurs et chiffres à présenter aux marques.
- Netatmo (station) : connexion OAuth (accès en lecture `read_station`), adresse de retour `https://<domaine>/api/objets`
  à déclarer dans l'application Netatmo (dev.netatmo.com) ; variables Vercel `NETATMO_CLIENT_ID` et `NETATMO_CLIENT_SECRET`
  (Production et Preview). Mesures : module extérieur, pluviomètre (pluie depuis minuit), anémomètre ; ignorées au-delà de 3 h.
- Davis (station) : « API Key v2 » et secret créés par l'utilisateur sur weatherlink.com (API WeatherLink v2), chiffrés ;
  relevé des capteurs extérieurs (ISS) d'un WeatherLink Live ou d'une console WeatherLink, toutes les 15 min avec l'offre
  gratuite ; ignoré au-delà de 3 h.
- Husqvarna (robot) : connexion OAuth, adresse de retour `https://<domaine>/api/objets` à déclarer dans l'application
  Husqvarna (PROD et alias Staging) ; variables Vercel `HUSQVARNA_CLIENT_ID` (Application key) et
  `HUSQVARNA_CLIENT_SECRET`. Mode Proposition : aucune commande envoyée au robot sans validation de l'utilisateur.
- Hauteur de coupe Automower : niveaux 1-9 de l'API convertis en cm selon `src/lib/automowerHauteurs.json` (fiches
  Husqvarna) ; proposition = milieu de la hauteur de la saison (Tonte Précise, +1 cm en objectif naturel), bornée à la
  plage du modèle ; modèles à réglage manuel ou absents de la liste : pas de proposition.
- Robot Gardena SILENO : même connexion Husqvarna Group (une connexion Gardena enregistre l'arrosage et le robot du
  compte, jetons partagés : renouvelés et révoqués ensemble). Gardena n'a pas de repos d'une durée donnée : « repos jusqu'à
  demain matin » = repos jusqu'à nouvel ordre puis planning relancé par la tâche du matin (`reprendreRobotsGardena`).
- Robot Mammotion : identifiants personnels (client_id, client_secret) créés par l'utilisateur sur
  developer.mammotion.com, chiffrés, jeton d'une heure redemandé avec eux ; l'API ne couvre que les modèles sortis à
  partir de 2025 (entièrement : le LUBA 3 AWD seul au 29/10/2026, liste complète annoncée par Mammotion) et ne sait ni
  mettre au repos pour une durée ni suspendre les tâches programmées : proposition de retour à la base quand la tonte
  est déconseillée, ou de reprise d'une tonte en pause. Usage commercial soumis à l'autorisation écrite préalable de
  Mammotion (réponse du 29/10/2026, demande en cours) : pas de mise en prod sans elle.
- Arrosage : Gardena par la même connexion Husqvarna Group (l'API « GARDENA smart system » doit être rattachée à
  l'application Husqvarna ; 700 requêtes/semaine pour toute l'app : lecture au plus toutes les 10 min) ; Rachio par la clé
  API de l'utilisateur. Lancement d'une zone seulement le matin (heures de la base, src/lib/arrosageConnecte.js).
- Capteurs de sol : Gardena smart Sensor (lu avec l'arrosage Gardena) ou capteur Ecowitt de la station ; règle de la base
  (« Température Sol & ET0 ») et seuils par type de sol dans `src/lib/capteurSol.json`, partagés par l'app (calcul
  d'arrosage) et le serveur (notification du soir, Bob). Sol humide → pas d'arrosage, sol sec → arrosage conseillé,
  ignorés pendant un parcours de semis ; température du sol mesurée → jour 0 de la météo et fenêtre de semis du jour.

## Fichier de suivi (roadmap)
- Google Sheet « MG360_Suivi_Projet » (premier onglet), lu en direct par Pilotage → Roadmap.
- Mis à jour **une seule fois par semaine**, le dimanche vers 18 h (heure de Paris), par la tâche programmée
  « Fichier de suivi — mise à jour du dimanche », qui envoie ensuite un résumé à Jordan. Jamais de mise à jour du fichier
  à chaque évolution (crédits Claude).
- La tâche lit l'historique du code (`main` = PROD, `Staging` = STA) : messages de commit clairs, en français. Ce qui ne se
  voit pas dans le code (décision, ligne demandée par Jordan, validation sur STA) est noté le jour même dans
  `docs/suivi/journal.md`.

## Mesure de la refonte (décisions de Jordan du 28/10/2026)
- 4 indicateurs, en volume et en taux, avant (2/10→31/10) et après le 1/11 : visites (visiteurs non connectés, 1 par appareil
  et par jour, `site_visits`) → entrées dans l'app (diagnostic d'essai, création de compte, démo avant le 1/11 : `page_view`
  des visiteurs dans `funnel_events`, mesuré depuis le 9/10) → inscriptions gratuites (premier jour d'un compte dans
  `daily_active_users`, admins exclus) → abonnements Premium payants (`premium_souscrit`, écrit dans `funnel_events` par le
  webhook Stripe depuis la mise en prod de la refonte ; avant : chiffre de Pilotage → Finances). En plus : vues de « Choisir
  son niveau », abonnements annuels pris avec l'offre, et articles qui mènent à l'app (`conseils_vue`, écrit par les pages
  Conseils avec l'identifiant de visite de l'app : lecture d'un article puis entrée dans l'app au cours de la même visite).
- Point chaque lundi matin (tâche programmée « Point KPI du lundi ») pour Jordan, noté dans `docs/suivi/journal.md`.
- Gel du 31/10 au 21/11/2026 inclus : en prod, aucun changement visible des utilisateurs hors correctifs (les articles
  Conseils, les lots de comm et les mesures invisibles continuent ; les évolutions restent sur STA).
- Retour arrière en quelques minutes : déploiement précédent remis en production dans Vercel (Instant Rollback) ou revert
  sur `main`, avec les anciens identifiants de prix Stripe remis dans Vercel Production.

## Contraintes
- Vercel Hobby : 12 fonctions maximum dans `api/` — pas de nouvel endpoint sans en libérer un.
- Tâches planifiées : `GET /api/send` réservé aux tâches de Vercel (en-tête `Authorization: Bearer CRON_SECRET`, variable
  Vercel Sensitive, Production et Preview, saisie par Jordan ; refus d'une tâche de Vercel signalé dans Pilotage → Bugs) ;
  `POST /api/send?type=publications` réservé à la tâche pg_cron (secret Supabase Vault `tache_publications`, lu par la
  fonction `secret_tache_publications`, service_role uniquement).
- Dépôt GitHub public : jamais de clé, ni de valeur par défaut d'une clé, dans le code (une ancienne valeur de secours de
  `CRON_SECRET` est restée dans l'historique : valeur remplacée le 18/10/2026).
