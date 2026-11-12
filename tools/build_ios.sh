#!/usr/bin/env bash
# Builds the Safari container app for iOS, installs it on a connected iPhone and launches it.
# Requirements: Xcode, an Apple ID signed in to Xcode, and an iPhone (iOS 17+) connected via USB
# or paired over Wi-Fi with Developer Mode enabled. Pass DEVICE=<UDID> to pick a specific device.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="safari/No Spoiler for GTA VI/No Spoiler for GTA VI.xcodeproj"
SCHEME="No Spoiler for GTA VI (iOS)"
CONFIG="${CONFIG:-Release}"
DERIVED="build/ios"
BUNDLE_ID="io.github.bazingastefanus.nospoilergtavi"

source tools/apple_team.sh

if [[ -z "${DEVICE:-}" ]]; then
  DEVICE="$(xcrun devicectl list devices 2>/dev/null | grep -E 'available.*physical' | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' | head -1 || true)"
fi
if [[ -z "$DEVICE" ]]; then
  echo "No connected iPhone found. Connect it via USB (and unlock it), or set DEVICE=<UDID>." >&2
  echo "Paired devices:" >&2
  xcrun devicectl list devices >&2 || true
  exit 1
fi

./tools/build.sh

VERSION="$(node -p "require('./manifest.json').version")"

xcodebuild -project "$PROJECT" -scheme "$SCHEME" -configuration "$CONFIG" \
  -destination "id=$DEVICE" -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$VERSION" \
  build -quiet

APP="$DERIVED/Build/Products/$CONFIG-iphoneos/No Spoiler for GTA VI.app"
echo "Built: $APP (version $VERSION)"
xcrun devicectl device install app --device "$DEVICE" "$APP"
if xcrun devicectl device process launch --device "$DEVICE" "$BUNDLE_ID" >/dev/null 2>&1; then
  echo "Installed and launched on the iPhone. Enable the extension under Settings → Apps → Safari → Extensions."
else
  echo "Installed, but the iPhone refused to launch the app. On first install you have to trust your developer"
  echo "profile: Settings → General → VPN & Device Management → your Apple ID → Trust. Then open the app once."
fi
