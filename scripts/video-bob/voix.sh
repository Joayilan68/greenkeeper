#!/bin/bash
# Voix de synthèse d'une vidéo de Bob (voix « A », validée par Jordan le 14/11/2026) :
#   scripts/video-bob/voix.sh <texte.json> <dossier de travail>   →   <dossier de travail>/voix.wav, à donner à monter.sh
# Moteur Kyutai TTS 1.6B (français natif, modèle sous licence CC BY 4.0 : « Voix de synthèse (Kyutai TTS) » dans le texte
# de la publication) ; voix donnée par un volontaire pour être réutilisée (dépôt kyutai/tts-voices, voice-donations/2181,
# CC0). 3 prises par phrase, la mieux prononcée est gardée (choisir_prises.py). Reprend là où il s'est arrêté.
# Installe au premier passage, hors du dépôt (4,5 Go) : Python 3.11, PyTorch pour processeur, moshi, le modèle et la voix.
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/mg360-video"
K="$CACHE/kyutai"
VOIX="voice-donations/2181.wav.1e68beda@240.safetensors"
mkdir -p "$K/modele" "$K/voix/voice-donations" "$2"
if [ ! -x "$K/venv/bin/python" ]; then
  "$(command -v python3.11 || command -v python3)" -m venv "$K/venv"
  "$K/venv/bin/pip" install -q --index-url https://download.pytorch.org/whl/cpu torch==2.6.0
  "$K/venv/bin/pip" install -q moshi==0.2.13 soundfile
fi
telecharger() { [ -s "$2" ] || { curl -fsSL -C - --retry 5 --max-time 3000 -o "$2.partiel" "$1" && mv "$2.partiel" "$2"; }; }
for f in config.json tokenizer_spm_8k_en_fr_audio.model tokenizer-e351c8d8-checkpoint125.safetensors "dsm_tts_1e68beda@240.safetensors"; do
  telecharger "https://huggingface.co/kyutai/tts-1.6b-en_fr/resolve/main/${f//@/%40}" "$K/modele/$f"
done
telecharger "https://huggingface.co/kyutai/tts-voices/resolve/main/${VOIX//@/%40}" "$K/voix/$VOIX"
if [ ! -x "$CACHE/venv/bin/python" ]; then  # reconnaissance vocale (la même que monter.sh)
  /usr/bin/python3 -m venv --system-site-packages "$CACHE/venv"
  "$CACHE/venv/bin/pip" install -q faster-whisper
fi
"$K/venv/bin/python" "$ICI/voix_synthese.py" "$1" "$2/prises" "$K/modele" "$K/voix/$VOIX" 3
"$CACHE/venv/bin/python" "$ICI/choisir_prises.py" "$1" "$2/prises" "$2/voix.wav" "$CACHE/modeles"
