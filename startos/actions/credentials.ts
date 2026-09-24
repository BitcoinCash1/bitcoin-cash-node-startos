import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { networkPorts, Network } from '../utils'
import { i18n } from '../i18n'

const { InputSpec, Value } = sdk

export const viewCredentials = sdk.Action.withInput(
  'view-credentials',
  async ({ effects }) => ({
    name: i18n('View RPC Credentials'),
    description: i18n(
      'Select a credential by name to view its username, password, and RPC port.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: 'Credentials',
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const conf = await bitcoinConfFile.read().once()
    const existingAuth: string[] = (
      (conf?.raw?.rpcauth as unknown as (string | undefined)[] | undefined) ??
      []
    ).filter((v): v is string => typeof v === 'string')

    const values: Record<string, string> = { Default: 'Default' }
    for (const entry of existingAuth) {
      const username = entry.split(':')[0]
      if (username) values[username] = username
    }

    return InputSpec.of({
      name: Value.select({
        name: i18n('Credential'),
        description: i18n('Select a credential to view its details.'),
        values,
        default: 'Default',
      }),
    })
  },

  async ({ effects }) => ({ name: 'Default' }),

  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    const network: Network = store?.network ?? 'mainnet'
    const port = networkPorts[network].rpc

    if (input.name === 'Default') {
      const user = store?.rpcUser ?? 'bitcoincashd'
      const pass = store?.rpcPassword ?? ''
      return {
        version: '1' as const,
        title: i18n('RPC Credential: ${name}', { name: 'Default' }),
        message: [
          i18n('**Name:** ${name} (active)', { name: 'Default' }),
          i18n('**Username:** ${username}', { username: user }),
          i18n('**Password:** ${password}', { password: pass }),
          i18n('**Port:** ${port}', { port: String(port) }),
        ].join('\n'),
        result: {
          type: 'single' as const,
          value: `${user}:${pass}`,
          copyable: true,
          qr: false,
          masked: true,
        },
      }
    }

    // rpcauth user — the salted HMAC is all that is stored, so the password is not
    // recoverable and is shown once. Never add a path that keeps the plaintext.
    return {
      version: '1' as const,
      title: i18n('RPC Credential: ${name}', { name: input.name }),
      message: [
        i18n('**Name:** ${name}', { name: input.name }),
        i18n('**Username:** ${username}', { username: input.name }),
        i18n('**Password:** *(set at generation — not recoverable)*'),
        i18n('**Port:** ${port}', { port: String(port) }),
      ].join('\n'),
      result: {
        type: 'single' as const,
        value: `Username: ${input.name} | Port: ${port}`,
        copyable: true,
        qr: false,
        masked: false,
      },
    }
  },
)
