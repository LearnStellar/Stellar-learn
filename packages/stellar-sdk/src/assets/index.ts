import { Keypair, TransactionBuilder, Operation, Asset, BASE_FEE } from '@stellar/stellar-sdk'
import { getHorizonServer, getNetworkPassphrase, getActiveNetwork } from '../utils/network'

export interface CreateTrustlineParams {
  accountSecretKey: string
  assetCode: string
  issuerPublicKey: string
  limit?: string
}

export interface IssueAssetParams {
  issuerSecretKey: string
  distributorSecretKey: string
  assetCode: string
  amount: string
}

/** Create a trustline so an account can hold a custom asset */
export async function createTrustline({
  accountSecretKey,
  assetCode,
  issuerPublicKey,
  limit,
}: CreateTrustlineParams) {
  const network = getActiveNetwork()
  const server = getHorizonServer(network)
  const keypair = Keypair.fromSecret(accountSecretKey)
  const account = await server.loadAccount(keypair.publicKey())
  const asset = new Asset(assetCode, issuerPublicKey)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(Operation.changeTrust({ asset, limit }))
    .setTimeout(30)
    .build()

  tx.sign(keypair)
  return server.submitTransaction(tx)
}

/** Issue (mint) a custom asset from issuer to distributor account */
export async function issueAsset({
  issuerSecretKey,
  distributorSecretKey,
  assetCode,
  amount,
}: IssueAssetParams) {
  const network = getActiveNetwork()
  const server = getHorizonServer(network)
  const issuerKeypair = Keypair.fromSecret(issuerSecretKey)
  const distributorKeypair = Keypair.fromSecret(distributorSecretKey)
  const asset = new Asset(assetCode, issuerKeypair.publicKey())
  const account = await server.loadAccount(issuerKeypair.publicKey())

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(
      Operation.payment({
        destination: distributorKeypair.publicKey(),
        asset,
        amount,
      })
    )
    .setTimeout(30)
    .build()

  tx.sign(issuerKeypair)
  return server.submitTransaction(tx)
}
