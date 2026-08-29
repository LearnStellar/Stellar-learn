import { Keypair, Horizon } from '@stellar/stellar-sdk'
import { getHorizonServer, getActiveNetwork, NETWORK_CONFIG } from '../utils/network'

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

/**
 * Fund a testnet account using Friendbot.
 * Returns the account details after funding.
 */
export async function fundTestnetAccount(publicKey: string): Promise<Horizon.AccountResponse> {
  const network = getActiveNetwork()
  if (network !== 'testnet') {
    throw new Error('Friendbot funding is only available on testnet')
  }

  const friendbotUrl = NETWORK_CONFIG.testnet.friendbotUrl
  const response = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`)
  if (!response.ok) {
    throw new Error(`Friendbot failed: ${response.statusText}`)
  }

  const server = getHorizonServer(network)
  return server.loadAccount(publicKey)
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
