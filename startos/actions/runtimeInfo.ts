import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import {
  networkPorts,
  Network,
  GetBlockchainInfo,
  GetNetworkInfo,
} from '../utils'
import { mainMounts } from '../mounts'
import { i18n } from '../i18n'

export const runtimeInfo = sdk.Action.withoutInput(
  'runtime-info',
  async ({ effects: _effects }) => ({
    name: i18n('Node Info'),
    description: i18n(
      'Display current node runtime information: version, network, connections, sync status.',
    ),
    warning: null,
    allowedStatuses: 'only-running' as const,
    group: null,
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    const store = await storeJson.read().once()
    const network: Network = store?.network ?? 'mainnet'
    const rpcUser = store?.rpcUser ?? 'bitcoincashd'
    const rpcPassword = store?.rpcPassword ?? ''
    const { rpc: rpcPort } = networkPorts[network]

    return sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bitcoin-cash-node' },
      mainMounts,
      'runtime-info',
      async (sub) => {
        const cliBase = [
          'bitcoin-cli',
          `-rpcconnect=127.0.0.1`,
          `-rpcport=${rpcPort}`,
          `-rpcuser=${rpcUser}`,
          `-rpcpassword=${rpcPassword}`,
        ]

        const [netRes, chainRes] = await Promise.all([
          sub.exec([...cliBase, 'getnetworkinfo']).catch(() => null),
          sub.exec([...cliBase, 'getblockchaininfo']).catch(() => null),
        ])

        const net: GetNetworkInfo | null =
          netRes?.exitCode === 0 ? JSON.parse(netRes.stdout.toString()) : null
        const chain: GetBlockchainInfo | null =
          chainRes?.exitCode === 0
            ? JSON.parse(chainRes.stdout.toString())
            : null

        const lines: string[] = []
        if (net) {
          lines.push(i18n('Version: ${version}', { version: net.subversion }))
          lines.push(
            i18n('Network Active: ${active}', {
              active: net.networkactive ? i18n('Yes') : i18n('No'),
            }),
          )
          lines.push(
            i18n('Connections: ${total} (in: ${inbound}, out: ${outbound})', {
              total: String(net.connections),
              inbound: String(net.connections_in),
              outbound: String(net.connections_out),
            }),
          )
        }
        if (chain) {
          lines.push(
            i18n('Chain: ${kind} ${network}', {
              kind: chain.pruned ? i18n('pruned') : i18n('archival'),
              network,
            }),
          )
          lines.push(
            i18n('Blocks: ${blocks} / ${headers}', {
              blocks: String(chain.blocks),
              headers: String(chain.headers),
            }),
          )
          lines.push(
            i18n('Sync: ${status}', {
              status: chain.initialblockdownload
                ? `${(chain.verificationprogress * 100).toFixed(2)}%`
                : i18n('Complete'),
            }),
          )
        }

        return {
          version: '1' as const,
          title: i18n('Node Runtime Info'),
          message: null,
          result: {
            type: 'single' as const,
            value: lines.join('\n'),
            copyable: false,
            qr: false,
            masked: false,
          },
        }
      },
    )
  },
)
