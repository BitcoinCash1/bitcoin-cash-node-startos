import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_6 = VersionInfo.of({
  version: '29.0.0:6',
  releaseNotes: 'Show active network (Mainnet/Chipnet/etc.) in Blockchain Sync health check.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
