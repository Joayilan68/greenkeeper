# Choix de la meilleure prise de chaque phrase et assemblage de la voix de la vidéo.
# Critère : ce que la reconnaissance vocale entend SANS être guidée par le texte (sinon elle recopie le texte attendu),
# comparé lettre à lettre à ce qui doit être dit, nombres écrits en lettres ; à égalité, la durée la plus proche de la médiane.
# Usage : <python de faster-whisper> choisir_prises.py <texte.json> <dossier des prises> <voix.wav> <dossier des modèles whisper>
import difflib, json, re, subprocess, sys, unicodedata
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

texte = json.load(open(sys.argv[1], encoding="utf-8")); texte = texte.get("data", texte)
dossier, sortie = Path(sys.argv[2]), sys.argv[3]
modele = WhisperModel("small", device="cpu", compute_type="int8", download_root=sys.argv[4])
SR = 24000
U = "zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf".split()
D = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante", 8: "quatre-vingt"}


def en_lettres(n):  # 0 à 999
    n = int(n)
    if n >= 1000: return str(n)
    if n >= 100:
        c, r = divmod(n, 100)
        return ((U[c] + " ") if c > 1 else "") + "cent" + ((" " + en_lettres(r)) if r else "")
    if n < 20: return U[n]
    d, u = divmod(n, 10)
    if d in (7, 9): return D[d - 1] + ("-" if not (d == 7 and u == 1) else " et ") + U[10 + u]
    return D[d] + ((" et un" if u == 1 and d != 8 else "-" + U[u]) if u else "")


def norm(s):
    s = s.replace("Mongazon360", "Mon gazon 360")
    s = re.sub(r"\d+", lambda m: " " + en_lettres(m.group()) + " ", s)
    s = unicodedata.normalize("NFD", s.lower().replace("œ", "oe"))
    return "".join(c for c in s if c.isalnum())


def lire(f, sr):
    pcm = subprocess.run(["/usr/bin/ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


cache_f = dossier / "controle-sans-guide.json"
cache = json.load(open(cache_f, encoding="utf-8")) if cache_f.exists() else {}
choix, morceaux, bilan = [], [np.zeros(int(0.4 * SR), np.float32)], []
for k, s in enumerate(texte["scenes"]):
    attendu = s.get("dit") or s["texte"]
    essais = []
    for f in sorted(dossier.glob(f"prise*-scene{k + 1}.wav")):
        if f.name not in cache:
            seg, _ = modele.transcribe(lire(f, 16000), language="fr", beam_size=5)
            a = lire(f, SR); e = np.abs(a); fin = len(a)
            while fin > 0 and e[max(0, fin - 480):fin].max() < 0.01: fin -= 480
            cache[f.name] = {"entendu": " ".join(x.text.strip() for x in seg), "duree": round(fin / SR, 2)}
            json.dump(cache, open(cache_f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        c = cache[f.name]
        c["fidelite"] = round(difflib.SequenceMatcher(None, norm(attendu), norm(c["entendu"]), autojunk=False).ratio(), 3)
        essais.append((f, c))
    mediane = float(np.median([c["duree"] for _, c in essais]))
    meilleur = max(essais, key=lambda fc: (fc[1]["fidelite"], -abs(fc[1]["duree"] - mediane)))
    for f, c in essais:
        print(("→ " if f is meilleur[0] else "  ") + f.name, c["fidelite"], c["duree"], "s |", c["entendu"], flush=True)
    choix.append(meilleur[0].name); bilan.append(meilleur[1]["fidelite"])
    a = lire(meilleur[0], SR)
    morceaux += [a[:int(meilleur[1]["duree"] * SR) + int(0.12 * SR)], np.zeros(int(0.9 * SR), np.float32)]
voix = np.concatenate(morceaux)
subprocess.run(["/usr/bin/ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", sortie], input=voix.tobytes(), check=True)
json.dump({"prises": choix, "fidelite": bilan}, open(Path(sortie).with_suffix(".json"), "w"), indent=1)
print("VOIX_ASSEMBLEE", round(len(voix) / SR, 1), "s", choix, bilan)
