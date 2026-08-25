import { Keypair, Horizon } from '@stellar/stellar-sdk'
import { getHorizonServer } from '../utils/network'

export { fundTestnetAccount } from '../challenges'

export interface GeneratedKeypair {
  publicKey: string
  secretKey: string
}

/** Generate a new random Stellar keypair (educational use — testnet only) */
export function generateKeypair(): GeneratedKeypair {
  const keypair = Keypair.random()
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  }
}

/** Load an account from the Stellar network */
export async function loadAccount(publicKey: string): Promise<Horizon.AccountResponse> {
  const server = getHorizonServer()
  return server.loadAccount(publicKey)
}

/** Check if an account exists on the network */
export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await loadAccount(publicKey)
    return true
  } catch {
    return false
  }
}

/** Get the XLM balance of an account */
export function getXLMBalance(account: Horizon.AccountResponse): string {
  const native = account.balances.find((b) => b.asset_type === 'native')
  return native?.balance ?? '0'
}
