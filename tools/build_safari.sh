#!/usr/bin/env bash
# Builds the Safari container app for macOS that embeds the web extension, then opens it once
# so Safari registers the extension. Signs with your "Apple Development" certificate.
#
# The team ID is read from that certificate unless DEVELOPMENT_TEAM is set, so no team ID
# has to be committed to the Xcode project.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="safari/No Spoiler for GTA VI/No Spoiler for GTA VI.xcodeproj"
SCHEME="No Spoiler for GTA VI (macOS)"
CONFIG="${CONFIG:-Release}"
DERIVED="build/safari"

source tools/apple_team.sh

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
