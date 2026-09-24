#!/usr/bin/env bash
# Bump the package to a new upstream Bitcoin Cash Node release, commit it to
# master and release it.
#
#   scripts/auto-bump.sh <upstream-tag>      e.g. scripts/auto-bump.sh v29.2.0
#
# Sets startos/versions/current.ts to `<upstream>:0` (a new upstream always
# starts at package revision 0), resets ALLOW_DOWNGRADE to false, updates the
# image tag in the manifest and the version in the store description, then
# commits the bump to master; Check Upstream then dispatches Tag and Release.
#
# DRY_RUN=1 edits and commits locally but skips the push.
set -euo pipefail

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "Usage: $0 <upstream-tag>" >&2
  exit 1
fi
UPSTREAM="${TAG#v}"
CURRENT_FILE=startos/versions/current.ts
MANIFEST=startos/manifest/index.ts
DESCRIPTION=startos/manifest/i18n.ts

CURRENT_VERSION=$(sed -nE "s/^[[:space:]]*version:[[:space:]]*'([^']+)'.*/\1/p" "$CURRENT_FILE" | head -1)
CURRENT_UPSTREAM="${CURRENT_VERSION%%:*}"
if [ "$CURRENT_UPSTREAM" = "$UPSTREAM" ]; then
  echo "Already at $UPSTREAM — no bump needed"
  exit 0
fi
# Never move the version downwards: StartOS cannot migrate to a lower upstream.
HIGHEST=$(printf '%s\n%s\n' "$CURRENT_UPSTREAM" "$UPSTREAM" | sort -V | tail -1)
if [ "$HIGHEST" = "$CURRENT_UPSTREAM" ]; then
  echo "::warning::Tag $TAG is older than the packaged version $CURRENT_UPSTREAM — refusing to downgrade"
  exit 0
fi
NEW_VERSION="${UPSTREAM}:0"
echo "Bumping $CURRENT_VERSION -> $NEW_VERSION"

python3 - "$CURRENT_FILE" "$NEW_VERSION" "$UPSTREAM" <<'PY'
import re, sys
path, new_version, upstream = sys.argv[1:]
src = open(path).read()
src, n = re.subn(r"(\n\s*version:\s*)'[^']+'", rf"\g<1>'{new_version}'", src, count=1)
assert n == 1, 'version line not found'
# The release notes are a placeholder; translations are added by hand afterwards.
src, n = re.subn(
    r"releaseNotes:\s*(\{.*?\n  \}|'[^']*'|`[^`]*`),",
    "releaseNotes: {\n    en_US: 'Updates Bitcoin Cash Node to upstream " + upstream + ".',\n  },",
    src, count=1, flags=re.S)
assert n == 1, 'releaseNotes not found'
src = re.sub(r"const ALLOW_DOWNGRADE = (true|false)", "const ALLOW_DOWNGRADE = false", src)
open(path, 'w').write(src)
PY

sed -i -E "s|mainnet/bitcoin-cash-node:v[0-9][^']*|mainnet/bitcoin-cash-node:v${UPSTREAM}|" "$MANIFEST"
sed -i -E "s|\(BCHN\) v[0-9][0-9.]*|(BCHN) v${UPSTREAM}|" "$DESCRIPTION"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add "$CURRENT_FILE" "$MANIFEST" "$DESCRIPTION"
git commit -m "feat: bump Bitcoin Cash Node to upstream v${UPSTREAM} (${NEW_VERSION})"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN: committed on master, not pushed"
  exit 0
fi

git push origin master
