# Mots prononcés et leurs instants (faster-whisper, français), pour caler les sous-titres de video_bob.py → JSON [{mot, debut, fin}]
# Usage : <python du venv> transcrire.py <voix> <mots.json> <dossier des modèles> [texte attendu, pour guider la reconnaissance]
import json, subprocess, sys, time
import numpy as np
from faster_whisper import WhisperModel
t0 = time.time()
modele = WhisperModel("small", device="cpu", compute_type="int8", download_root=sys.argv[3])
pcm = subprocess.run(["/usr/bin/ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
segments, info = modele.transcribe(audio, language="fr", word_timestamps=True, vad_filter=False, beam_size=5,
                                   initial_prompt=sys.argv[4] if len(sys.argv) > 4 else None)
mots = [{"mot": w.word.strip(), "debut": round(w.start, 3), "fin": round(w.end, 3)} for s in segments for w in s.words]
json.dump(mots, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(mots), "mots en", round(time.time() - t0, 1), "s :", " ".join(m["mot"] for m in mots))
