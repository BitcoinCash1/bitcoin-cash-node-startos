import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_7 = VersionInfo.of({
  version: '29.0.0:7',
  releaseNotes:
    'Health-check resilience: the RPC/sync/peer checks each run bitcoin-cli in a fresh subcontainer, and under host mount-namespace pressure that exec spawn can transiently fail even while bitcoind and RPC are healthy — which left the "RPC" check (and the overall status) stuck on "Starting". The RPC helper now retries the exec spawn so those transients no longer surface.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
