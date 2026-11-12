#!/usr/bin/env bash
# Builds the Safari container app (macOS) that embeds the web extension, then opens it once
# so Safari registers the extension. Signs with your "Apple Development" certificate.
#
# The team ID is read from that certificate unless DEVELOPMENT_TEAM is set, so no team ID
# has to be committed to the Xcode project.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="safari/No Spoiler for GTA VI/No Spoiler for GTA VI.xcodeproj"
SCHEME="No Spoiler for GTA VI"
CONFIG="${CONFIG:-Release}"
DERIVED="build/safari"

if [[ -z "${DEVELOPMENT_TEAM:-}" ]]; then
  DEVELOPMENT_TEAM="$(security find-certificate -c "Apple Development" -p 2>/dev/null \
    | openssl x509 -noout -subject 2>/dev/null \
    | sed -n 's/.*OU *= *\([A-Z0-9]\{10\}\).*/\1/p')"
fi
if [[ -z "$DEVELOPMENT_TEAM" ]]; then
  echo "No Apple Development certificate found. Sign in with your Apple ID in Xcode → Settings → Accounts," >&2
  echo "or set DEVELOPMENT_TEAM=<your team ID>." >&2
  exit 1
fi

./tools/build.sh

# The app version always follows manifest.json.
VERSION="$(node -p "require('./manifest.json').version")"

xcodebuild -project "$PROJECT" -scheme "$SCHEME" -configuration "$CONFIG" \
  -derivedDataPath "$DERIVED" -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$VERSION" \
  build -quiet

APP="$DERIVED/Build/Products/$CONFIG/No Spoiler for GTA VI.app"
echo "Built: $APP (version $VERSION)"
open "$APP"
echo "Now enable the extension in Safari → Settings → Extensions."
