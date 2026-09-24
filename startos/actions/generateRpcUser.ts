import { createHmac, randomBytes } from 'crypto'
import { sdk } from '../sdk'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { i18n } from '../i18n'

const { InputSpec, Value } = sdk

const spec = InputSpec.of({
  username: Value.text({
    name: i18n('Username'),
    description: i18n('Alphanumeric username for the new RPC user.'),
    required: true,
    default: null,
    masked: false,
    placeholder: 'myservice',
  }),
})

function generateRpcAuth(username: string): {
  rpcauth: string
  password: string
} {
  const password = randomBytes(24).toString('base64url')
  const salt = randomBytes(16).toString('hex')
  const hmac = createHmac('sha256', salt).update(password).digest('hex')
  return { rpcauth: `${username}:${salt}$${hmac}`, password }
}

export const generateRpcUser = sdk.Action.withInput(
  'generate-rpc-user',
  async ({ effects: _effects }) => ({
    name: i18n('Generate RPC Credentials'),
    description: i18n(
      'Create a new rpcauth entry for an external service (wallet, indexer, miner). The generated password is displayed once — save it immediately.',
    ),
    warning: null,
    allowedStatuses: 'any' as const,
    group: i18n('Credentials'),
    visibility: 'enabled' as const,
  }),
  spec,
  async ({ effects: _effects }) => ({
    username: undefined as string | undefined,
  }),
  async ({ effects, input }) => {
    const { username } = input
    const { rpcauth, password } = generateRpcAuth(username)

    // Append the new rpcauth entry to bitcoin.conf
    const conf = await bitcoinConfFile.read().once()
    const existingAuth: string[] = (
      (conf?.raw?.rpcauth as unknown as (string | undefined)[] | undefined) ??
      []
    ).filter((v): v is string => typeof v === 'string')
    // Remove any existing entry for the same username, then add the new one
    const filtered = existingAuth.filter(
      (entry) => !entry.startsWith(`${username}:`),
    )
    await bitcoinConfFile.merge(effects, {
      raw: { ...conf?.raw, rpcauth: [...filtered, rpcauth] },
    } as any)

    return {
      version: '1' as const,
      title: i18n('RPC Credentials: ${username}', { username }),
      message: i18n('Save this password now — it will not be shown again.'),
      result: {
        type: 'single' as const,
        value: password,
        copyable: true,
        qr: false,
        masked: false,
      },
    }
  },
)
