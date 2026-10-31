// Catalogue de la page privée « Réponses de groupe » (décision de Jordan du 31/10/2026, voir CLAUDE.md) : pour chaque
// article Conseils, ses points « En bref » passés en « tu » (réponses dans les groupes Facebook) et les mots qui
// servent à le retrouver à partir d'une question collée par Jordan.
// Usage : node scripts/reponses-groupe.mjs > catalogue.json, puis republier catalogue.json avec la page.
// Échoue si un point garde une forme en « vous » : ajouter alors la tournure à TUTOIEMENT.
import { readFileSync, readdirSync } from "node:fs";

const DOSSIER = "content/conseils";

// Mots sans valeur pour trouver un article (formes sans accents), partagés avec la page
const VIDES = `les des une est sont pour par sur dans avec sans aux ces cet cette mon mes ton tes son ses notre nos votre
vos leur leurs nous vous ils elles elle lui moi toi que qui quoi quel quelle quels quelles comment pourquoi quand faut
faire fait font peut peux pouvez puis bonjour bonsoir salut coucou hello merci avance svp stp bien tres trop plus moins
pas non oui deja encore aussi tout tous toute toutes chez mais donc car alors comme etre avoir avez avons ont suis etes
cela ceci celle celui ceux dont entre apres avant depuis pendant ici voila voici quelqu quelque quelques chose choses
dsl desole desolee groupe groupes nouveau nouvelle nouveaux question questions conseil conseils avis aide aider besoin
idee idees probleme problemes mettre mets met mis moment app application mongazon360 mongazon bob article articles
pelouse pelouses gazon gazons herbe herbes jardin jardins plein pleine pleins pleines partout beaucoup petit petite
petits petites gros grosse grand grande vraiment toujours souvent jamais rien maintenant actuellement`
  .split(/\s+/);

// Mots des questions qui ne figurent pas toujours dans l'article (synonymes, formes courantes)
const MOTS_CLES = {
  "aerer-pelouse-carottage": "aérer aération aérateur carottage carotter décompacter tassé compacté louchets",
  "arrosage-automatique-pelouse": "arrosage automatique programmateur arroseur asperseur tuyère goutte-à-goutte purger réseau enterré",
  "biostimulant-gazon": "biostimulant stimulant algues mycorhizes lombricompost",
  "calendrier-entretien-pelouse": "calendrier mois programme année planning entretien",
  "champignons-pelouse": "champignon champignons rond ronds sorcière chapeau spores",
  "chaulage-ph-pelouse": "chaux chauler chaulage pH acide acidité dolomie dolomitique calcium carbonate",
  "combien-arroser-pelouse": "arroser arrosage arrose eau litres dose combien fréquence",
  "creer-pelouse": "créer création nouvelle refaire terre préparer sol semer semis",
  "derniere-tonte-pelouse": "dernière tonte hiver novembre arrêter tondre",
  "desherber-pelouse-sans-chimie": "mauvaises herbes désherber désherbage désherbant pissenlit pissenlits pâquerette pâquerettes plantain trèfle chiendent adventices",
  "engrais-gazon-automne": "engrais automne potassium potasse octobre septembre nourrir",
  "engrais-gazon-printemps": "engrais printemps azote démarrage mars février",
  "engrais-gazon": "engrais fertilisant fertiliser NPK nourrir apport",
  "feuilles-mortes-pelouse": "feuilles feuille mortes ramasser enlever râteau souffleur broyer aspirer",
  "fourmis-pelouse": "fourmi fourmis fourmilière fourmilières nid nids",
  "gazon-en-plaques": "plaques plaque rouleau rouleaux placage poser pose",
  "gazon-ombre": "ombre ombragé arbre arbres soleil",
  "gel-pelouse": "gel gelée gelé givre neige froid dégel",
  "hauteur-tonte-gazon": "hauteur coupe centimètres couper ras court tondre",
  "hiverner-tondeuse-robot-arrosage": "hiverner hivernage ranger remiser rangement essence carburant batterie purger tondeuse robot",
  "maladies-gazon": "maladie maladies fusariose rouille helminthosporiose pythium",
  "mousse-pelouse": "mousse moussue envahie anti-mousse",
  "mulching-pelouse": "mulching mulcher broyer laisser coupée",
  "oiseaux-picorent-pelouse": "oiseaux oiseau corbeaux corneilles pies étourneaux merles picorent picorer picore trous tipules larves",
  "pelouse-canicule": "canicule chaleur chaud sécheresse sèche sec brûlé brûlée grillé grillée",
  "pelouse-detrempee-flaques": "flaques flaque détrempée stagnante boue inondée mouillée drainage",
  "pelouse-jaune-hiver": "jaune jaunit terne pâle décolorée hiver",
  "pelouse-naturelle-sans-chimie": "naturel naturelle bio chimie écologique organique",
  "pelouse-sol-calcaire": "calcaire chlorose basique craie vinaigre soufre",
  "premiere-tonte-printemps": "première tonte printemps reprendre mars avril",
  "preparer-gazon-hiver": "hiver préparer hivernal",
  "preparer-pelouse-printemps": "printemps préparer reprise",
  "quand-semer-gazon": "semer semis semé période date graines",
  "quand-tondre-pelouse": "tondre tonte fréquence pluie heure",
  "quel-gazon-choisir": "choisir variété graines semences type mélange ray-grass fétuque pâturin rustique sport",
  "regarnir-gazon-automne": "regarnir regarnissage sursemis trous clairsemé clairsemée dégarni dégarnie nues",
  "renover-pelouse": "rénover rénovation abîmée refaire sursemis clairsemée",
  "robot-tondeuse-reglages-entretien": "robot automower husqvarna gardena worx landroid navimow mammotion lames hérisson hérissons",
  "scarifier-pelouse": "scarifier scarification scarificateur feutre verticut défeutrer",
  "semer-gazon-novembre": "novembre tard semer semis hiver",
  "semer-gazon-printemps": "semer semis printemps mars avril mai",
  "sulfate-de-fer-pelouse": "sulfate fer anti-mousse noircit noire",
  "taches-jaunes-pelouse": "jaune jaunit jaunie jaunissement taches tache urine chien pipi brûlée",
  "taupes-pelouse": "taupe taupes taupinière taupinières monticules galeries butte",
  "temps-pousse-gazon": "pousse pousser germination germer levée temps semaines",
  "vers-blancs-pelouse": "vers blancs larves hanneton hannetons moquette soulève",
};

// Les articles parlent en « vous », les réponses de groupe en « tu » (comme les réponses déjà postées par Jordan)
const mot = (s) => new RegExp(`(?<!\\p{L})${s}(?!\\p{L})`, "gu");
const TUTOIEMENT = [
  [mot("de votre région"), "de ta région"],
  [mot("pour votre gazon"), "pour ton gazon"],
  [mot("Mesurez votre hauteur réelle"), "Mesure ta hauteur réelle"],
  [mot("surveillez-la"), "surveille-la"],
  [mot("retirez"), "retire"],
  [mot("soulevez"), "soulève"],
  [mot("regardez"), "regarde"],
  [mot("ne marchez pas"), "ne marche pas"],
  [mot("ne tondez pas"), "ne tonds pas"],
  [mot("Notez"), "Note"],
  [mot("attendez"), "attends"],
  [mot("semez"), "sème"],
  [mot("étalez-les"), "étale-les"],
];
const PERMIS = new Set(["chez", "assez", "nez", "rez"]);

const racines = (texte) => texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/œ/g, "oe").replace(/æ/g, "ae").split(/[^a-z0-9]+/)
  .filter(m => (m.length > 2 || m === "ph") && !VIDES.includes(m))
  .map(m => m.length > 5 ? m.slice(0, 5) : m.replace(/(.{3,})[sx]$/, "$1"));

const propre = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").replace(/\*([^*]+)\*/g, "$1")
  .replace(/\s+/g, " ").trim();

const articles = [], erreurs = [];
for (const fichier of readdirSync(DOSSIER).filter(f => f.endsWith(".md")).sort()) {
  const slug = fichier.slice(0, -3);
  const brut = readFileSync(`${DOSSIER}/${fichier}`, "utf8");
  const [, entete, corps] = brut.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
  if (!entete) { erreurs.push(`${slug} : en-tête introuvable`); continue; }
  const champ = (k) => (entete.match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1]?.trim() || "";
  const lignes = corps.split("\n");
  const debut = lignes.findIndex(l => l.startsWith("> **En bref**"));
  const points = [];
  for (let i = debut + 1; debut >= 0 && i < lignes.length && lignes[i].startsWith(">"); i++) {
    if (!lignes[i].startsWith("> - ")) continue;
    let p = propre(lignes[i].slice(4));
    for (const [avant, apres] of TUTOIEMENT) p = p.replace(avant, apres);
    const vous = (p.match(/(?<!\p{L})(vous|votre|vos|\p{L}+ez)(?!\p{L})/giu) || []).filter(m => !PERMIS.has(m.toLowerCase()));
    if (vous.length) erreurs.push(`${slug} : « ${vous.join(", ")} » à passer en « tu » dans « ${p} »`);
    points.push(p);
  }
  if (!points.length) { erreurs.push(`${slug} : pas de bloc « En bref »`); continue; }

  // Poids d'un mot : titre et mots-clés 4, description et points 1,5, texte de l'article 0,5 (mots cités 2 fois ou plus)
  const mots = {};
  const poser = (texte, poids) => { for (const r of racines(texte)) mots[r] = Math.max(mots[r] || 0, poids); };
  const frequences = {};
  for (const r of racines(propre(corps))) frequences[r] = (frequences[r] || 0) + 1;
  for (const [r, n] of Object.entries(frequences)) if (n >= 2) mots[r] = 0.5;
  poser(points.join(" "), 1.5);
  poser(champ("description"), 1.5);
  poser(`${champ("title")} ${MOTS_CLES[slug] || ""}`, 4);
  articles.push({ slug, titre: champ("title"), saison: champ("saison"), date: champ("maj") || champ("date"), points, mots });
}
if (erreurs.length) { console.error(erreurs.join("\n")); process.exit(1); }

// Rareté de chaque mot : comptée sur les titres, mots-clés, descriptions et points (le sujet des articles), sinon sur
// leur texte entier ; un mot présent dans beaucoup d'articles compte peu
const sujet = {}, partout = {}, idf = {};
for (const a of articles) for (const [r, poids] of Object.entries(a.mots)) {
  partout[r] = (partout[r] || 0) + 1;
  if (poids > 0.5) sujet[r] = (sujet[r] || 0) + 1;
}
for (const r of Object.keys(partout)) idf[r] = Math.round(Math.log(1 + articles.length / (sujet[r] || partout[r])) * 100) / 100;

process.stdout.write(JSON.stringify({ genere: new Date().toISOString().slice(0, 10), vides: VIDES, idf, articles }));
