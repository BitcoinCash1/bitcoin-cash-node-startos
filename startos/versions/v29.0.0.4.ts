import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_4 = VersionInfo.of({
  version: '29.0.0:4',
  releaseNotes:
    'Fix RPC not reachable by other containers (Fulcrum, Explorer): rpcbind was ' +
    '127.0.0.1 (loopback only) — changed to 0.0.0.0 so dependent services can connect.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
