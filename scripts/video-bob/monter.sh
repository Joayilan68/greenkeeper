#!/bin/bash
# Montage d'une vidéo explicative avec Bob (règle « Vidéos explicatives avec Bob » de CLAUDE.md) :
#   scripts/video-bob/monter.sh <enregistrement de Jordan> <texte.json> <sortie.mp4> [mois de publication 1..12]
# texte.json = document « textes » de la page « Voix de Bob » (outil ArtifactData, action get, out_dir).
# Installe au premier passage, hors du dépôt, l'environnement de reconnaissance vocale (faster-whisper, modèle « small »).
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/mg360-video"
if [ ! -x "$CACHE/venv/bin/python" ]; then
  /usr/bin/python3 -m venv --system-site-packages "$CACHE/venv"
  "$CACHE/venv/bin/pip" install -q faster-whisper
fi
PROMPT="$(/usr/bin/python3 -c 'import json,sys; t=json.load(open(sys.argv[1],encoding="utf-8")); t=t.get("data",t); print(" ".join(s["texte"].replace(" "," ") for s in t["scenes"]))' "$2")"
TEXTE="$(mktemp --suffix=.json)"
/usr/bin/python3 -c 'import json,sys; t=json.load(open(sys.argv[1],encoding="utf-8")); json.dump(t.get("data",t),open(sys.argv[2],"w",encoding="utf-8"),ensure_ascii=False)' "$2" "$TEXTE"
"$CACHE/venv/bin/python" "$ICI/transcrire.py" "$1" "${3%.mp4}-mots.json" "$CACHE/modeles" "$PROMPT"
/usr/bin/python3 "$ICI/video_bob.py" "$1" "${3%.mp4}-mots.json" "$TEXTE" "$3" "${4:-$(date +%-m)}"
rm -f "$TEXTE"
ffmpeg -hide_banner -nostats -i "$3" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary" | grep -E "I:|Peak:" || true
