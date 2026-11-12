# No Spoiler for GTA VI

Browser extension (Manifest V3) for **Chrome, Edge, Firefox and Safari (macOS and iOS)**. It hides GTA VI spoilers on web pages: text is covered **line by line with black bars**, like a redacted document (the layout is preserved; only the keywords themselves stay readable), and images and videos are blurred. A click reveals an area again.

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
2. Click "Load Temporary Add-on" and select `manifest.json` in this project folder. Firefox assigns a temporary add-on ID; no build is needed for development.

To test the release build with the Firefox-specific settings (add-on ID, minimum version, data collection declaration), run `./tools/build.sh` first (requires Node.js) and select `dist/firefox/manifest.json` instead. These settings live in `tools/firefox-overrides.json` and are merged into `manifest.json` during the build.

**Safari (macOS)**

Safari only runs web extensions that are packaged in an app. The Xcode project in `safari/` (one project with a macOS and an iOS target) wraps the files from `dist/safari`, which `tools/build.sh` generates.

1. Requirements: Xcode, and an Apple ID signed in under Xcode → Settings → Accounts (a free personal team is enough for your own Mac).
2. Run `./tools/build_safari.sh`. It builds the extension files, builds and signs the app (team ID is read from your "Apple Development" certificate, or set `DEVELOPMENT_TEAM`), and opens the app once so Safari registers the extension.
3. In Safari → Settings → Extensions, enable "No Spoiler for GTA VI".
4. Grant website access: click the extension icon or use Settings → Extensions → "Edit Websites…" and choose "Allow" for all websites. Without it the content script does not run and the popup cannot read the current site.

After code changes run `./tools/build_safari.sh` again. The app version is taken from `manifest.json`. The built app lives in `build/safari/` and must stay there while the extension is in use.

**Safari (iOS)**

1. Requirements: as for macOS, plus an iPhone with iOS 17 or newer, connected via USB (or paired over Wi-Fi) with Developer Mode enabled (Settings → Privacy & Security → Developer Mode).
2. Run `./tools/build_ios.sh`. It builds and signs the iOS app, installs it on the first connected iPhone (set `DEVICE=<UDID>` to pick one; `xcrun devicectl list devices` shows them) and launches it.
3. First install only: trust your developer profile on the iPhone under Settings → General → VPN & Device Management → your Apple ID → Trust, then open the app once.
4. Enable the extension under Settings → Apps → Safari → Extensions → "No Spoiler for GTA VI", and allow it for all websites.

With a free Apple account the app expires after 7 days; run `./tools/build_ios.sh` again to reinstall it. A paid Apple Developer Program membership removes that limit.

To publish permanently, upload the zips from `dist/` to the respective stores (Chrome Web Store, Edge Add-ons, addons.mozilla.org). Adjust the Firefox add-on ID in `tools/firefox-overrides.json` beforehand.

## Tests

- Unit tests (matcher, site logic, Firefox manifest): `node --test test/`
- Manual: open `test/testpage.html` in the browser (as a file; in Chrome you may need to enable "Allow access to file URLs").

## Limitations

- Safari does not support `options_ui.open_in_tab`, so the settings page may not open in its own tab there.
- The tab title, address bar suggestions, content inside closed shadow DOM, and images without any context (CSS background only, with no keyword nearby) cannot be detected.
- Container detection is a heuristic. Very large containers are narrowed down to paragraph level; any area can be revealed with a click (except in the "Hide completely" mode).
- When redacting, a keyword stays readable only if it sits in a single text node; a match like "GTA <b>6</b>" (spanning several elements) is redacted along with the rest.


## Structure

```
manifest.json   Single manifest source (Firefox manifest is generated by tools/build.sh)
src/        storage.js · matcher.js · content.js · content.css
popup/      Popup (on/off, per-site switch)
options/    Settings page
icons/      PNG icons (generated with tools/make_icons.py, requires Pillow: pip install pillow)
safari/     Xcode project for the Safari container apps (macOS and iOS)
tools/      build.sh · build_safari.sh · build_ios.sh · apple_team.sh · make_firefox_manifest.js · firefox-overrides.json · make_icons.py
test/       Unit tests and manual test page
```
