import { VersionInfo } from '@start9labs/start-sdk'

export const v_29_0_0_2 = VersionInfo.of({
  version: '29.0.0:2',
  releaseNotes:
    'Tor integration hardening. ' +
    'Explicitly disable -listenonion (tor-startos exposes a Unix control socket, ' +
    'not TCP 9051, so BCHN cannot create automatic ephemeral hidden services — ' +
    'use the Tor service URL plugin to attach an .onion to the Peer interface instead). ' +
    'When Allowed Networks is set to Tor (.onion) only, route all outbound traffic ' +
    'through the SOCKS5 proxy (-proxy=tor:9050) and disable clearnet DNS seed ' +
    'lookups (-dnsseed=0 -dns=0) to prevent address-resolution leaks. ' +
    'Documentation updated with accurate Tor integration steps.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
