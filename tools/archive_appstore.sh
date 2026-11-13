#!/usr/bin/env bash
# Archives the Safari container apps (iOS and macOS) for upload to App Store Connect and opens
# the archives in the Xcode Organizer (Distribute App → App Store Connect → Upload).
# The version always follows manifest.json; set BUILD=<number> to upload the same version again
# with a higher build number (default: the version itself). PLATFORMS="ios" or "macos" archives only one.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="safari/No Spoiler for GTA VI/No Spoiler for GTA VI.xcodeproj"
OUT="build/archives"

source tools/apple_team.sh

./tools/build.sh

VERSION="$(node -p "require('./manifest.json').version")"
BUILD="${BUILD:-$VERSION}"
PLATFORMS="${PLATFORMS:-ios macos}"

ARCHIVES=()
for platform in $PLATFORMS; do
  case "$platform" in
    ios)   SCHEME="No Spoiler for GTA VI (iOS)";   DEST="generic/platform=iOS" ;;
    macos) SCHEME="No Spoiler for GTA VI (macOS)"; DEST="generic/platform=macOS" ;;
    *) echo "Unknown platform: $platform (use ios or macos)" >&2; exit 1 ;;
  esac
  ARCHIVE="$OUT/$platform-$VERSION.xcarchive"
  rm -rf "$ARCHIVE"
  xcodebuild archive -project "$PROJECT" -scheme "$SCHEME" -configuration Release \
    -destination "$DEST" -archivePath "$ARCHIVE" -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD" \
    -quiet
  echo "Archived: $ARCHIVE (version $VERSION, build $BUILD)"
  ARCHIVES+=("$ARCHIVE")
done

open "${ARCHIVES[@]}"
echo "In the Xcode Organizer: select each archive → Distribute App → App Store Connect → Upload."
