# Sourced by the build scripts: sets DEVELOPMENT_TEAM from the local "Apple Development"
# certificate unless it is already set, so no team ID has to be committed to the Xcode project.
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
export DEVELOPMENT_TEAM
