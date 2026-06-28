import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_8 = VersionInfo.of({
  version: '29.0.0:8',
  releaseNotes:
    'Mempool config fix: removed the Ancestor/Descendant Limit options (limitancestorcount/limitdescendantcount) — BCHN v23.1.0 removed them, and setting them made bitcoind exit with "Invalid configuration value". Any stale value is now force-stripped from the config on save. Minimum Relay Fee can no longer be set to 0 (BCHN rejects it) and is only written when greater than 0.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
