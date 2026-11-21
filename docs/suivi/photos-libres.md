# Photos du domaine public utilisées dans les publications

Règle (demande de Jordan du 14/11/2026) : la photo d'un visuel ou d'une vidéo montre le sujet abordé. Quand aucune photo de
notre pelouse ne le montre, on prend une photo du domaine public : licence CC0 lue sur la page d'origine (usage commercial
permis, sans mention obligatoire), image enregistrée sans métadonnées. Chaque photo utilisée est notée ici.

Recherche : `https://api.openverse.org/v1/images/?q=<mots en anglais>&license=cc0,pdm&source=wordpress` (banque de photos de
WordPress, toutes en CC0 ; la page de chaque photo affiche « CC0 licensed photo »). Les pages de StockSnap, de rawpixel, de
Pexels et de Pixabay refusent la lecture automatique : licence invérifiable d'ici, à éviter.

Maladies et ravageurs : iNaturalist (photos d'observations identifiées par la communauté). La page d'une photo refuse la
lecture automatique, mais l'API du site donne la licence de chaque photo : recherche
`https://api.inaturalist.org/v1/observations?photo_license=cc0&taxon_name=<nom latin>`, puis
`https://api.inaturalist.org/v1/observations/<n°>` : `license_code` = `cc0` (« no rights reserved ») pour la photo choisie,
observation au niveau « research » (identification confirmée).

| Date | Utilisée pour | Fichier | Licence | Page d'origine |
|---|---|---|---|---|
| 15/11/2026 | Vidéo de Bob « Feuilles mortes » du 25/11 (bas de l'image et couverture) | `scripts/video-bob/decors/feuilles-mortes.jpg` | CC0 1.0 | https://wordpress.org/photos/photo/271621e1b5/ |
| 15/11/2026 | Vidéo de Bob « Pelouse gelée » du 2/12 (bas de l'image et couverture) | `scripts/video-bob/decors/pelouse-gelee.jpg` | CC0 1.0 | https://wordpress.org/photos/photo/88261c2f4b/ |
| 15/11/2026 | Vidéo de Bob « Tondre en hiver » du 9/12 (bas de l'image et couverture) | `scripts/video-bob/decors/pelouse-hiver.jpg` | CC0 1.0 | https://wordpress.org/photos/photo/56561d3179/ |
| 16/11/2026 | Publication du 27/11 « En décembre, laisse ta pelouse tranquille » (herbe sous une première neige, feuilles mortes) | `public/images/reseaux/2026-11-22/4-pelouse-decembre-hiver.jpg` (main) | CC0 1.0 | https://wordpress.org/photos/photo/219620276e/ |
| 21/11/2026 | Publication du 4/12 « Des plaques rondes beige-rosé ? C'est la fusariose » (plaques de fusariose, *Microdochium nivale*, observation iNaturalist 71176850 confirmée) | `public/images/reseaux/2026-11-29/4-fusariose.jpg` (main) | CC0 1.0 (lue par l'API d'iNaturalist) | https://www.inaturalist.org/photos/116013358 |

Repérée pour la suite (CC0, mêmes vérifications) : tapis de feuilles https://wordpress.org/photos/photo/41061f40e8/.
