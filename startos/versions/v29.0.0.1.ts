import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_1 = VersionInfo.of({
  version: '29.0.0:1',
  releaseNotes:
    'Internal: rewrite bitcoin.conf on startup to strip any legacy top-level ' +
    'rpcbind / rpcallowip entries (BCHN rejects them under -chipnet / -regtest). ' +
    'These are now passed as CLI args instead. ' +
    'Add I2P health-check placeholder (reports disabled until I2P support lands). ' +
    'Minor RPC status message polish. No user-visible config changes.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
