import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'

export const reindexBlockchain = sdk.Action.withoutInput(
  'reindex-blockchain',
  async ({ effects: _effects }) => ({
    name: i18n('Reindex Blockchain'),
    description: i18n(
      'Delete the chainstate and re-verify every block from genesis. This is necessary if the chainstate database is corrupted. The node will restart automatically.',
    ),
    warning: i18n(
      'This process re-verifies the entire blockchain from scratch and can take many hours or days. Do not interrupt once started.',
    ),
    allowedStatuses: 'any' as const,
    group: i18n('Maintenance'),
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    await storeJson.merge(effects, {
      reindexBlockchain: true,
      fullySynced: false,
    })
    await effects.restart()
    return null
  },
)
