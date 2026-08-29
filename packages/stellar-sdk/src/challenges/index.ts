import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk'

/**
 * Challenge transactions deliberately use these constants instead of the app's
 * selected network. Challenge code must never be able to select mainnet.
 */
export const TESTNET_HORIZON_URL = 'https://horizon-testnet.stellar.org'
export const TESTNET_FRIENDBOT_URL = 'https://friendbot.stellar.org'
export const TESTNET_NETWORK_PASSPHRASE = Networks.TESTNET

export interface TestnetKeypair {
  publicKey: string
  secretKey: string
}

export interface TestnetTransactionResult {
  hash: string
  ledger: number
  successful: boolean
}

export interface TestnetAssetDescriptor {
  assetCode: string
  issuerPublicKey?: string
}

export interface SendTestnetPaymentParams {
  senderSecretKey: string
  destinationPublicKey: string
  amount: string
  memo?: string
  asset?: Asset
}

export interface CreateTestnetTrustlineParams {
  accountSecretKey: string
  assetCode: string
  issuerPublicKey: string
  limit?: string
}

export interface IssueTestnetAssetParams {
  issuerSecretKey: string
  distributorSecretKey: string
  assetCode: string
  amount: string
}

/** Returns a Horizon client whose URL cannot be changed to mainnet. */
export function getTestnetHorizonServer(): Horizon.Server {
  return new Horizon.Server(TESTNET_HORIZON_URL)
}

/** Generate a throwaway keypair for a testnet challenge. Do not persist its secret. */
export function generateTestnetKeypair(): TestnetKeypair {
  const keypair = Keypair.random()

  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  }
}

/** Fund an account through the testnet-only Friendbot, then load its live state. */
export async function fundTestnetAccount(
  publicKey: string
): Promise<Horizon.AccountResponse> {
  Keypair.fromPublicKey(publicKey)

  const friendbotUrl = new URL(TESTNET_FRIENDBOT_URL)
  friendbotUrl.searchParams.set('addr', publicKey)

  const response = await fetch(friendbotUrl)
  if (!response.ok) {
    throw new Error(
      `Testnet Friendbot funding failed (${response.status} ${response.statusText})`
    )
  }

  return loadTestnetAccount(publicKey)
}

/** Load account state from the fixed Stellar testnet Horizon endpoint. */
export async function loadTestnetAccount(
  publicKey: string
): Promise<Horizon.AccountResponse> {
  Keypair.fromPublicKey(publicKey)
  return getTestnetHorizonServer().loadAccount(publicKey)
}

/**
 * Read an XLM or issued-asset balance from an account response.
 * Omitting `asset` reads XLM. For an issued asset, provide an Asset instance,
 * `{ assetCode, issuerPublicKey }`, or an asset code plus its issuer as arg 3.
 */
export function getTestnetAssetBalance(
  account: Horizon.AccountResponse,
  asset?: Asset | TestnetAssetDescriptor | string,
  issuerPublicKey?: string
): string {
  if (!asset) {
    return account.balances.find((balance) => balance.asset_type === 'native')?.balance ?? '0'
  }

  const descriptor = getAssetDescriptor(asset, issuerPublicKey)
  if (
    (descriptor.assetCode === 'XLM' || descriptor.assetCode === 'native') &&
    !descriptor.issuerPublicKey
  ) {
    return account.balances.find((balance) => balance.asset_type === 'native')?.balance ?? '0'
  }

  const balance = account.balances.find(
    (candidate) =>
      (candidate.asset_type === 'credit_alphanum4' || candidate.asset_type === 'credit_alphanum12') &&
      candidate.asset_code === descriptor.assetCode &&
      (!descriptor.issuerPublicKey || candidate.asset_issuer === descriptor.issuerPublicKey)
  )

  return balance?.balance ?? '0'
}

/** Build, sign, and submit a payment against Stellar testnet only. */
export async function sendTestnetPayment({
  senderSecretKey,
  destinationPublicKey,
  amount,
  memo,
  asset = Asset.native(),
}: SendTestnetPaymentParams): Promise<TestnetTransactionResult> {
  const server = getTestnetHorizonServer()
  const sender = Keypair.fromSecret(senderSecretKey)
  Keypair.fromPublicKey(destinationPublicKey)
  const account = await server.loadAccount(sender.publicKey())

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset,
        amount,
      })
    )
    .setTimeout(30)

  if (memo) {
    builder.addMemo(Memo.text(memo))
  }

  const transaction = builder.build()
  transaction.sign(sender)

  return toTestnetTransactionResult(await server.submitTransaction(transaction))
}

/** Add a trustline for an issued asset on Stellar testnet only. */
export async function createTestnetTrustline({
  accountSecretKey,
  assetCode,
  issuerPublicKey,
  limit,
}: CreateTestnetTrustlineParams): Promise<TestnetTransactionResult> {
  const server = getTestnetHorizonServer()
  const accountKeypair = Keypair.fromSecret(accountSecretKey)
  Keypair.fromPublicKey(issuerPublicKey)
  const account = await server.loadAccount(accountKeypair.publicKey())
  const asset = new Asset(assetCode, issuerPublicKey)

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset, limit }))
    .setTimeout(30)
    .build()

  transaction.sign(accountKeypair)
  return toTestnetTransactionResult(await server.submitTransaction(transaction))
}

/** Issue a custom asset to a distributor account on Stellar testnet only. */
export async function issueTestnetAsset({
  issuerSecretKey,
  distributorSecretKey,
  assetCode,
  amount,
}: IssueTestnetAssetParams): Promise<TestnetTransactionResult> {
  const server = getTestnetHorizonServer()
  const issuer = Keypair.fromSecret(issuerSecretKey)
  const distributor = Keypair.fromSecret(distributorSecretKey)
  const asset = new Asset(assetCode, issuer.publicKey())
  const account = await server.loadAccount(issuer.publicKey())

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: distributor.publicKey(),
        asset,
        amount,
      })
    )
    .setTimeout(30)
    .build()

  transaction.sign(issuer)
  return toTestnetTransactionResult(await server.submitTransaction(transaction))
}

function getAssetDescriptor(
  asset: Asset | TestnetAssetDescriptor | string,
  issuerPublicKey?: string
): TestnetAssetDescriptor {
  if (typeof asset === 'string') {
    return { assetCode: asset, issuerPublicKey }
  }

  if (asset instanceof Asset) {
    return {
      assetCode: asset.getCode(),
      issuerPublicKey: asset.getIssuer(),
    }
  }

  return asset
}

function toTestnetTransactionResult(result: {
  hash: string
  ledger: number
  successful: boolean
}): TestnetTransactionResult {
  return {
    hash: result.hash,
    ledger: result.ledger,
    successful: result.successful,
  }
}
