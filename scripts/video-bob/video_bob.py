# Vidéo explicative avec Bob (1080 x 1920, 30 i/s) au format des Reels de Meta : H.264 High 4.0, 4:2:0 BT.709, sans images B,
# AAC 48 kHz, moov en tête, sans liste d'édition. Voix : l'enregistrement de Jordan, nettoyé, blancs entre les phrases réduits ;
# sous-titres calés mot à mot sur sa voix (mots reconnus par transcrire.py, alignés sur le texte) ; Bob « parle » au rythme de la voix.
# Texte : document « textes » de la page « Voix de Bob » (tiré de l'article et de la base de connaissances) : titre, accroche
# (couverture, facultative), scenes [{n, texte, visuel}] ; visuel = éléments de la carte de la scène, de haut en bas :
#   {"type": "sourcil", "texte"}                                   étiquette en capitales
#   {"type": "titre", "texte", "taille"?, "ancre"?}                  grand texte blanc
#   {"type": "ligne", "signe": "oui"|"non", "texte", "taille"?, "ancre"?}   ✓ vert ou ✗ rouge devant le texte
#   {"type": "texte", "texte", "couleur"?: gris|blanc|vert|ambre|rouge, "gras"?, "taille"?, "ancre"?}
#   {"type": "puces", "items": [{"texte", "ancre"?}], "taille"?}      pastilles sur une ou plusieurs lignes
#   {"type": "mois", "bons": [3, 4], "repos"?: [12, 1, 2], "legende"?, "ancre"?, "maintenant"?, "ancre_maintenant"?}
#   {"type": "ph", "ancre"?, "ancre_sous"?, "ancre_dessus"?}         échelle de pH 4 à 8 et ses 3 zones (base : chaux sous 6)
#   {"type": "ordre", "a": [nom, quand], "b": [nom, quand], "ecart", "ancre"?, "ancre_ecart"?}   deux étapes, flèche, écart
#   {"type": "telephone", "ancre"?}                                 téléphone du diagnostic photo, à droite de la carte
#   {"type": "url", "ancre"?}                                       « mongazon360.fr »
# ancre = début du mot prononcé (dans la scène) où l'élément apparaît ; sans ancre, l'élément suit le précédent.
# Usage : /usr/bin/python3 video_bob.py <voix> <mots.json> <texte.json> <sortie.mp4> [mois de publication 1..12]
import datetime, difflib, json, math, os, re, subprocess, sys, unicodedata
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DEPOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")) + "/"
W, H, IPS, SR = 1080, 1920, 30, 48000
VERT_FONCE, VERT = (13, 43, 26), (26, 71, 49)
VERT_CLAIR, BLANC, GRIS = (165, 214, 167), (255, 255, 255), (200, 222, 204)
AMBRE, ROUGE = (255, 213, 79), (255, 138, 128)
GRAS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NORMAL = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
X, CARTE_Y, LARGEUR = 72, 270, 936
NB = " "

voix_src, mots_src, texte_src, sortie = sys.argv[1:5]
mois_pub = int(sys.argv[5]) if len(sys.argv) > 5 else datetime.date.today().month
texte = json.load(open(texte_src, encoding="utf-8"))
mots_asr = json.load(open(mots_src, encoding="utf-8"))
police = lambda chemin, t: ImageFont.truetype(chemin, t)
calque = lambda l, h: Image.new("RGBA", (max(1, l), max(1, h)), (0, 0, 0, 0))


# ── 1. Alignement du texte sur les mots reconnus (lettre à lettre : insensible aux erreurs de reconnaissance) ──────────────
def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if c.isalnum())

jetons = []  # un jeton = un mot du texte, ponctuation collée (les espaces insécables gardent « pelouse ? » entier)
for k, s in enumerate(texte["scenes"]):
    for m in s["texte"].split(" "):
        if m:
            jetons.append({"scene": k, "mot": m})
chaine_t, pos_t = "", []
for i, j in enumerate(jetons):
    n = norm(j["mot"])
    chaine_t += n
    pos_t += [i] * len(n)
chaine_a, pos_a = "", []
for i, m in enumerate(mots_asr):
    n = norm(m["mot"])
    chaine_a += n
    pos_a += [i] * len(n)
correspondance = difflib.SequenceMatcher(None, chaine_t, chaine_a, autojunk=False)
lettres = {}
for a, b, n in correspondance.get_matching_blocks():
    for d in range(n):
        lettres.setdefault(pos_t[a + d], []).append(pos_a[b + d])
for i, j in enumerate(jetons):
    idx = lettres.get(i)
    if idx and len(idx) >= max(1, len(norm(j["mot"])) // 2):
        j["debut"], j["fin"] = mots_asr[min(idx)]["debut"], mots_asr[max(idx)]["fin"]
connus = [i for i, j in enumerate(jetons) if "debut" in j]
if len(connus) < len(jetons) * 0.6:
    sys.exit(f"Alignement insuffisant : {len(connus)}/{len(jetons)} mots retrouvés dans l'enregistrement")
for i, j in enumerate(jetons):  # mots non retrouvés : placés entre leurs voisins
    if "debut" not in j:
        av = max([c for c in connus if c < i], default=None)
        ap = min([c for c in connus if c > i], default=None)
        t0 = jetons[av]["fin"] if av is not None else jetons[ap]["debut"] - 0.3
        t1 = jetons[ap]["debut"] if ap is not None else t0 + 0.3
        j["debut"], j["fin"] = t0, max(t0 + 0.05, t1)

# ── 2. Voix : nettoyée, blancs entre les phrases ramenés à 0,3 s ─────────────────────────────────────────────────────────
def lire_pcm(chemin, filtres=None):
    cmd = ["/usr/bin/ffmpeg", "-v", "error", "-i", chemin] + (["-af", filtres] if filtres else []) + ["-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).copy()

brut = lire_pcm(voix_src, "highpass=f=80,afftdn=nf=-28,acompressor=threshold=-21dB:ratio=2.5:attack=8:release=120")
AVANT, APRES, BLANC_SCENE, DEBUT, FIN = 0.15, 0.28, 0.30, 0.35, 2.2
morceaux, scenes, curseur = [np.zeros(int(DEBUT * SR), np.float32)], [], DEBUT
for k in range(len(texte["scenes"])):
    js = [j for j in jetons if j["scene"] == k]
    a, b = max(0.0, js[0]["debut"] - AVANT), js[-1]["fin"] + APRES
    if k + 1 < len(texte["scenes"]):
        suivant = min(j["debut"] for j in jetons if j["scene"] == k + 1)
        b = min(b, (js[-1]["fin"] + suivant) / 2)
    seg = brut[int(a * SR): int(b * SR)].copy()
    f = min(len(seg) // 2, int(0.012 * SR))
    if f:
        seg[:f] *= np.linspace(0, 1, f, dtype=np.float32)
        seg[-f:] *= np.linspace(1, 0, f, dtype=np.float32)
    decalage = curseur - a
    for j in js:
        j["t0"], j["t1"] = j["debut"] + decalage, j["fin"] + decalage
    scenes.append({"debut": curseur, "fin": curseur + len(seg) / SR})
    morceaux.append(seg)
    curseur += len(seg) / SR
    morceaux.append(np.zeros(int((BLANC_SCENE if k + 1 < len(texte["scenes"]) else FIN) * SR), np.float32))
    curseur = sum(len(m) for m in morceaux) / SR
voix = np.concatenate(morceaux)
DUREE = len(voix) / SR
for k, s in enumerate(scenes):  # chaque image de scène reste jusqu'au début de la suivante
    s["fin"] = scenes[k + 1]["debut"] if k + 1 < len(scenes) else DUREE
brut_wav = sortie.replace(".mp4", "-voix-montee.wav")
subprocess.run(["/usr/bin/ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), brut_wav], input=voix.tobytes(), check=True)
finale = lire_pcm(brut_wav)
# Enveloppe de la voix, image par image (0 à 1, lissée) : anime Bob quand il parle
n_img = int(math.ceil(DUREE * IPS))
env = np.array([np.sqrt(np.mean(finale[int(i / IPS * SR): int((i + 1) / IPS * SR)] ** 2) + 1e-12) for i in range(n_img)])
env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
for i in range(1, n_img):
    env[i] = max(env[i], env[i - 1] * 0.82)  # retombée douce

# ── 3. Dessin ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def lignes(d, mots, f, largeur):
    res, cur = [], []
    for m in mots:
        essai = " ".join(cur + [m])
        if cur and d.textlength(essai, font=f) > largeur:
            res.append(cur)
            cur = [m]
        else:
            cur.append(m)
    return res + ([cur] if cur else [])

def bloc_texte(txt, f, couleur, largeur, interligne=1.22):
    d = ImageDraw.Draw(calque(1, 1))
    ls = lignes(d, txt.split(" "), f, largeur)
    pas = int(f.size * interligne)
    c = calque(largeur, pas * len(ls) + int(f.size * 0.3))
    dc = ImageDraw.Draw(c)
    for i, l in enumerate(ls):
        dc.text((0, i * pas), " ".join(l), font=f, fill=couleur)
    return c

def puce(txt, f, fond, encre, bord=None, marge=(30, 16)):
    d = ImageDraw.Draw(calque(1, 1))
    l = int(d.textlength(txt, font=f)) + 2 * marge[0]
    h = int(f.size * 1.25) + 2 * marge[1]
    c = calque(l, h)
    dc = ImageDraw.Draw(c)
    dc.rounded_rectangle((0, 0, l - 1, h - 1), radius=h // 2, fill=fond, outline=bord, width=3 if bord else 0)
    dc.text((marge[0], marge[1] + 2), txt, font=f, fill=encre)
    return c

def ligne_signe(signe, couleur_signe, txt, taille):
    f, fs = police(GRAS, taille), police(GRAS, int(taille * 1.05))
    d = ImageDraw.Draw(calque(1, 1))
    ls = lignes(d, txt.split(" "), f, LARGEUR - int(taille * 1.25))
    pas = int(taille * 1.2)
    c = calque(LARGEUR, pas * len(ls) + int(taille * 0.3))
    dc = ImageDraw.Draw(c)
    dc.text((0, -2), signe, font=fs, fill=couleur_signe)
    for i, l in enumerate(ls):
        dc.text((int(taille * 1.25), i * pas), " ".join(l), font=f, fill=BLANC)
    return c

def sourcil(txt):
    return puce(txt, police(GRAS, 30), (165, 214, 167, 38), VERT_CLAIR, marge=(22, 10))

MOIS = "JFMAMJJASOND"
def bande_mois(bons, repos, legende, courant):
    l, h, g = LARGEUR // 12, 92, 6
    c = calque(LARGEUR, h + (64 if legende else 8))
    d = ImageDraw.Draw(c)
    f, fp = police(GRAS, 40), police(GRAS, 30)
    for i, m in enumerate(MOIS):
        x = i * l
        bon, dort = (i + 1) in bons, (i + 1) in repos
        d.rounded_rectangle((x + g // 2, 0, x + l - g // 2, h), radius=16,
                            fill=VERT_CLAIR if bon else ((255, 255, 255, 8) if dort else (255, 255, 255, 22)),
                            outline=AMBRE if i == courant - 1 else None, width=5)
        tl = d.textlength(m, font=f)
        d.text((x + (l - tl) / 2, 22), m, font=f, fill=VERT_FONCE if bon else ((120, 150, 130) if dort else GRIS))
    if legende and bons:
        d.text(((min(bons) - 1) * l + 8, h + 14), legende, font=fp, fill=VERT_CLAIR)
    return c

def marque_maintenant(txt, courant):
    l = LARGEUR // 12
    p = puce(txt, police(GRAS, 28), (255, 213, 79, 40), AMBRE, marge=(18, 8))
    x = min(LARGEUR - p.width, max(0, int((courant - 0.5) * l - p.width / 2)))
    return p, x

def echelle_ph():
    c = calque(LARGEUR, 150)
    d = ImageDraw.Draw(c)
    stops = [(4, (239, 108, 0)), (5, (251, 192, 45)), (6, (156, 204, 101)), (7, (67, 160, 71)), (8, (66, 133, 244))]
    for x in range(LARGEUR):
        ph = 4 + 4 * x / (LARGEUR - 1)
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= ph <= b:
                t = (ph - a) / (b - a)
                d.line([(x, 0), (x, 56)], fill=tuple(int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3)))
                break
    masque = calque(LARGEUR, 57)
    ImageDraw.Draw(masque).rounded_rectangle((0, 0, LARGEUR - 1, 56), radius=28, fill=(255, 255, 255, 255))
    barre = c.crop((0, 0, LARGEUR, 57))
    barre.putalpha(masque.getchannel("A"))
    c = calque(LARGEUR, 150)
    c.alpha_composite(barre, (0, 0))
    d = ImageDraw.Draw(c)
    f = police(GRAS, 34)
    for v in range(4, 9):
        x = int((v - 4) / 4 * (LARGEUR - 1))
        d.line([(x, 62), (x, 80)], fill=GRIS, width=3)
        tl = d.textlength(str(v), font=f)
        d.text((min(LARGEUR - tl, max(0, x - tl / 2)), 86), str(v), font=f, fill=BLANC)
    return c

def zone_ph(txt, couleur, largeur):
    return bloc_texte(txt, police(GRAS, 32), couleur, largeur, 1.18)

def bloc_produit(nom, quand, taille_nom=50):
    l, h = 420, 170
    c = calque(l, h)
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, l - 1, h - 1), radius=28, fill=(255, 255, 255, 26), outline=(165, 214, 167, 150), width=3)
    fn, fq = police(GRAS, taille_nom), police(NORMAL, 34)
    d.text(((l - d.textlength(nom, font=fn)) / 2, 34), nom, font=fn, fill=BLANC)
    d.text(((l - d.textlength(quand, font=fq)) / 2, 104), quand, font=fq, fill=GRIS)
    return c

def telephone():
    l, h = 300, 540
    c = calque(l, h)
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, l - 1, h - 1), radius=44, fill=(10, 24, 16, 255), outline=BLANC, width=6)
    photo = Image.open(DEPOT + "public/gazon-avant.jpg").convert("RGB")
    il, ih = l - 36, h - 150
    r = max(il / photo.width, ih / photo.height)
    photo = photo.resize((int(photo.width * r), int(photo.height * r)), Image.LANCZOS)
    x0 = (photo.width - il) // 2
    photo = photo.crop((x0, 0, x0 + il, ih)).convert("RGBA")
    m = calque(il, ih)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, il - 1, ih - 1), radius=18, fill=(255, 255, 255, 255))
    photo.putalpha(m.getchannel("A"))
    c.alpha_composite(photo, (18, 70))
    f = police(GRAS, 26)
    t = "Diagnostic photo"
    d.text(((l - d.textlength(t, font=f)) / 2, 26), t, font=f, fill=BLANC)
    cx, cy = l // 2, h - 42
    d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), outline=BLANC, width=5)
    d.ellipse((cx - 21, cy - 21, cx + 21, cy + 21), fill=BLANC)
    return c

def ancre(k, mot, defaut):
    """Instant (dans la scène k) où le mot commence à être prononcé."""
    if not mot:
        return defaut
    cible = norm(mot)
    for j in jetons:
        if j["scene"] == k and norm(j["mot"]).startswith(cible):
            return j["t0"] - scenes[k]["debut"]
    print(f"  scène {k + 1} : mot « {mot} » introuvable, apparition par défaut", file=sys.stderr)
    return defaut

COULEURS = {"gris": GRIS, "blanc": BLANC, "vert": VERT_CLAIR, "ambre": AMBRE, "rouge": ROUGE}
HAUT_CARTE, ECART = 640, 26

def carte_scene(k, visuel):
    """Pièces de la carte (calque, x, y, début) et flèches (x0, x1, y, début, fin), de haut en bas."""
    pieces, fleches, y, t = [], [], 0, 0.05
    tel = any(e.get("type") == "telephone" for e in visuel)
    larg = 600 if tel else LARGEUR
    nb = lambda s: re.sub(r" ([?!:;»])", NB + r"\1", s)
    for e in visuel:
        ty = e.get("type")
        t = ancre(k, e.get("ancre"), t + (0.05 if ty == "sourcil" else 0.35))
        if ty == "sourcil":
            c = sourcil(e["texte"]); pieces.append((c, 0, y, t)); y += c.height + ECART
        elif ty == "titre":
            c = bloc_texte(nb(e["texte"]), police(GRAS, e.get("taille", 66)), BLANC, larg, 1.12)
            pieces.append((c, 0, y, t)); y += c.height + ECART - 10
        elif ty == "ligne":
            oui = e.get("signe", "oui") == "oui"
            c = ligne_signe("✓" if oui else "✗", VERT_CLAIR if oui else ROUGE, nb(e["texte"]), e.get("taille", 62))
            pieces.append((c, 0, y, t)); y += c.height + ECART - 6
        elif ty == "texte":
            f = police(GRAS if e.get("gras") else NORMAL, e.get("taille", 38))
            c = bloc_texte(nb(e["texte"]), f, COULEURS.get(e.get("couleur", "gris"), GRIS), larg)
            pieces.append((c, 0, y, t)); y += c.height + ECART
        elif ty == "puces":
            x, h_ligne = 0, 0
            for n, it in enumerate(e["items"]):
                tp = ancre(k, it.get("ancre"), t + 0.3 * n)
                c = puce(nb(it["texte"]), police(GRAS, e.get("taille", 40)), (255, 255, 255, 30), BLANC, VERT_CLAIR)
                if x and x + c.width > larg:
                    x, y = 0, y + h_ligne + 16
                pieces.append((c, x, y, tp)); x += c.width + 20; h_ligne = max(h_ligne, c.height)
                t = max(t, tp)
            y += h_ligne + ECART
        elif ty == "mois":
            c = bande_mois(e.get("bons", []), e.get("repos", []), e.get("legende"), mois_pub)
            pieces.append((c, 0, y, t))
            if e.get("maintenant"):
                p, xp = marque_maintenant(e["maintenant"], mois_pub)
                pieces.append((p, xp, y + 100, ancre(k, e.get("ancre_maintenant"), t + 0.6)))
            y += c.height + ECART + 10
        elif ty == "ph":
            z = LARGEUR // 4
            pieces.append((echelle_ph(), 0, y, t))
            ts, td = ancre(k, e.get("ancre_sous"), t + 0.6), ancre(k, e.get("ancre_dessus"), t + 1.2)
            pieces += [(zone_ph("Sous 6" + NB + ": chaux à l'automne", AMBRE, 2 * z - 20), 0, y + 150, ts),
                       (zone_ph("6 à 7" + NB + ": inutile", GRIS, z - 10), 2 * z + 6, y + 150, td),
                       (zone_ph("Plus de 7" + NB + ": jamais", ROUGE, z - 4), 3 * z + 4, y + 150, td + 0.25)]
            y += 150 + 90 + ECART
        elif ty == "ordre":
            a, b = e["a"], e["b"]
            pieces += [(bloc_produit(a[0], a[1], 50 if len(a[0]) < 12 else 44), 0, y, t),
                       (bloc_produit(b[0], b[1], 50 if len(b[0]) < 12 else 44), LARGEUR - 420, y, t + 0.3)]
            te = ancre(k, e.get("ancre_ecart"), t + 1.0)
            fleches.append((432, 504, y + 85, t + 0.5, max(t + 0.8, te)))
            c = bloc_texte(nb(e["ecart"]), police(GRAS, 40), AMBRE, LARGEUR)
            pieces.append((c, 0, y + 170 + 24, te)); y += 170 + 24 + c.height + ECART
        elif ty == "telephone":
            pieces.append((telephone(), LARGEUR - 300, 30, t))
        elif ty == "url":
            c = bloc_texte("mongazon360.fr", police(GRAS, 56), BLANC, larg)
            pieces.append((c, 0, max(y, 440), t)); y = max(y, 440) + c.height + ECART
        else:
            sys.exit(f"Scène {k + 1} : élément inconnu {ty!r}")
    bas = max([py + c.height for c, px, py, _ in pieces] + [0])
    if bas > HAUT_CARTE:
        print(f"  scène {k + 1} : la carte déborde ({bas} px pour {HAUT_CARTE})", file=sys.stderr)
    return pieces, fleches

CARTES = [carte_scene(k, s.get("visuel") or [{"type": "titre", "texte": s["texte"]}]) for k, s in enumerate(texte["scenes"])]

def apparition(t, debut, duree=0.45):
    p = min(1.0, max(0.0, (t - debut) / duree))
    return 1 - (1 - p) ** 3

def avec_opacite(c, a):
    if a >= 0.999:
        return c
    r = c.copy()
    r.putalpha(r.getchannel("A").point(lambda v: int(v * a)))
    return r

# Sous-titres : morceaux de phrase (coupés à la ponctuation, 2 lignes au plus), mot prononcé en couleur
F_ST = police(GRAS, 54)
mesure = ImageDraw.Draw(calque(1, 1))
LARGEUR_ST = 940 - X - 2 * 34
morceaux_st = []
for k in range(len(texte["scenes"])):
    js = [j for j in jetons if j["scene"] == k]
    cur = []
    for j in js:
        cur.append(j)
        txt = " ".join(x["mot"] for x in cur)
        fin_phrase = re.search(r"[.?!:]$", j["mot"])
        trop = len(lignes(mesure, txt.split(" "), F_ST, LARGEUR_ST)) > 2
        if trop:
            cur.pop()
            morceaux_st.append(cur)
            cur = [j]
        elif fin_phrase or (j["mot"].endswith(",") and len(txt) > 24):
            morceaux_st.append(cur)
            cur = []
    if cur:
        morceaux_st.append(cur)
for i, m in enumerate(morceaux_st):
    m_debut = m[0]["t0"] - 0.08
    suivant = morceaux_st[i + 1][0]["t0"] - 0.08 if i + 1 < len(morceaux_st) else DUREE
    m_fin = min(suivant, m[-1]["t1"] + 0.6)
    morceaux_st[i] = {"mots": m, "debut": m_debut, "fin": m_fin}

def sous_titre(t):
    m = next((m for m in morceaux_st if m["debut"] <= t < m["fin"]), None)
    if not m:
        return None
    ls = lignes(mesure, [j["mot"] for j in m["mots"]], F_ST, LARGEUR_ST)
    pas = int(F_ST.size * 1.24)
    h = pas * len(ls) + 44
    c = calque(940 - X, h)
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, c.width - 1, h - 1), radius=30, fill=(8, 30, 18, 220))
    i = 0
    for n, l in enumerate(ls):
        x = 34
        for mot in l:
            j = m["mots"][i]
            i += 1
            coul = AMBRE if j["t0"] - 0.05 <= t < j["t1"] else (BLANC if t >= j["t1"] else (255, 255, 255, 150))
            d.text((x, 20 + n * pas), mot, font=F_ST, fill=coul)
            x += mesure.textlength(mot + " ", font=F_ST)
    return c

# Fond, pelouse et Bob
fond = Image.new("RGB", (W, H))
dg = ImageDraw.Draw(fond)
for y in range(H):
    t = y / H
    dg.line([(0, y), (W, y)], fill=tuple(int(VERT_FONCE[i] + (VERT[i] - VERT_FONCE[i]) * t) for i in range(3)))
fond = fond.convert("RGBA")
pelouse = Image.open(DEPOT + "public/gazon-apres.jpg").convert("RGB")
Y_PELOUSE = 1440

def bande_pelouse(zoom):
    l, h = W, H - Y_PELOUSE
    r = max(l / pelouse.width, h / pelouse.height) * zoom
    img = pelouse.resize((int(pelouse.width * r), int(pelouse.height * r)), Image.BILINEAR)
    x0, y0 = (img.width - l) // 2, (img.height - h) // 2
    bande = img.crop((x0, y0, x0 + l, y0 + h)).convert("RGBA")
    fondu = calque(l, 170)
    df = ImageDraw.Draw(fondu)
    for y in range(170):
        df.line([(0, y), (l, y)], fill=(*VERT, int(255 * (1 - y / 170))))
    bande.alpha_composite(fondu)
    return bande

bob = Image.open(DEPOT + "public/mg360-mascot-transparent.png").convert("RGBA")
bob = bob.crop(bob.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox())
HB = 640
bob = bob.resize((int(bob.width * HB / bob.height), HB), Image.LANCZOS)
BOB_X, BOB_Y = 22, H - HB - 130

def ondes(a):
    c = calque(120, 140)
    d = ImageDraw.Draw(c)
    for r in range(3):
        rr = 26 + r * 22
        d.arc((60 - rr, 70 - rr, 60 + rr, 70 + rr), start=-40, end=40, fill=(255, 255, 255, int(220 * a * (1 - r * 0.25))), width=7)
    return c

# ── 4. Images et encodage ───────────────────────────────────────────────────────────────────────────────────────────────
ff = subprocess.Popen(["/usr/bin/ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                       "-r", str(IPS), "-i", "-", "-i", brut_wav, "-shortest",
                       "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-profile:v", "high", "-level:v", "4.0",
                       "-bf", "0", "-g", str(2 * IPS), "-colorspace", "bt709", "-color_primaries", "bt709",
                       "-color_trc", "bt709", "-color_range", "tv",
                       "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k",
                       "-movflags", "+faststart", "-use_editlist", "0", sortie], stdin=subprocess.PIPE)
for i in range(n_img):
    t = i / IPS
    img = fond.copy()
    img.alpha_composite(bande_pelouse(1.0 + 0.05 * t / DUREE), (0, Y_PELOUSE))
    k = next(n for n, s in enumerate(scenes) if t < s["fin"] or n == len(scenes) - 1)
    s = scenes[k]
    tl = t - s["debut"]
    sortie_a = 1 - apparition(t, s["fin"] - 0.22, 0.22) if k + 1 < len(scenes) else 1.0
    carte = calque(LARGEUR, HAUT_CARTE)
    pieces, fleches = CARTES[k]
    for c, x, y, debut in pieces:
        a = apparition(tl, debut)
        if a > 0:
            carte.alpha_composite(avec_opacite(c, a), (x, y + int((1 - a) * 30)))
    for x0, x1, y, debut, fin in fleches:
        p = apparition(tl, debut, max(0.3, fin - debut))
        if p > 0:
            d = ImageDraw.Draw(carte)
            xe = x0 + (x1 - x0) * p
            d.line([(x0, y), (xe, y)], fill=AMBRE, width=8)
            if p > 0.6:
                d.polygon([(xe + 12, y), (xe - 10, y - 16), (xe - 10, y + 16)], fill=AMBRE)
    a_carte = min(apparition(tl, 0, 0.35), sortie_a)
    img.alpha_composite(avec_opacite(carte, a_carte), (X, CARTE_Y + int((1 - apparition(tl, 0, 0.35)) * 40)))
    st = sous_titre(t)
    if st:
        img.alpha_composite(st, (X, 905))
    e = float(env[i])
    echelle = 1 + 0.025 * e
    b = bob.resize((int(bob.width * echelle), int(bob.height * echelle)), Image.BILINEAR)
    b = b.rotate(1.6 * math.sin(t * 8.5) * e, resample=Image.BICUBIC, center=(b.width // 2, b.height))
    dy = int(5 * math.sin(t * 2.2) - 8 * e)
    img.alpha_composite(b, (BOB_X - (b.width - bob.width) // 2, BOB_Y - (b.height - bob.height) + dy))
    if e > 0.05:
        img.alpha_composite(ondes(e), (BOB_X + int(bob.width * 0.6), BOB_Y + int(bob.height * 0.1) + dy))
    ff.stdin.write(img.convert("RGB").tobytes())
ff.stdin.close()
ff.wait()

# Couverture : le titre de la vidéo, Bob et notre pelouse
couv = fond.copy()
couv.alpha_composite(bande_pelouse(1.0), (0, Y_PELOUSE))
premier = next((e["texte"] for e in (texte["scenes"][0].get("visuel") or []) if e.get("type") == "sourcil"), "CONSEIL GAZON")
couv.alpha_composite(sourcil(premier), (X, CARTE_Y))
titre_couv = bloc_texte(re.sub(r" ([?!:;])", NB + r"\1", texte["titre"]), police(GRAS, 96), BLANC, LARGEUR, 1.12)
couv.alpha_composite(titre_couv, (X, CARTE_Y + 72))
couv.alpha_composite(bloc_texte(texte.get("accroche") or "En 45 secondes avec Bob", police(GRAS, 44), VERT_CLAIR, LARGEUR),
                     (X, CARTE_Y + 72 + titre_couv.height + 20))
couv.alpha_composite(bob, (BOB_X, BOB_Y))
couv.convert("RGB").save(sortie.replace(".mp4", "-couverture.jpg"), quality=90)
json.dump({"duree": round(DUREE, 2), "scenes": [{k: round(v, 2) for k, v in s.items()} for s in scenes],
           "sous_titres": [{"debut": round(m["debut"], 2), "fin": round(m["fin"], 2), "texte": " ".join(j["mot"] for j in m["mots"])} for m in morceaux_st]},
          open(sortie.replace(".mp4", "-calage.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(sortie, "ok" if ff.returncode == 0 else f"ffmpeg {ff.returncode}", f"{DUREE:.1f} s, {len(connus)}/{len(jetons)} mots calés")
