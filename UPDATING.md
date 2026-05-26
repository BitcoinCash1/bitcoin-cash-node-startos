# Updating the upstream version

This package wraps the official **Bitcoin Cash Node** Docker image published by the
`mainnet` organization on Docker Hub (`mainnet/bitcoin-cash-node`). "Upstream" here
means the BCHN project itself, which the image tracks tag-for-tag.

## Determining the upstream version

- **Bitcoin Cash Node** ([bitcoin-cash-node on GitLab](https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node)) — check the latest release tag on the [releases page](https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node/-/releases), or confirm the matching image tag exists on [Docker Hub](https://hub.docker.com/r/mainnet/bitcoin-cash-node/tags).

  The current pin lives in `startos/manifest/index.ts` at
  `images['bitcoin-cash-node'].source.dockerTag` (the tag after the `:` in
  `mainnet/bitcoin-cash-node:<tag>`).

## Applying the bump

1. Bump `dockerTag` in `startos/manifest/index.ts` to `mainnet/bitcoin-cash-node:v<new version>`.
2. Update `version` (and reset the downstream revision to `0`) in `startos/versions/current.ts` to the new upstream version — e.g. `30.0.0:0`. Spin off a historical version file only if the bump needs a migration (see [Versions](https://docs.start9.com/packaging/versions.html)).
3. Update the version references in `README.md` and `instructions.md` (the `v29.0.0` mentions and the May 2026 upgrade notes if they no longer apply).
