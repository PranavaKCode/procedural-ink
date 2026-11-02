#!/usr/bin/env bash
# copies the generator and its page into final/interactive (self-contained, works from file://)
set -e
cd "$(dirname "$0")/.."
mkdir -p final/interactive/js
for f in ink specimen beetle moth dragonfly names paper fonts plate curation; do cp src/$f.js final/interactive/js/; done
cp src/interactive.html final/interactive/index.html
# proof of tab. iii shown while the live plate is engraved (made by make_finals.py)
if [ -f work/final_tmp/hero-preview.jpg ]; then cp work/final_tmp/hero-preview.jpg final/interactive/hero-preview.jpg; fi
du -sh final/interactive
