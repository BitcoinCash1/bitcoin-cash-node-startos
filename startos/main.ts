import { socksHostId, socksPort } from 'tor-startos/startos/utils'
import { sdk } from './sdk'
import {
  rootDir,
  networkPorts,
  networkFlag,
  Network,
  GetBlockchainInfo,
  GetPeerInfo,
} from './utils'
import { bitcoinConfFile } from './fileModels/bitcoin.conf'
import { storeJson } from './fileModels/store.json'
import { mainMounts } from './mounts'
import { i18n } from './i18n'

export { mainMounts }

export const main = sdk.setupMain(async ({ effects }) => {
  /**
   * ======================== Setup ========================
   */

  // Read bitcoin.conf (watch for changes — restarts on change)
  const bitcoinConf = await bitcoinConfFile.read().const(effects)

  // Read network and credentials from store
  const store = await storeJson.read().once()
  const network: Network = store?.network ?? 'mainnet'
  const rpcUser = store?.rpcUser ?? 'bitcoincashd'
  const rpcPassword = store?.rpcPassword ?? ''
  const { rpc: rpcPort, peer: peerPort } = networkPorts[network]
  const netFlag = networkFlag[network]
  const netLabel = network.charAt(0).toUpperCase() + network.slice(1)

  console.log(i18n('Starting Bitcoin Cash Node (BCHN)!'))

  // Read and clear reindex flags
  const reindexBlockchain = store?.reindexBlockchain ?? false
  const reindexChainstate = store?.reindexChainstate ?? false
  if (reindexBlockchain || reindexChainstate) {
    await storeJson.merge(effects, {
      reindexBlockchain: false,
      reindexChainstate: false,
    })
  }

  // Tor SOCKS over the bridge. The bridge address only changes when tor's
  // binding does — with the 9050 fallback it stays constant across tor
  // install/update/uninstall, so this .const() never restarts BCHN unless tor
  // lands on a different port (then one healing restart). A dead bridge
  // address is just connection-refused, so -onion is always safe to pass.
  const torSocks = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'tor',
      hostId: socksHostId,
      internalPort: socksPort,
      fallbackPort: socksPort,
    })
    .const()

  // Track Tor install/run state dynamically for the health check (no restart)
  let torInstalled = false
  let torRunning = false
  sdk.getStatus(effects, { packageId: 'tor' }).onChange((status) => {
    torInstalled = status !== null
    torRunning = status?.desired.main === 'running'
    return { cancel: false }
  })

  const onlynetList: string[] = (
    [
      (bitcoinConf?.onlynet as string[] | string | undefined) ?? [],
    ] as string[][]
  )
    .flat()
    .filter(Boolean)
  const onlynetActive = onlynetList.length > 0

  const externalip: (string | undefined)[] =
    ((bitcoinConf?.raw as Record<string, unknown> | undefined)?.externalip as
      (string | undefined)[] | undefined) ?? []

  // ── Tor mode selection ─────────────────────────────────────────────────────
  // tor-startos exposes SOCKS5 on TCP 9050 but its control interface is a
  // Unix socket (/var/lib/tor/control.sock), not TCP 9051. BCHN's
  // `-listenonion=1` (default when listening) tries 127.0.0.1:9051 inside the
  // BCHN container and fails silently — explicitly disable it. Inbound .onion
  // is published via the Tor service's URL plugin attached to the Peer interface.
  //
  // When the user restricts Allowed Networks to Tor only, route everything via
  // SOCKS so clearnet DNS-seed / addrman fallbacks don't leak the node IP.
  const torOnly = onlynetList.length === 1 && onlynetList[0] === 'onion'

  // ── Build command args ─────
  const daemonArgs: string[] = [
    `-conf=${rootDir}/bitcoin.conf`,
    `-datadir=${rootDir}`,
    `-rpcport=${rpcPort}`,
    `-port=${peerPort}`,
    `-rpcbind=0.0.0.0`,
    '-rpcallowip=0.0.0.0/0',
    ...(netFlag ? [netFlag] : []),
    `-onion=${torSocks}`,
    '-listenonion=0',
    ...(torOnly ? [`-proxy=${torSocks}`, '-dnsseed=0', '-dns=0'] : []),
    ...(reindexBlockchain ? ['-reindex'] : []),
    ...(reindexChainstate ? ['-reindex-chainstate'] : []),
  ]

  const nodeSub = sdk.SubContainer.of(
    effects,
    { imageId: 'bitcoin-cash-node' },
    mainMounts,
    'node-sub',
  )

  // Helper: run JSON-RPC call via bitcoin-cli. Each call spawns a process in
  // the subcontainer, and under host load that spawn can fail transiently
  // while bitcoind is healthy, which left the health checks stuck on
  // "Starting". Retry the spawn a few times before reporting a failure.
  async function rpcCall(method: string, ...params: unknown[]) {
    const args = [
      'bitcoin-cli',
      `-rpcconnect=127.0.0.1`,
      `-rpcport=${rpcPort}`,
      `-rpcuser=${rpcUser}`,
      `-rpcpassword=${rpcPassword}`,
      method,
      ...params.map(String),
    ]
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await nodeSub.exec(args)
      } catch (err) {
        lastErr = err
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    throw lastErr
  }

  /**
   * ======================== Daemons ========================
   */

  const excludedByOnlynet = () => ({
    result: 'disabled' as const,
    message: i18n('Excluded by onlynet'),
  })

  return sdk.Daemons.of(effects)
    .addOneshot('nocow', {
      subcontainer: null,
      exec: {
        fn: async () => {
          try {
            const mkdirRes = await nodeSub.exec(['mkdir', '-p', rootDir])
            if (mkdirRes.exitCode !== 0) {
              console.warn(
                `nocow: mkdir failed for ${rootDir}; continuing without chattr`,
              )
              return null
            }

            const chattrRes = await nodeSub.exec([
              'chattr',
              '-R',
              '+C',
              rootDir,
            ])
            if (chattrRes.exitCode !== 0) {
              console.warn(
                `nocow: chattr not applied for ${rootDir}; continuing startup`,
              )
            }
          } catch (err) {
            console.warn(
              'nocow: unable to set NoCOW attributes; continuing startup',
              err,
            )
          }
          return null
        },
      },
      requires: [],
    })
    .addDaemon('primary', {
      subcontainer: nodeSub,
      exec: {
        command: ['bitcoind', ...daemonArgs],
        // BCHN flushes its databases on exit; a shorter timeout corrupts
        // chainstate on a slow disk.
        sigtermTimeout: 300_000,
      },
      ready: {
        display: i18n('RPC'),
        fn: async () => {
          try {
            const res = await rpcCall('getrpcinfo')
            return res.exitCode === 0
              ? {
                  message: i18n('BCHN RPC Interface is ready'),
                  result: 'success',
                }
              : {
                  message: i18n('The BCHN RPC Interface is not ready'),
                  result: 'starting',
                }
          } catch {
            return {
              message: i18n('The BCHN RPC Interface is not ready'),
              result: 'starting',
            }
          }
        },
      },
      requires: ['nocow'],
    })
    .addHealthCheck('sync-progress', {
      ready: {
        display: i18n('Blockchain Sync'),
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 5_000,
          failure: 5_000,
        }),
        fn: async () => {
          try {
            const res = await rpcCall('getblockchaininfo')
            if (res.exitCode !== 0)
              return {
                message: i18n('Waiting for sync info'),
                result: 'loading',
              }
            const stdout = res.stdout.toString()
            const info: GetBlockchainInfo = JSON.parse(stdout)
            const pct = info.verificationprogress * 100
            // Only "syncing" while genuinely behind. On regtest (and a node at
            // the tip) initialblockdownload can stay true with verificationprogress
            // already at 1.0 — reporting "Syncing 100%" there is nonsense.
            if (info.initialblockdownload && pct < 99.99) {
              return {
                message: i18n('Syncing blocks...${pct}% (${netLabel})', {
                  pct: pct.toFixed(2),
                  netLabel,
                }),
                result: 'loading',
              }
            }
            return {
              message: i18n('Synced — block ${blocks}${pruned} (${netLabel})', {
                blocks: String(info.blocks),
                pruned: info.pruned ? i18n(' (pruned)') : '',
                netLabel,
              }),
              result: 'success',
            }
          } catch {
            return { message: i18n('Waiting for sync info'), result: 'loading' }
          }
        },
      },
      requires: ['primary'],
    })
    .addOneshot('synced-true', {
      subcontainer: null,
      exec: {
        fn: async () => {
          const currentStore = await storeJson.read().once()
          if (!currentStore?.fullySynced) {
            await storeJson.merge(effects, { fullySynced: true })
          }
          return null
        },
      },
      requires: ['sync-progress'],
    })
    .addHealthCheck('peer-connections', {
      ready: {
        display: i18n('Peer Connections'),
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 5_000,
          failure: 5_000,
        }),
        fn: async () => {
          try {
            const res = await rpcCall('getpeerinfo')
            if (res.exitCode !== 0)
              return {
                message: i18n('Unable to query peers'),
                result: 'loading',
              }
            const stdout = res.stdout.toString()
            const peers: GetPeerInfo = JSON.parse(stdout)
            const count = peers.length
            if (count === 0)
              return {
                message: i18n(
                  'No peers connected — node may be starting up or isolated',
                ),
                result: 'loading',
              }
            if (count < 3)
              return {
                message: i18n(
                  'Only ${count} peer(s) connected — network connectivity may be limited',
                  { count: String(count) },
                ),
                result: 'loading',
              }
            const inbound = peers.filter((p) => p.inbound).length
            return {
              message: i18n(
                '${count} peers (${outbound} outbound, ${inbound} inbound)',
                {
                  count: String(count),
                  outbound: String(count - inbound),
                  inbound: String(inbound),
                },
              ),
              result: 'success',
            }
          } catch {
            return { message: i18n('Unable to query peers'), result: 'loading' }
          }
        },
      },
      requires: ['primary'],
    })
    .addHealthCheck('tor', {
      ready: {
        display: i18n('Tor'),
        fn: () => {
          if (!torInstalled)
            return {
              result: 'disabled' as const,
              message: i18n('Tor is not installed'),
            }
          if (!torRunning)
            return {
              result: 'disabled' as const,
              message: i18n('Tor is not running'),
            }
          if (onlynetActive && !onlynetList.includes('onion'))
            return excludedByOnlynet()
          return {
            result: 'success' as const,
            message: externalip.some((ip) => ip?.includes('.onion'))
              ? i18n('Inbound and outbound connections')
              : i18n('Outbound only. Add an onion address to enable inbound.'),
          }
        },
      },
      requires: [],
    })
    .addHealthCheck('clearnet', {
      ready: {
        display: i18n('Clearnet'),
        fn: () => {
          if (
            onlynetActive &&
            !onlynetList.includes('ipv4') &&
            !onlynetList.includes('ipv6')
          )
            return excludedByOnlynet()
          return {
            result: 'success' as const,
            message: externalip.some((ip) => ip && !ip.includes('.onion'))
              ? i18n('Inbound and outbound connections')
              : i18n('Outbound only. Publish an IP address to enable inbound.'),
          }
        },
      },
      requires: [],
    })
})
