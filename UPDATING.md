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

CI does this automatically. `.github/workflows/check-upstream.yml` polls the
GitLab **releases** API daily (and on workflow_dispatch). A new `vX.Y.Z` tag
runs `scripts/auto-bump.sh`, which writes `X.Y.Z:0`, retargets
`mainnet/bitcoin-cash-node:vX.Y.Z`, updates the docs, and pushes `master`.
`tagAndRelease.yml` then builds the `.s9pk`.

To run it by hand (same script the bot uses):

```bash
bash scripts/auto-bump.sh v29.1.0
```

Manual equivalent:

1. Bump `dockerTag` in `startos/manifest/index.ts` to `mainnet/bitcoin-cash-node:v<new version>`.
2. Add a new `startos/versions/v<X>.<Y>.<Z>.0.ts` file and update `startos/versions/index.ts` to set it as `current`.
3. Update version references in `README.md` and `instructions.md`.
