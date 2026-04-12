// ─────────────────────────────────────────────────────────────────────────────
// amazonProducts.js — Catalogue Amazon Affilié Mongazon360
// Tag: mongazon360-21 | Généré depuis MG360_Amazon_Catalogue.xlsx
//
// ⚠️  ASINs marqués null = 🔵 à remplir (utilisent le fallback recherche Amazon)
// ⚠️  Vérifier tous les ASINs IA sur amazon.fr avant déploiement production
// ─────────────────────────────────────────────────────────────────────────────

const TAG = 'mongazon360-21';

/**
 * Construit l'URL Amazon affiliée.
 * Si l'ASIN est null ou invalide, redirige vers une recherche Amazon.
 */
const url = (asin, fallback) => {
  if (asin && asin !== '🔵') {
    return `https://www.amazon.fr/dp/${asin}?tag=${TAG}&linkCode=ogi&th=1&psc=1`;
  }
  return `https://www.amazon.fr/s?k=${encodeURIComponent(fallback)}&tag=${TAG}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE
// Structure : AMAZON_PRODUCTS[actionKey].tiers[tier]
// actionKey doit correspondre aux clés de planEntretien.js
// ─────────────────────────────────────────────────────────────────────────────

const AMAZON_PRODUCTS = {

  // ══════════════════════════════════════════════════════════════
  // ENGRAIS STARTER — Fév/Mars
  // ratioGM2 : grammes par m²  |  conditionnement : g par sac
  // ══════════════════════════════════════════════════════════════
  engraisStarter: {
    label: 'Engrais Starter',
    ratioGM2: 35,
    conditionnement: 5000,
    tiers: {
      eco: {
        asin: 'B01MUDP7UQ',
        label: 'Engrais universel NPK basique',
        marque: 'Botanic',
        prix: 14.9,
        commission: 0.04,
        url: url('B01MUDP7UQ', 'engrais starter gazon NPK'),
      },
      standard: {
        asin: 'B071YM1LRH',
        label: 'Engrais NPK 12-5-5 organo-minéral',
        marque: 'Vilmorin',
        prix: 21.9,
        commission: 0.04,
        url: url('B071YM1LRH', 'engrais NPK 12-5-5 gazon'),
      },
      qualite: {
        asin: 'B07PRJYN8S',
        label: 'Engrais organique libération lente',
        marque: 'Oscorna',
        prix: 19.9,
        commission: 0.04,
        url: url('B07PRJYN8S', 'engrais organique gazon printemps'),
      },
      premium: {
        asin: 'B0DWWXL8NT',
        label: 'Engrais professionnel bio-stimulé NPK+oligo',
        marque: 'ICL',
        prix: 54.9,
        commission: 0.04,
        url: url('B0DWWXL8NT', 'engrais professionnel gazon'),
      },
    },
    accessoires: {
      epandeur: {
        asin: 'B07S2C4THM',
        label: 'Épandeur à gazon réglable',
        marque: 'Terre Jardin',
        prix: 24.9,
        commission: 0.07,
        url: url('B07S2C4THM', 'épandeur gazon réglable'),
        ctaSi: 'pas_epandeur', // afficher si profile.materiel?.epandeur !== true
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ENGRAIS ÉTÉ — Mai/Juin
  // ══════════════════════════════════════════════════════════════
  engraisEte: {
    label: 'Engrais Été',
    ratioGM2: 30,
    conditionnement: 5000,
    tiers: {
      eco: {
        asin: 'B0F4XM96P7',
        label: 'Engrais été gazon longue durée',
        marque: 'Botanic',
        prix: 13.9,
        commission: 0.04,
        url: url('B0F4XM96P7', 'engrais été gazon NPK'),
      },
      standard: {
        asin: 'B071YM1LRH',
        label: 'Engrais NPK 15-5-10 longue durée',
        marque: 'Vilmorin',
        prix: 21.9,
        commission: 0.04,
        url: url('B071YM1LRH', 'engrais longue durée gazon été'),
      },
      qualite: {
        asin: 'B0GGGXMLZP',
        label: 'Engrais summer organique résistance chaleur',
        marque: 'Fuxtec',
        prix: 31.9,
        commission: 0.04,
        url: url('B0GGGXMLZP', 'engrais summer bio gazon'),
      },
      premium: {
        asin: 'B0BWNN57YY',
        label: 'Engrais professionnel summer résistance sécheresse',
        marque: 'Barenbrug',
        prix: 59.9,
        commission: 0.04,
        url: url('B0BWNN57YY', 'engrais professionnel été gazon'),
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ENGRAIS AUTOMNE — Sept/Oct
  // ══════════════════════════════════════════════════════════════
  engraisAutomne: {
    label: 'Engrais Automne',
    ratioGM2: 40,
    conditionnement: 5000,
    tiers: {
      eco: {
        asin: 'B09Q6GDGXF',
        label: 'Engrais automne-hiver riche en potassium',
        marque: 'Lerava',
        prix: 12.9,
        commission: 0.04,
        url: url('B09Q6GDGXF', 'engrais automne gazon potassium'),
      },
      standard: {
        asin: 'B0GGGXMLZP',
        label: 'Engrais NPK 5-10-25 automne',
        marque: 'Fuxtec',
        prix: 19.9,
        commission: 0.04,
        url: url('B0GGGXMLZP', 'engrais NPK 5-10-25 automne'),
      },
      qualite: {
        asin: 'B071YM1LRH',
        label: 'Engrais organique automne longue durée',
        marque: 'Versando',
        prix: 29.9,
        commission: 0.04,
        url: url('B071YM1LRH', 'engrais organique automne gazon'),
      },
      premium: {
        asin: 'B0CVQDL3KP',
        label: 'Engrais professionnel automne-hiver',
        marque: 'Plantemus',
        prix: 55.9,
        commission: 0.04,
        url: url('B0CVQDL3KP', 'engrais professionnel automne gazon'),
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ENGRAIS HIVER / CHAULAGE — Nov
  // conditionnement : 10kg (175g/m² = beaucoup)
  // ══════════════════════════════════════════════════════════════
  engraisHiver: {
    label: 'Chaulage Hiver',
    ratioGM2: 175,
    conditionnement: 10000,
    tiers: {
      eco: {
        asin: 'B0CWPGDJ9Z',
        label: 'Chaux magnésienne jardin',
        marque: 'Dolomitkalk',
        prix: 9.9,
        commission: 0.04,
        url: url('B0CWPGDJ9Z', 'chaux magnésienne jardin gazon'),
      },
      standard: {
        asin: 'B07QLJMTFS',
        label: 'Chaux magnésienne enrichie oligo-éléments',
        marque: 'Solabiol',
        prix: 14.9,
        commission: 0.04,
        url: url('B07QLJMTFS', 'chaux magnésienne gazon hiver'),
      },
      qualite: {
        asin: 'B0DVLPX45M',
        label: 'Engrais hiver organique résistance gel',
        marque: 'SoluControl',
        prix: 27.9,
        commission: 0.04,
        url: url('B0DVLPX45M', 'engrais hiver organique gazon'),
      },
      // Pas de gamme premium identifiée pour l'hiver → fallback qualite
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ANTI-MOUSSE — Mars/Avr/Sept
  // ratioMlM2 : ml par m²  |  conditionnement : ml par bidon
  // ══════════════════════════════════════════════════════════════
  antiMousse: {
    label: 'Anti-mousse',
    ratioMlM2: 20,
    conditionnement: 1000,
    tiers: {
      eco: {
        asin: 'B07CHGZ9PQ',
        label: 'Anti-mousse liquide concentré',
        marque: 'Gamm Vert',
        prix: 11.9,
        commission: 0.04,
        url: url('B07CHGZ9PQ', 'anti mousse gazon liquide'),
      },
      standard: {
        asin: 'B08XN51Z83',
        label: "Anti-mousse prêt à l'emploi",
        marque: 'Roundup',
        prix: 18.9,
        commission: 0.04,
        url: url('B08XN51Z83', 'anti-mousse gazon ready to use'),
      },
      qualite: {
        asin: 'B085WQ7Q62',
        label: 'Anti-mousse professionnel sulfate de fer',
        marque: 'Solabiol',
        prix: 29.9,
        commission: 0.04,
        url: url('B085WQ7Q62', 'anti mousse professionnel gazon fer'),
      },
      premium: {
        asin: 'B0DK5T1QL1',
        label: 'Anti-mousse professionnel longue durée',
        marque: 'Croqmousse',
        prix: 49.9,
        commission: 0.04,
        url: url('B0DK5T1QL1', 'anti-mousse professionnel longue durée'),
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // DÉSHERBAGE SÉLECTIF — Avr/Mai/Sept
  // ══════════════════════════════════════════════════════════════
  desherbage: {
    label: 'Désherbage sélectif',
    ratioMlM2: 7,
    conditionnement: 250,
    tiers: {
      eco: {
        asin: 'B0FD3RLXGD',
        label: 'Désherbant sélectif concentré',
        marque: 'Protect Expert',
        prix: 9.9,
        commission: 0.04,
        url: url('B0FD3RLXGD', 'désherbant sélectif gazon concentré'),
      },
      standard: {
        asin: null, // 🔵 À remplir — Bayer Gazon prêt emploi
        label: "Désherbant sélectif prêt à l'emploi",
        marque: 'Bayer Gazon',
        prix: 16.9,
        commission: 0.04,
        url: url(null, 'désherbant sélectif gazon prêt emploi'),
      },
      qualite: {
        asin: 'B08VRYZ8J5',
        label: 'Désherbant sélectif pro dicotylédones',
        marque: 'Roundup',
        prix: 24.9,
        commission: 0.04,
        url: url('B08VRYZ8J5', 'désherbant professionnel gazon dicots'),
      },
      premium: {
        asin: null, // 🔵 À remplir — Bayer Pro haute efficacité
        label: 'Désherbant professionnel haute efficacité',
        marque: 'Bayer Pro',
        prix: 44.9,
        commission: 0.04,
        url: url(null, 'désherbant pro gazon haute efficacité'),
      },
    },
    accessoires: {
      pulverisateur: {
        asin: 'B008O1CE2O',
        label: 'Pulvérisateur 5L à dos',
        marque: 'CON:P',
        prix: 34.9,
        commission: 0.07,
        url: url('B008O1CE2O', 'pulvérisateur dos jardin 5L'),
        ctaSi: 'pas_pulverisateur', // afficher si profile.materiel?.pulverisateur !== true
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // BIOSTIMULANT — Mars-Oct
  // ══════════════════════════════════════════════════════════════
  biostimulant: {
    label: 'Biostimulant',
    ratioMlM2: 5,
    conditionnement: 1000,
    tiers: {
      eco: {
        asin: 'B08TRGHK16',
        label: 'Biostimulant acides aminés',
        marque: 'MGI Developpement',
        prix: 12.9,
        commission: 0.04,
        url: url('B08TRGHK16', 'biostimulant gazon acides aminés'),
      },
      standard: {
        asin: null, // 🔵 À remplir — Algoplus algues + acides aminés
        label: 'Biostimulant racinaire algues + acides aminés',
        marque: 'Algoplus',
        prix: 22.9,
        commission: 0.04,
        url: url(null, 'biostimulant racinaire algues gazon'),
      },
      qualite: {
        asin: null, // 🔵 À remplir — Compo Expert stress hydrique
        label: 'Biostimulant professionnel stress hydrique',
        marque: 'Compo Expert',
        prix: 34.9,
        commission: 0.04,
        url: url(null, 'biostimulant pro stress hydrique gazon'),
      },
      premium: {
        asin: 'B0854KJDS1',
        label: 'Biostimulant professionnel acides aminés+NPK',
        marque: 'Symbioethical',
        prix: 52.9,
        commission: 0.04,
        url: url('B0854KJDS1', 'biostimulant professionnel gazon premium'),
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // REGARNISSAGE — Mars-Mai / Août-Sept
  // tiers.qualite est un objet de variantes (sélection selon profil)
  // ══════════════════════════════════════════════════════════════
  regarnissage: {
    label: 'Semences regarnissage',
    ratioGM2: 35,
    conditionnement: 1000,
    tiers: {
      eco: {
        asin: 'B0721LYLZK',
        label: 'Semences regarnissage universel',
        marque: 'Vilmorin',
        prix: 8.9,
        commission: 0.04,
        url: url('B0721LYLZK', 'semences regarnissage gazon universel'),
      },
      standard: {
        asin: 'B0721LYLZK',
        label: 'Semences gazon universel résistant — sac 5kg',
        marque: 'Vilmorin',
        prix: 14.9,
        commission: 0.04,
        url: url('B0721LYLZK', 'semences gazon universel résistant'),
      },
      // Variantes qualité selon profil — sélectionnées par useAmazonProducts
      qualite: {
        sport: {
          asin: 'B06WW7CLX3',
          label: 'Semences gazon sport résistant au piétinement',
          marque: 'DLF',
          prix: 29.9,
          commission: 0.04,
          url: url('B06WW7CLX3', 'semences gazon sport résistant'),
        },
        ombre: {
          asin: 'B07RHTN6P3',
          label: 'Semences gazon ombre et mi-ombre',
          marque: 'Vilmorin',
          prix: 24.9,
          commission: 0.04,
          url: url('B07RHTN6P3', 'semences gazon ombre fétuque'),
        },
        secheresse: {
          asin: 'B0DLKQJ4YJ',
          label: 'Semences gazon résistant à la sécheresse',
          marque: 'Lerava',
          prix: 27.9,
          commission: 0.04,
          url: url('B0DLKQJ4YJ', 'semences gazon sécheresse résistant'),
        },
        universel: {
          asin: 'B07RHTN6P3',
          label: 'Semences gazon qualité résistant',
          marque: 'Vilmorin',
          prix: 24.9,
          commission: 0.04,
          url: url('B07RHTN6P3', 'semences gazon résistant qualité'),
        },
      },
      premium: {
        asin: 'B08BS198BR',
        label: 'Semences gazon pro germination rapide',
        marque: 'BHS',
        prix: 44.9,
        commission: 0.04,
        url: url('B08BS198BR', 'semences gazon professionnel germination'),
      },
    },
    accessoires: {
      rateauEco: {
        asin: 'B0DZ27Z7BW',
        label: 'Râteau à gazon acier',
        marque: 'Vevor',
        prix: 14.9,
        commission: 0.06,
        url: url('B0DZ27Z7BW', 'râteau gazon acier dents souples'),
      },
      rateauStandard: {
        asin: 'B0GDFQ1156',
        label: 'Râteau éventail ergonomique',
        marque: 'HFHOME',
        prix: 24.9,
        commission: 0.06,
        url: url('B0GDFQ1156', 'râteau éventail gazon ergonomique'),
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // AÉRATION — Mars/Sept
  // ══════════════════════════════════════════════════════════════
  aeration: {
    label: 'Aération',
    type: 'materiel',
    tiers: {
      eco: {
        asin: 'B094D67G76',
        label: 'Aérateur manuel sandales à pointes',
        marque: 'Ohuhu',
        prix: 22.9,
        commission: 0.06,
        url: url('B094D67G76', 'aerateur gazon sandales pointes'),
      },
      standard: {
        asin: 'B0D9885W95',
        label: 'Aérateur rotatif gazon',
        marque: 'Wiltec',
        prix: 89.9,
        commission: 0.07,
        url: url('B0D9885W95', 'aerateur electrique gazon'),
      },
      qualite: {
        asin: 'B0D9885W95',
        label: 'Aérateur rotatif gazon',
        marque: 'Wiltec',
        prix: 89.9,
        commission: 0.07,
        url: url('B0D9885W95', 'aerateur electrique gazon'),
      },
      premium: {
        asin: 'B0DHG2RYK1',
        label: 'Aérateur acier inoxydable professionnel',
        marque: 'Benelabel',
        prix: 249.9,
        commission: 0.07,
        url: url('B0DHG2RYK1', 'aérateur thermique professionnel gazon'),
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // VERTICUT / SCARIFICATION — Avr-Juin
  // ══════════════════════════════════════════════════════════════
  verticut: {
    label: 'Scarificateur',
    type: 'materiel',
    tiers: {
      eco: {
        asin: 'B001UHO8O6',
        label: 'Scarificateur manuel gazon',
        marque: 'Fiskars',
        prix: 29.9,
        commission: 0.06,
        url: url('B001UHO8O6', 'scarificateur manuel gazon'),
      },
      standard: {
        asin: 'B001RB2LCG',
        label: 'Scarificateur électrique gazon',
        marque: 'Einhell',
        prix: 99.9,
        commission: 0.07,
        url: url('B001RB2LCG', 'scarificateur electrique gazon'),
      },
      qualite: {
        asin: 'B07L3JZD6D',
        label: 'Scarificateur électrique pro',
        marque: 'Gardena',
        prix: 159.9,
        commission: 0.07,
        url: url('B07L3JZD6D', 'scarificateur professionnel gazon électrique'),
      },
      premium: {
        asin: 'B01BBYYV3K',
        label: 'Scarificateur thermique professionnel',
        marque: 'Husqvarna',
        prix: 349.9,
        commission: 0.07,
        url: url('B01BBYYV3K', 'scarificateur thermique pro gazon'),
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // TONTE — Toute saison
  // Sélection par surface + tier (arrays pour Standard/Qualité)
  // ══════════════════════════════════════════════════════════════
  tonte: {
    label: 'Tondeuse',
    type: 'materiel',
    tiers: {
      eco: {
        asin: 'B08L3SY819',
        label: 'Tondeuse manuelle hélicoïdale',
        marque: 'Einhell',
        prix: 49.9,
        commission: 0.07,
        url: url('B08L3SY819', 'tondeuse manuelle hélicoïdale gazon'),
        surfaceMax: 80,
      },
      // Standard : tableau — sélection selon surface dans useAmazonProducts
      standard: [
        {
          asin: 'B06WW7CLX3',
          label: 'Tondeuse à batterie 36-40V sans fil',
          marque: 'Greenworks',
          prix: 199.9,
          commission: 0.07,
          url: url('B06WW7CLX3', 'tondeuse batterie gazon sans fil'),
          surfaceMin: 80,
          surfaceMax: 400,
        },
        {
          asin: 'B01N9JMUTC',
          label: 'Tondeuse électrique filaire 1400W',
          marque: 'Bosch UniversalRotak',
          prix: 149.9,
          commission: 0.07,
          url: url('B01N9JMUTC', 'tondeuse electrique filaire 1400W gazon'),
          surfaceMin: 80,
          surfaceMax: 400,
        },
      ],
      qualite: [
        {
          asin: 'B07B68JYXS',
          label: 'Tondeuse autotractée à batterie 40-80V',
          marque: 'Husqvarna',
          prix: 349.9,
          commission: 0.07,
          url: url('B07B68JYXS', 'tondeuse autotractée batterie gazon'),
          surfaceMin: 200,
          surfaceMax: 800,
        },
      ],
      premium: [
        {
          asin: 'B0BG8HL3YH',
          label: 'Robot tondeuse Wi-Fi automatique',
          marque: 'Worx Landroid',
          prix: 699.9,
          commission: 0.07,
          url: url('B0BG8HL3YH', 'robot tondeuse wifi gazon automatique'),
          surfaceMax: 1000,
        },
        {
          asin: 'B0913HV2SS',
          label: 'Robot tondeuse GPS grandes surfaces',
          marque: 'Worx Landroid L',
          prix: 1299.9,
          commission: 0.07,
          url: url('B0913HV2SS', 'robot tondeuse GPS grandes surfaces gazon'),
          surfaceMin: 1000,
        },
      ],
    },
    accessoires: {
      raclette: {
        asin: null, // 🔵 À remplir — Relaxdays/Wolf raclette caoutchouc
        label: 'Raclette gazon caoutchouc résidus tonte',
        marque: 'Relaxdays',
        prix: 19.9,
        commission: 0.06,
        url: url(null, 'raclette gazon caoutchouc résidus tonte'),
      },
      ramasse: {
        asin: null, // 🔵 À remplir — Wolf/Gardena ramasse-gazon rouleaux
        label: 'Ramasse-gazon à rouleaux',
        marque: 'Wolf',
        prix: 39.9,
        commission: 0.06,
        url: url(null, 'ramasse gazon rouleaux résidus'),
      },
      souffleur: {
        standard: {
          asin: 'B07MY66F7W',
          label: 'Souffleur/aspirateur feuilles électrique',
          marque: 'Black+Decker',
          prix: 90.15,
          commission: 0.07,
          url: url('B07MY66F7W', 'souffleur aspirateur gazon feuilles electrique'),
        },
        premium: {
          asin: 'B0CGRN2KSQ',
          label: 'Souffleur thermique professionnel',
          marque: 'Fuxtec',
          prix: 199.9,
          commission: 0.07,
          url: url('B0CGRN2KSQ', 'souffleur thermique pro gazon feuilles'),
        },
      },
    },
  },
};

export default AMAZON_PRODUCTS;
