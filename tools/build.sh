#!/usr/bin/env bash
# Erzeugt dist/chrome-edge.zip und dist/firefox.zip (plus entpackte Ordner zum Laden im Browser).
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=(src popup options icons)
rm -rf dist
mkdir -p dist/chrome-edge dist/firefox

cp -R "${FILES[@]}" dist/chrome-edge/
cp manifest.json dist/chrome-edge/manifest.json

cp -R "${FILES[@]}" dist/firefox/
cp manifest.firefox.json dist/firefox/manifest.json

(cd dist/chrome-edge && zip -qr ../chrome-edge.zip . -x '*.DS_Store')
(cd dist/firefox && zip -qr ../firefox.zip . -x '*.DS_Store')

echo "Fertig: dist/chrome-edge.zip, dist/firefox.zip"
