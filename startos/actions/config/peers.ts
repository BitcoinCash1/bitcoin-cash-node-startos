import { sdk } from '../../sdk'
import { bitcoinConfFile, fullConfigSpec } from '../../fileModels/bitcoin.conf'
import { i18n } from '../../i18n'

export const peersConfig = sdk.Action.withInput(
  'peers-config',
  async ({ effects: _effects }) => ({
    name: i18n('RPC & Peers Settings'),
    description: i18n(
      'Configure RPC server tuning, peer connections, network restrictions, and bandwidth limits.',
    ),
    warning: null,
    allowedStatuses: 'any' as const,
    group: i18n('Configuration'),
    visibility: 'enabled' as const,
  }),
  fullConfigSpec.filter({
    rpcservertimeout: true,
    rpcthreads: true,
    rpcworkqueue: true,
    maxconnections: true,
    maxuploadtarget: true,
    peerbloomfilters: true,
    onlynet: true,
    addnode: true,
  }),
  async ({ effects: _effects }) => bitcoinConfFile.read().once(),
  async ({ effects, input }) => {
    await bitcoinConfFile.merge(effects, input)
  },
)
