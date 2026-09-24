import { sdk } from '../sdk'
import { mainMounts } from '../mounts'
import { rootDir } from '../utils'
import { i18n } from '../i18n'

export const deletePeers = sdk.Action.withoutInput(
  'delete-peers',
  async ({ effects: _effects }) => ({
    name: i18n('Delete Peer List'),
    description: i18n(
      'Delete peers.dat to reset the peer address database. The node will rebuild it from DNS seeds on next startup.',
    ),
    warning: i18n(
      'All known peer addresses will be lost. The node will need to rediscover peers on next startup, which may take a few minutes.',
    ),
    allowedStatuses: 'only-stopped' as const,
    group: i18n('Maintenance'),
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bitcoin-cash-node' },
      mainMounts,
      'delete-peers',
      async (sub) => {
        await sub.exec(['rm', '-f', `${rootDir}/peers.dat`])
      },
    )
    return {
      version: '1' as const,
      title: i18n('Peer List Deleted'),
      message: i18n(
        'peers.dat has been removed. The node will rebuild it from DNS seeds on next startup.',
      ),
      result: null,
    }
  },
)
