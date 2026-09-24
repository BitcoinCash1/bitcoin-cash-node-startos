import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'

export const reindexChainstate = sdk.Action.withoutInput(
  'reindex-chainstate',
  async ({ effects: _effects }) => ({
    name: i18n('Reindex Chainstate'),
    description: i18n(
      'Rebuild the UTXO chainstate from the existing block index without re-downloading blocks. Faster than a full reindex. Use this if the chainstate is corrupted but blocks are intact.',
    ),
    warning: i18n(
      'This process rebuilds the chainstate database and can take several hours. The node will restart automatically.',
    ),
    allowedStatuses: 'any' as const,
    group: i18n('Maintenance'),
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    await storeJson.merge(effects, {
      reindexChainstate: true,
      fullySynced: false,
    })
    await effects.restart()
    return null
  },
)
