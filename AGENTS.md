# Project instructions

- Never create git commits automatically. Only commit when explicitly asked to.
- Never push to a remote on your own. Only push when explicitly asked to.
- All text and code comments in this project must be written in English (UI strings, documentation, comments, commit messages).
- Every commit increments the patch version (last number) of `version` in `manifest.json` by one, and the bumped `manifest.json` is part of that same commit. Major and minor versions are only changed when explicitly asked. `manifest.json` is the only place the version is maintained (the Firefox manifest and the Safari app version are derived from it); the static version badge at the top of `README.md` is updated to the same number in the same commit.
