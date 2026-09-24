import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { mainMounts } from '../mounts'
import { rootDir, Network } from '../utils'
import { i18n } from '../i18n'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  networks: Value.multiselect({
    name: i18n('Networks To Delete'),
    description: i18n(
      'Delete all BCHN blockchain data for the selected test networks. Mainnet is intentionally excluded and cannot be selected.',
    ),
    warning: i18n(
      'This permanently deletes all blockchain data for the selected networks. You cannot undo this. Mainnet data is never affected.',
    ),
    default: [],
    minLength: 0,
    maxLength: null,
    values: {
      testnet3: i18n('Testnet3'),
      testnet4: i18n('Testnet4'),
      scalenet: i18n('Scalenet'),
      chipnet: i18n('Chipnet'),
      regtest: i18n('Regtest'),
    },
  }),
})

const testNetSubdirs: Record<string, string> = {
  testnet3: 'testnet3',
  testnet4: 'testnet4',
  scalenet: 'scalenet',
  chipnet: 'chipnet',
  regtest: 'regtest',
}

export const deleteTestNetworkData = sdk.Action.withInput(
  'delete-test-network-data',
  async ({ effects: _effects }) => ({
    name: i18n('Delete Test Network Data'),
    description: i18n(
      'Delete blockchain data for one or more test networks (Testnet3, Testnet4, Scalenet, Chipnet, Regtest). This frees disk space without touching mainnet.',
    ),
    warning: i18n(
      'All block data and chainstate for the selected networks will be permanently deleted. Mainnet is never affected.',
    ),
    allowedStatuses: 'any' as const,
    group: i18n('Maintenance'),
    visibility: 'enabled' as const,
  }),
  inputSpec,
  async ({ effects: _effects }) => {
    const store = await storeJson.read().once()
    const active: Network = store?.network ?? 'mainnet'
    const defaults = (
      ['testnet3', 'testnet4', 'scalenet', 'chipnet', 'regtest'] as const
    ).filter((n) => n !== active)
    return { networks: defaults }
  },
  async ({ effects, input }) => {
    const networks = (input.networks ?? []).filter(Boolean) as string[]
    if (networks.length === 0) {
      return {
        version: '1' as const,
        title: i18n('Nothing to Delete'),
        message: i18n('No networks were selected.'),
        result: null,
      }
    }
    const store = await storeJson.read().once()
    const activeNetwork: Network = store?.network ?? 'mainnet'
    const activeTestNet = activeNetwork !== 'mainnet' ? activeNetwork : null
    if (activeTestNet && networks.includes(activeTestNet)) {
      return {
        version: '1' as const,
        title: i18n('Cannot Delete Active Network'),
        message: i18n(
          'BCHN is currently running on ${activeTestNet}. Stop the service and switch to a different network before deleting its data.',
          { activeTestNet },
        ),
        result: null,
      }
    }
    const removed: string[] = []
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bitcoin-cash-node' },
      mainMounts,
      'delete-test-net-data',
      async (sub) => {
        for (const net of networks) {
          const subdir = testNetSubdirs[net]
          if (!subdir) continue
          const dataPath = `${rootDir}/${subdir}`
          const res = await sub.exec(['rm', '-rf', dataPath])
          if (res.exitCode === 0) removed.push(dataPath)
        }
      },
    )
    if (removed.length === 0) {
      return {
        version: '1' as const,
        title: i18n('Nothing Removed'),
        message: i18n('The selected network data directories did not exist.'),
        result: null,
      }
    }
    return {
      version: '1' as const,
      title: i18n('Test Network Data Deleted'),
      message: i18n('Removed: ${removed}. Mainnet data was not touched.', {
        removed: removed.join(', '),
      }),
      result: null,
    }
  },
)
