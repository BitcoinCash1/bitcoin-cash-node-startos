import { sdk } from '../sdk'
import { mainMounts } from '../mounts'
import { rootDir } from '../utils'
import { i18n } from '../i18n'

export const deleteTxIndex = sdk.Action.withoutInput(
  'delete-tx-index',
  async ({ effects: _effects }) => ({
    name: i18n('Delete Transaction Index'),
    description: i18n(
      'Delete a corrupted transaction index. The index will be rebuilt automatically on next startup if txindex is still enabled.',
    ),
    warning: i18n(
      'The transaction index will be deleted. If txindex is enabled, it will be rebuilt on startup (this can take hours).',
    ),
    allowedStatuses: 'only-stopped' as const,
    group: 'Maintenance',
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bitcoin-cash-node' },
      mainMounts,
      'delete-txindex',
      async (sub) => {
        await sub.exec(['rm', '-rf', `${rootDir}/indexes/txindex`])
      },
    )
    return {
      version: '1' as const,
      title: i18n('Transaction Index Deleted'),
      message: i18n(
        'indexes/txindex has been removed. Enable txindex and restart to rebuild.',
      ),
      result: null,
    }
  },
)
