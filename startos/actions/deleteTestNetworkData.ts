import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { mainMounts } from '../mounts'
import { rootDir, Network } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  networks: Value.multiselect({
    name: 'Networks To Delete',
    description:
      'Delete all BCHN blockchain data for the selected test networks. Mainnet is intentionally excluded and cannot be selected.',
    warning:
      'This permanently deletes all blockchain data for the selected networks. You cannot undo this. Mainnet data is never affected.',
    default: [],
    minLength: 0,
    maxLength: null,
    values: {
      testnet3: 'Testnet3',
      testnet4: 'Testnet4',
      scalenet: 'Scalenet',
      chipnet:  'Chipnet',
      regtest:  'Regtest',
    },
  }),
})

const testNetSubdirs: Record<string, string> = {
  testnet3: 'testnet3',
  testnet4: 'testnet4',
  scalenet: 'scalenet',
  chipnet:  'chipnet',
  regtest:  'regtest',
}

export const deleteTestNetworkData = sdk.Action.withInput(
  'delete-test-network-data',
  async ({ effects: _effects }) => ({
    name: 'Delete Test Network Data',
    description:
      'Delete blockchain data for one or more test networks (Testnet3, Testnet4, Scalenet, Chipnet, Regtest). This frees disk space without touching mainnet.',
    warning:
      'All block data and chainstate for the selected networks will be permanently deleted. Mainnet is never affected.',
    allowedStatuses: 'any' as const,
    group: 'Maintenance',
    visibility: 'enabled' as const,
  }),
  inputSpec,
  async ({ effects: _effects }) => {
    const store = await storeJson.read().once()
    const active: Network = store?.network ?? 'mainnet'
    const defaults = (['testnet3', 'testnet4', 'scalenet', 'chipnet', 'regtest'] as const).filter(
      (n) => n !== active,
    )
    return { networks: defaults }
  },
  async ({ effects, input }) => {
    const networks = (input.networks ?? []).filter(Boolean) as string[]
    if (networks.length === 0) {
      return {
        version: '1' as const,
        title: 'Nothing to Delete',
        message: 'No networks were selected.',
        result: null,
      }
    }
    const store = await storeJson.read().once()
    const activeNetwork: Network = store?.network ?? 'mainnet'
    const activeTestNet = activeNetwork !== 'mainnet' ? activeNetwork : null
    if (activeTestNet && networks.includes(activeTestNet)) {
      return {
        version: '1' as const,
        title: 'Cannot Delete Active Network',
        message: `BCHN is currently running on ${activeTestNet}. Stop the service and switch to a different network before deleting its data.`,
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
        title: 'Nothing Removed',
        message: 'The selected network data directories did not exist.',
        result: null,
      }
    }
    return {
      version: '1' as const,
      title: 'Test Network Data Deleted',
      message: `Removed: ${removed.join(', ')}. Mainnet data was not touched.`,
      result: null,
    }
  },
)
