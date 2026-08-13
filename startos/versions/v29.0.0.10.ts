import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_10 = VersionInfo.of({
  version: '29.0.0:10',
  releaseNotes:
    'Rebind RPC and P2P ports when the network changes. interfaces.ts now ' +
    'watches store.network (Start9-Community #8). A switch previously left ' +
    'the old ports advertised so dependents could not reach the node.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
