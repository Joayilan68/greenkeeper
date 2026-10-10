# Refonte de décembre 2026 — état des lieux chiffré (09/10/2026)

Chiffres de départ pour décider des niveaux, des pages et des tuiles. Vercel ne garde qu'un mois d'historique sur l'offre
gratuite : ses chiffres sont recopiés ici. Sources : Vercel Web Analytics (PROD, captures de Jordan), base PROD (Supabase),
mesure interne des pages et des tuiles (en prod depuis le 09/10 : table `funnel_events`, étapes `page_view` et `tuile`).

## Vercel — 30 derniers jours (10/09 → 09/10)
- 365 visiteurs (une personne comptée une fois par jour), 2 119 pages vues, taux de rebond 34 %.
- Pages (visiteurs) : `/` 238 · `/today` 99 · `/pilotage` 91 (admin) · `/parcours` 59 · `/confidentialite` 44 ·
  `/classement` 40 · `/my-lawn` 32.
- Provenance : app Android 92 · Google 37 · Facebook 12 · MSN 7 · Instagram 6.
- Mobile 73 % · Android 60 % · Windows 15 % · iOS 13 % · Linux 10 %.
- États-Unis 29 % : sans doute des robots (moteurs de recherche, outils de surveillance).

## Vercel — 7 derniers jours (02/10 → 09/10)
- 111 visiteurs, 577 pages vues.
- Pages : `/` 66 · `/today` 37 · `/pilotage` 22 (admin) · `/diagnostic` 14 · `/classement` 12 · `/confidentialite` 12 ·
  `/my-lawn` 12.

## Entonnoir — 30 jours au 09/10 (`funnel_events`)
- Accueil : 143 vues. Clics : connexion 34, démo 20, inscription 19, essai du diagnostic 11.
- Démo vue 24 fois ; essai du diagnostic commencé 2 fois.
- Écran d'inscription : 15 arrivées, 6 inscrits (40 %).

## Usage depuis le printemps (base PROD)
- Inscrits actifs par mois : juin 14 · juillet 8 · août 43 (tests Google Play) · septembre 13 · octobre 6 (au 9).
- Diagnostics photo : 47 (mai 15, juin 12, juillet 1, août 4, septembre 11, octobre 4), faits par 1 à 5 personnes par mois.
- Historique : 154 interventions notées (arrosage 62, tonte 46, désherbage 20, regarnissage 8, autres 6 au plus).
- Bob depuis mi-septembre : 3 questions, toutes d'un compte gratuit (05/10). Corrigé le 10/10 : les « 11 questions sur un
  diagnostic » comptées le 09/10 étaient des diagnostics photo, et les « 4 questions de visiteurs », 2 essais du diagnostic.
- GreenPoints : 50 comptes avec des points (médiane 85), 9 en ont gagné sur 30 jours, aucune récompense obtenue ;
  12 inscrits actifs sur 30 jours.
- Inscrits localisés : 39, dont 11 dans le sud de l'Alsace (5 autour de Saint-Louis).

## À relire en novembre
- Mesure interne : pages et 38 tuiles, par niveau (visiteur, gratuit, premium), sans les comptes admin.
- Question ouverte : le Classement est visité (40 passages en 30 jours, plus que Mon gazon) ; vérifier si ce sont de
  vrais utilisateurs avant de décider de son sort.
