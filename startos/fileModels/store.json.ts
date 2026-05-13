import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const shape = z
  .object({
    rpcUser: z.string().catch('bitcoincashd'),
    rpcPassword: z.string().catch(''),
    txindex: z.boolean().catch(true),
    zmqEnabled: z.boolean().catch(true),
    network: z
      .enum(['mainnet', 'testnet3', 'testnet4', 'scalenet', 'chipnet', 'regtest'])
      .catch('mainnet'),
    initialized: z.boolean().catch(false),
    reindexBlockchain: z.boolean().catch(false),
    reindexChainstate: z.boolean().catch(false),
    fullySynced: z.boolean().catch(false),
  })
  .strip()

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)
