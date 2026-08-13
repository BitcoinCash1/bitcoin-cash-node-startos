#!/usr/bin/env bash
set -euo pipefail

DISPATCHED_TAG="${1:-}"
if [ -z "$DISPATCHED_TAG" ]; then
  echo "Usage: $0 <tag>" >&2
  exit 1
fi

# GitLab tags as v29.1.0 — StartOS upstream is the number before :
CLEAN_TAG="${DISPATCHED_TAG#v}"

CURRENT_VAR=$(grep -E '^[[:space:]]*current:' startos/versions/index.ts | head -1 \
  | sed -E 's/.*current:[[:space:]]*([A-Za-z0-9_]+).*/\1/')
VERSION_FILE_BASE=$(echo "$CURRENT_VAR" | sed -E 's/^v_//; s/_/./g')
CURRENT_VERSION=$(grep -E "version:[[:space:]]*'" "startos/versions/v${VERSION_FILE_BASE}.ts" \
  | head -1 | sed -E "s/.*version:[[:space:]]*'([^']+)'.*/\1/")
CURRENT_UPSTREAM="${CURRENT_VERSION%%:*}"

if [ "$CURRENT_UPSTREAM" = "$CLEAN_TAG" ]; then
  echo "Already at $CLEAN_TAG — no bump needed"
  exit 0
fi
echo "Bumping $CURRENT_UPSTREAM -> $CLEAN_TAG"

TAG_VAR="v_$(echo "$CLEAN_TAG" | tr '.' '_')_0"
NEW_VERSION="${CLEAN_TAG}:0"
NEW_FILE="startos/versions/v${CLEAN_TAG}.0.ts"

cat > "$NEW_FILE" <<EOF
import { VersionInfo } from '@start9labs/start-sdk'

export const ${TAG_VAR} = VersionInfo.of({
  version: '${NEW_VERSION}',
  releaseNotes: 'Upstream ${DISPATCHED_TAG}.',
  migrations: {
    up: async () => {},
    down: async () => {},
  },
})
EOF

# Image pin lives in the manifest, not a Dockerfile.
sed -i "s|mainnet/bitcoin-cash-node:v${CURRENT_UPSTREAM}|mainnet/bitcoin-cash-node:v${CLEAN_TAG}|g" \
  startos/manifest/index.ts
sed -i "s|BCHN v${CURRENT_UPSTREAM}|BCHN v${CLEAN_TAG}|g" \
  startos/manifest/i18n.ts README.md instructions.md assets/instructions.md docs/instructions.md
sed -i "s|v${CURRENT_UPSTREAM}|v${CLEAN_TAG}|g" \
  README.md

sed -i "1a import { ${TAG_VAR} } from './v${CLEAN_TAG}.0'" startos/versions/index.ts
sed -i "s/current: ${CURRENT_VAR}/current: ${TAG_VAR}/" startos/versions/index.ts
sed -i "s/other: \[/other: [${CURRENT_VAR}, /" startos/versions/index.ts

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add startos/versions/index.ts "$NEW_FILE" \
  startos/manifest/index.ts startos/manifest/i18n.ts \
  README.md instructions.md assets/instructions.md docs/instructions.md
git commit -m "feat: auto-bump to upstream ${DISPATCHED_TAG} (v${NEW_VERSION})"
git push origin master
echo "Version bump committed"
