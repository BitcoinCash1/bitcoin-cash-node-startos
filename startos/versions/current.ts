import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '29.0.0:6',
  releaseNotes: {
    en_US:
      'Show active network (Mainnet, Chipnet, etc.) in sync and peer health check messages. ' +
      'Switching network via the Network action now automatically restarts the node. ' +
      'Health checks updated to handle regtest correctly (verificationprogress at 100% no longer falsely reports "Syncing").',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
