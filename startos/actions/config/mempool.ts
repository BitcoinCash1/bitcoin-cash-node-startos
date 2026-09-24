import { sdk } from '../../sdk'
import { bitcoinConfFile, fullConfigSpec } from '../../fileModels/bitcoin.conf'
import { i18n } from '../../i18n'

export const mempoolConfig = sdk.Action.withInput(
  'mempool-config',
  async ({ effects }) => ({
    name: i18n('Mempool & Block Policy'),
    description: i18n(
      'Configure mempool size, relay fees, expiry, and excessive block size.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),
  fullConfigSpec.filter({
    maxmempool: true,
    minrelaytxfee: true,
    mempoolexpiry: true,
    excessiveblocksize: true,
  }),
  async ({ effects }) => bitcoinConfFile.read().once(),
  async ({ effects, input }) => {
    await bitcoinConfFile.merge(effects, input)
  },
)
