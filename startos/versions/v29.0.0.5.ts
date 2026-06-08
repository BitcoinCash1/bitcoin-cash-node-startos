import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_5 = VersionInfo.of({
  version: '29.0.0:5',
  releaseNotes: 'Fix network switch: network-config action now calls effects.restart() so BCHN restarts automatically when the network is changed, triggering dependent services (Fulcrum, Explorer) to follow.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
