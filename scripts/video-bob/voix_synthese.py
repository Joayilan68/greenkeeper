# Voix de synthèse d'une vidéo de Bob (Kyutai TTS 1.6B, sur processeur) : plusieurs prises de chaque phrase, lancé par voix.sh.
# Usage : <python de moshi> voix_synthese.py <texte.json> <dossier des prises> <dossier du modèle> <voix.safetensors> [prises]
#   texte.json : document « textes » de la page « Voix de Bob » ; scenes [{texte, dit?}], dit = ce qui est prononcé quand
#   il diffère du texte affiché (« pé hache » pour pH, nombres en lettres) ; sinon le texte affiché, ponctuation adaptée.
#   Sorties : prise<j>-scene<k>.wav (24 kHz) ; les prises déjà faites ne sont pas refaites ; « PRISES_TERMINEES » à la fin.
import json, re, sys, time
from pathlib import Path
import numpy as np, soundfile as sf, torch
from moshi.models.loaders import CheckpointInfo
from moshi.models.tts import TTSModel

texte = json.load(open(sys.argv[1], encoding="utf-8"))
texte = texte.get("data", texte)
sortie, M, voix = Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
prises = int(sys.argv[5]) if len(sys.argv) > 5 else 3
sortie.mkdir(parents=True, exist_ok=True)


def a_dire(scene):
    t = scene.get("dit") or scene["texte"]
    t = t.replace(" ", " ").replace(" ", " ").replace("Mongazon360", "Mon gazon trois cent soixante")
    t = re.sub(r" ([?!])", r"\1", t)   # pas d'espace avant ? et !
    t = re.sub(r" ?[:;]", ",", t)      # le moteur lit mal les deux-points : une virgule à la place
    return t.strip() + ' <break time="0.5s"/>'  # sans ce silence, la fin de la phrase peut être coupée


phrases = [a_dire(s) for s in texte["scenes"]]
json.dump(phrases, open(sortie / "phrases.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
torch.set_num_threads(4)
info = CheckpointInfo.from_hf_repo("kyutai/tts-1.6b-en_fr", moshi_weights=str(M / "dsm_tts_1e68beda@240.safetensors"),
                                   mimi_weights=str(M / "tokenizer-e351c8d8-checkpoint125.safetensors"),
                                   tokenizer=str(M / "tokenizer_spm_8k_en_fr_audio.model"), config_path=str(M / "config.json"))
tts = TTSModel.from_checkpoint_info(info, n_q=32, temp=0.6, device="cpu", dtype=torch.float32)
sr = tts.mimi.sample_rate
for j in range(1, prises + 1):
    manquantes = [k for k in range(len(phrases)) if not (sortie / f"prise{j}-scene{k + 1}.wav").exists()]
    if not manquantes:
        continue
    t0 = time.time()
    torch.manual_seed(1000 * j + len(manquantes))
    pcms = tts.simple_generate([phrases[k] for k in manquantes], voix, cfg_coef=2.0, show_progress=False)
    for k, p in zip(manquantes, pcms):
        a = p.cpu().numpy().astype(np.float32).reshape(-1)
        crete = float(np.abs(a).max())
        if crete > 0.97:
            a *= 0.97 / crete
        sf.write(sortie / f"prise{j}-scene{k + 1}.wav", a, sr, subtype="PCM_16")
    print(f"prise {j} : {len(manquantes)} phrases en {time.time() - t0:.0f} s", flush=True)
print("PRISES_TERMINEES", flush=True)
