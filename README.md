# No Spoiler for GTA VI

Browser extension (Manifest V3) for **Chrome, Edge and Firefox**. It hides GTA VI spoilers on web pages: text is covered **line by line with black bars**, like a redacted document (the layout is preserved; only the keywords themselves stay readable), and images and videos are blurred. A click reveals an area again.

## Features

- Keyword detection (default: "GTA 6", "GTA VI", "GTA6", "Grand Theft Auto VI" …), freely editable. Case-insensitive, spaces and hyphens are interchangeable, whole words only.
- Hides the entire container (article, list item, comment, card) or just the paragraph.
- Images/videos/thumbnails inside a matching container (including players in open shadow DOM, e.g. on Reddit; videos are paused), as well as images whose `alt`, `title`, file name, link or caption contains a keyword.
- Also works for dynamically loaded content.
- Popup: global on/off switch and a switch per website.
- Options: keywords, mode, granularity, media, blacklist (everywhere except …) or whitelist (only on …).
- No network access, no telemetry; settings are stored locally in the browser.

## Installation (development)

Optionally build the packages first: `./tools/build.sh` (creates `dist/`).

**Chrome / Edge**
1. Open `chrome://extensions` or `edge://extensions` and enable developer mode.
2. Click "Load unpacked" and select this project folder (or `dist/chrome-edge`).

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and select `dist/firefox/manifest.json` (or `manifest.firefox.json` in the project folder).

To publish permanently, upload the zips from `dist/` to the respective stores (Chrome Web Store, Edge Add-ons, addons.mozilla.org). Adjust the Firefox add-on ID in `manifest.firefox.json` beforehand.

## Tests

- Unit tests (matcher, page logic): `node --test test/`
- Manual: open `test/testpage.html` in the browser (as a file; in Chrome you may need to enable "Allow access to file URLs").

## Limitations

- The tab title, address bar suggestions, content inside closed shadow DOM, and images without any context (CSS background only, with no keyword nearby) cannot be detected.
- Container detection is a heuristic. Very large containers are narrowed down to paragraph level; any area can be revealed with a click (except in the "Komplett ausblenden" (hide completely) mode).
- When redacting, a keyword stays readable only if it sits in a single text node; a match like "GTA <b>6</b>" (spanning several elements) is redacted along with the rest.


## Structure

```
manifest.json / manifest.firefox.json
src/        storage.js · matcher.js · content.js · content.css
popup/      Popup (on/off, per-site switch)
options/    Settings page
icons/      PNG icons (generated with tools/make_icons.py)
tools/      build.sh · make_icons.py
test/       Unit tests and manual test page
```
