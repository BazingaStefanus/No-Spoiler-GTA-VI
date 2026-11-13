<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="No Spoiler for GTA VI logo">
</p>

<h1 align="center">No Spoiler for GTA VI</h1>

<p align="center">
  Browse the web without getting GTA VI spoiled. Matching text is blacked out like a redacted document, images and videos are blurred, and a click reveals anything you do want to see.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.2.0-ff3e96" alt="Version 2.2.0">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT">
  <img src="https://img.shields.io/badge/Manifest-V3-informational" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Chrome%20%C2%B7%20Edge%20%C2%B7%20Firefox%20%C2%B7%20Safari-supported-success" alt="Chrome, Edge, Firefox, Safari">
</p>

## What it does

- **Redacts text line by line.** Paragraphs, comments and cards that mention GTA VI get black bars (white bars on dark sites). The page layout stays intact and only the keywords themselves remain readable, so you still know *what* was hidden, just not *what it says*.
- **Blurs media.** Images, thumbnails and videos inside a matching container are blurred and videos are paused. Images are also caught when their alt text, title, file name, link or caption contains a keyword.
- **Reveals on click.** Curious after all? One click on a hidden area shows it again.

**How it works:** a content script scans every page (and everything loaded later) for your keywords, picks the surrounding container with a heuristic (article, list item, comment, card, or just the paragraph) and hides it using one of three modes: **Redact** (bars via the CSS Custom Highlight API), **Blur**, or **Hide completely**. Settings changes apply immediately to open tabs.

## Features

- Default keywords such as "GTA 6", "GTA VI", "Grand Theft Auto VI", "Vice City", "Leonida", "Lucia Caminos" and "Jason Duval", freely editable. Matching is case-insensitive, treats spaces, hyphens and underscores as interchangeable ("GTA 6" also finds "GTA-6" and "GTA6"), and only matches whole words ("GTA V" stays visible).
- Works on dynamically loaded content and inside open shadow DOM (for example Reddit's video player).
- Popup with a global on/off switch and a switch per website.
- Blacklist ("everywhere except …") or whitelist ("only on …") for websites, subdomains included.
- Runs in Chrome, Edge, Firefox and Safari on macOS and iOS.
- No network access, no telemetry, no accounts.

## Install

The extension is not listed in any store yet. Until then, download the ZIP for your browser from the [latest release](https://github.com/BazingaStefanus/No-Spoiler-GTA-VI/releases/latest) or install it from source as described below.

<!-- Store links go here once published:
- Chrome Web Store: …
- Edge Add-ons: …
- Firefox Add-ons: …
- App Store (Safari): …
-->

<details>
<summary><strong>Chrome / Edge</strong></summary>

1. Download `no-spoiler-gta-vi-chrome-edge-<version>.zip` from the [latest release](https://github.com/BazingaStefanus/No-Spoiler-GTA-VI/releases/latest) and unzip it (or clone this repository).
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder (or the project folder).

</details>

<details>
<summary><strong>Firefox</strong></summary>

1. Download `no-spoiler-gta-vi-firefox-<version>.zip` from the [latest release](https://github.com/BazingaStefanus/No-Spoiler-GTA-VI/releases/latest) (or clone this repository).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select the downloaded ZIP (or `manifest.json` in the project folder). The release ZIP is unsigned, so Firefox assigns a temporary add-on ID; the add-on is removed when Firefox quits.

To test the release build with the Firefox-specific settings (add-on ID, minimum version, data collection declaration), run `./tools/build.sh` (requires Node.js) and select `dist/firefox/manifest.json` instead. Those settings live in `tools/firefox-overrides.json` and are merged into `manifest.json` during the build.

</details>

<details>
<summary><strong>Safari (macOS)</strong></summary>

Safari only runs web extensions that are packaged in an app. The Xcode project in `safari/` wraps the extension for macOS and iOS.

1. Requirements: Xcode and an Apple ID signed in under Xcode → Settings → Accounts (a free personal team is enough for your own Mac).
2. Run `./tools/build_safari.sh`. It builds the extension files, builds and signs the app (the team ID is read from your "Apple Development" certificate, or set `DEVELOPMENT_TEAM`) and opens the app once so Safari registers the extension.
3. Enable **No Spoiler for GTA VI** in Safari → Settings → Extensions.
4. Grant website access: click the extension icon or use Settings → Extensions → **Edit Websites…** and choose **Allow** for all websites. Without it the extension cannot run on pages.

After code changes run `./tools/build_safari.sh` again. The built app lives in `build/safari/` and must stay there while the extension is in use.

</details>

<details>
<summary><strong>Safari (iOS)</strong></summary>

1. Requirements: as for macOS, plus an iPhone with iOS 17 or newer, connected via USB (or paired over Wi-Fi) with Developer Mode enabled (Settings → Privacy & Security → Developer Mode).
2. Run `./tools/build_ios.sh`. It builds and signs the iOS app, installs it on the first connected iPhone (set `DEVICE=<UDID>` to pick one; `xcrun devicectl list devices` lists them) and launches it.
3. First install only: trust your developer profile on the iPhone under Settings → General → VPN & Device Management → your Apple ID → **Trust**, then open the app once.
4. Enable the extension under Settings → Apps → Safari → Extensions → **No Spoiler for GTA VI** and allow it for all websites.

With a free Apple account the app expires after 7 days; run `./tools/build_ios.sh` again to reinstall it. A paid Apple Developer Program membership removes that limit.

</details>

## Settings

Open the settings page via the **Settings** button in the popup.

| Setting | Options |
|---|---|
| Keywords | One term per line. Case-insensitive, whole words only, spaces/hyphens interchangeable. |
| Mode | **Redact** (bars over the text, keywords stay readable, media blurred) · **Blur** · **Hide completely** (no reveal on click) |
| Granularity | **Whole container** (article, list item, comment, card) · **Paragraph only** |
| Media | Blur images and videos inside matching containers and images whose description, file name or link contains a keyword |
| Websites | **Blacklist**: active everywhere except the listed sites · **Whitelist**: active only on the listed sites. Subdomains are included. |

The popup additionally offers a global on/off switch and a switch for the current website.

## Privacy

- The extension makes **no network requests** and collects **no data**.
- Settings are stored locally in the browser (`storage.local`) and never leave it.
- Permissions: `storage` (save settings), `activeTab` (show the current site in the popup), and a content script on all websites (that is where the spoilers are).

Full privacy policy: [PRIVACY.md](PRIVACY.md)

## Development

Requirements: Node.js 18 or newer. For Safari builds additionally Xcode; for regenerating the icons Python 3 with Pillow (`pip install pillow`).

```
node --test test/        # unit tests: matcher, site logic, Firefox manifest
open test/testpage.html  # manual test page (Chrome may need "Allow access to file URLs")
```

| Script | Purpose |
|---|---|
| `tools/build.sh` | Builds `dist/chrome-edge.zip`, `dist/firefox.zip` and `dist/safari/` |
| `tools/build_safari.sh` | Builds, signs and opens the macOS container app |
| `tools/build_ios.sh` | Builds, signs and installs the iOS container app on a connected iPhone |
| `tools/archive_appstore.sh` | Archives the iOS and macOS apps for upload to App Store Connect |
| `tools/make_icons.py` | Regenerates all icons (extension and Safari apps); `--preview DIR` renders a contact sheet |

```
manifest.json   Single manifest source (the Firefox manifest and the Safari app version derive from it)
src/            storage.js · matcher.js · content.js · content.css
popup/          Popup (on/off, per-site switch)
options/        Settings page
icons/          Extension icons
safari/         Xcode project for the Safari container apps (macOS and iOS)
tools/          Build and generator scripts
test/           Unit tests and manual test page
```

Versioning: every commit bumps the patch version in `manifest.json`; minor and major bumps are deliberate. Project conventions are in [`AGENTS.md`](AGENTS.md).

## Limitations

- Container detection is a heuristic. Very large containers are narrowed down to paragraph level; any area can be revealed with a click (except in "Hide completely" mode).
- A keyword stays readable only if it sits in a single text node; a match like "GTA <b>6</b>" (spanning several elements) is redacted along with the rest.
- Tab titles, address bar suggestions, content inside closed shadow DOM, and images without any textual context (CSS backgrounds with no keyword nearby) cannot be detected.
- Safari does not support `options_ui.open_in_tab`, so the settings page may not open in its own tab there.

## Support

The extension is free and stays free. If it saved you from a spoiler and you'd like to say thanks, you can buy me a coffee:

<a href="https://buymeacoffee.com/bazingastefanus"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-ffdd00?logo=buymeacoffee&logoColor=black" alt="Buy me a coffee"></a>

## Disclaimer

This is an independent fan project. It is not affiliated with, endorsed by or connected to Rockstar Games or Take-Two Interactive. "Grand Theft Auto" is a trademark of Take-Two Interactive Software, Inc. The extension only filters web pages locally in your browser.

## License

[MIT](LICENSE)
