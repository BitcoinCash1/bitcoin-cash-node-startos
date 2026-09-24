import { sdk } from '../../sdk'
import { storeJson } from '../../fileModels/store.json'
import { i18n } from '../../i18n'

const { InputSpec, Value } = sdk

const networkSpec = InputSpec.of({
  network: Value.select({
    name: i18n('Network'),
    description: i18n(
      'Bitcoin Cash network to connect to. Changing this requires a node restart and a separate data directory per network.',
    ),
    warning: i18n(
      'Switching networks requires a full restart. The node will sync from scratch on the new network. Your mainnet data is preserved separately on disk.',
    ),
    values: {
      mainnet: i18n('Mainnet'),
      testnet3: i18n('Testnet3 (legacy test network)'),
      testnet4: i18n('Testnet4 (light-weight test network)'),
      scalenet: i18n('Scalenet (high-throughput test network)'),
      chipnet: i18n('Chipnet (upgrade / CHIP staging)'),
      regtest: i18n('Regtest (local testing only)'),
    },
    default: 'mainnet',
  }),
})

export const networkConfig = sdk.Action.withInput(
  'network-config',
  async ({ effects }) => ({
    name: i18n('Network'),
    description: i18n(
      'Select the Bitcoin Cash network. RPC and P2P ports adjust automatically for the selected network.',
    ),
    warning: i18n(
      'Changing the network requires a node restart. RPC and P2P ports will change to match the selected network.',
    ),
    allowedStatuses: 'any',
    group: 'Configuration',
    visibility: 'enabled',
  }),
  networkSpec,
  async ({ effects }) => {
    const store = await storeJson.read().once()
    return { network: store?.network ?? 'mainnet' }
  },
  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    const current = store?.network ?? 'mainnet'
    const next = input.network

    if (current === next) {
      return {
        version: '1' as const,
        title: i18n('Network Unchanged'),
        message: i18n('BCHN is already configured for ${next}.', { next }),
        result: null,
      }
    }

    await storeJson.merge(effects, { network: next, fullySynced: false })
    await effects.restart()

    return {
      version: '1' as const,
      title: i18n('Network Updated'),
      message: i18n(
        'Switched BCHN from ${current} to ${next}. Restarting automatically.',
        { current, next },
      ),
      result: null,
    }
  },
)
