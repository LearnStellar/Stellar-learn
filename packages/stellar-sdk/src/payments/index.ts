import { Keypair, TransactionBuilder, Operation, Asset, Memo, BASE_FEE } from '@stellar/stellar-sdk'
import { getHorizonServer, getNetworkPassphrase, getActiveNetwork } from '../utils/network'

export interface SendPaymentParams {
  senderSecretKey: string
  destinationPublicKey: string
  amount: string
  memo?: string
  asset?: Asset
}

export interface PaymentResult {
  hash: string
  ledger: number
  successful: boolean
}

/** Build, sign, and submit a payment transaction */
export async function sendPayment({
  senderSecretKey,
  destinationPublicKey,
  amount,
  memo,
  asset = Asset.native(),
}: SendPaymentParams): Promise<PaymentResult> {
  const network = getActiveNetwork()
  const server = getHorizonServer(network)
  const keypair = Keypair.fromSecret(senderSecretKey)
  const account = await server.loadAccount(keypair.publicKey())

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
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
  transaction.sign(keypair)

  const result = await server.submitTransaction(transaction)

  return {
    hash: result.hash,
    ledger: result.ledger,
    successful: result.successful,
  }
}
