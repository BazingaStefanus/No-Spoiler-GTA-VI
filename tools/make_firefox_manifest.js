#!/usr/bin/env node
// Builds the Firefox manifest from manifest.json plus the Firefox-only keys in firefox-overrides.json.
// Usage: node tools/make_firefox_manifest.js > dist/firefox/manifest.json
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Shallow merge: top-level keys from the overrides replace those in the base manifest.
function build(base = readJson(path.join(ROOT, 'manifest.json')), overrides = readJson(path.join(__dirname, 'firefox-overrides.json'))) {
  return { ...base, ...overrides };
}

if (require.main === module) {
  process.stdout.write(JSON.stringify(build(), null, 2) + '\n');
}

module.exports = { build };
