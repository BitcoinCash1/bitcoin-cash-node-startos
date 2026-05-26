import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '29.0.0:4',
  releaseNotes: {
    en_US:
      'Packages Bitcoin Cash Node v29.0.0 (May 2026 network upgrade) for StartOS. RPC binds to 0.0.0.0 so dependent services (Fulcrum BCH, BCH Explorer) can connect.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
