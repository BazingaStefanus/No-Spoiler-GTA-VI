#!/usr/bin/env bash
# Builds dist/chrome-edge.zip and dist/firefox.zip (plus unpacked folders for loading in the browser).
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=(src popup options icons)
rm -rf dist
mkdir -p dist/chrome-edge dist/firefox

cp -R "${FILES[@]}" dist/chrome-edge/
cp manifest.json dist/chrome-edge/manifest.json

cp -R "${FILES[@]}" dist/firefox/
node tools/make_firefox_manifest.js > dist/firefox/manifest.json

(cd dist/chrome-edge && zip -qr ../chrome-edge.zip . -x '*.DS_Store')
(cd dist/firefox && zip -qr ../firefox.zip . -x '*.DS_Store')

echo "Done: dist/chrome-edge.zip, dist/firefox.zip"
