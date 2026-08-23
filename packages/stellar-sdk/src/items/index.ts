import { Asset, BASE_FEE, Claimant, Keypair, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import { getActiveNetwork, getHorizonServer, getNetworkPassphrase } from '../utils/network'

export interface MintItemNFTParams {
  /** Marketplace catalog item id (packages/content/src/marketplace/items.ts), e.g. "sword-legendary". */
  itemId: string
  /** Buyer's Stellar public key. */
  owner: string
  /** Optional free-form context, e.g. `{ userId, purchaseId }` — used only for the on-chain memo hint, never parsed back. */
  metadata?: Record<string, string>
}

export interface MintItemNFTResult {
  transactionHash: string
  /** "<assetCode>:<issuerPublicKey>" — the Stellar CODE:ISSUER convention. */
  assetId: string
}

/** A fixed one-stroop supply per mint — effectively non-fungible: this asset code will only ever exist in this quantity. */
const NFT_UNIT_AMOUNT = '0.0000001'

/**
 * Derive a unique, valid Stellar asset code (<=12 alphanumeric characters)
 * for one specific purchase. Each mint gets its OWN asset code — this is a
 * one-off "NFT" per purchase, not one shared fungible asset per catalog
 * item — built from a readable prefix (the item id, stripped of the hyphen
 * Stellar asset codes can't contain) plus random suffix characters pulled
 * from a fresh keypair's public key (already alphanumeric, no new
 * dependency needed for randomness).
 */
function generateAssetCode(itemId: string): string {
  const prefix = itemId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7).toUpperCase()
  const suffixLength = 12 - prefix.length
  const suffix = Keypair.random().publicKey().slice(1, 1 + suffixLength)
  return `${prefix}${suffix}`
}

/**
 * Mint a cosmetic marketplace item as a one-off Stellar Classic asset and
 * deliver it to `owner` via a claimable balance.
 *
 * Claimable balance, not a direct payment: a direct payment of a non-native
 * asset requires the recipient to already hold a trustline for it, which
 * would mean either the server holding the player's secret key to sign one
 * (this codebase never persists player secrets — see `User.stellarPublicKey`
 * with no matching secret column) or asking the player to sign a trustline
 * transaction before every single purchase. A claimable balance needs no
 * trustline to receive, only to later claim and hold the asset — exactly
 * Stellar's built-in mechanism for "send someone an asset they haven't
 * trusted yet." Ownership for gameplay purposes lives in the database
 * (`ItemOwnership`, written by the purchase route only after this succeeds);
 * this on-chain artifact is the verifiable "this was actually minted, here's
 * the transaction hash" receipt the acceptance criteria ask for.
 *
 * Uses the same Classic building blocks (`Asset`, `TransactionBuilder`,
 * `Operation`, `BASE_FEE`) as the existing `issueAsset`/`createTrustline`
 * helpers in `../assets` — same mechanism, no Soroban contract involved.
 *
 * TESTNET ONLY, enforced unconditionally: throws if the resolved network is
 * ever anything but testnet, regardless of any other configuration. There
 * is no code path here that can reach mainnet.
 */
export async function mintItemNFT({ itemId, owner, metadata }: MintItemNFTParams): Promise<MintItemNFTResult> {
  const network = getActiveNetwork()
  if (network !== 'testnet') {
    throw new Error(`mintItemNFT refuses to run on network "${network}" — item NFTs may only be minted on testnet`)
  }

  const issuerSecret = process.env.STELLAR_ITEM_ISSUER_SECRET
  if (!issuerSecret) {
    throw new Error('STELLAR_ITEM_ISSUER_SECRET is not set — cannot mint item NFTs without a testnet issuer account')
  }

  const issuer = Keypair.fromSecret(issuerSecret)
  const assetCode = generateAssetCode(itemId)
  const asset = new Asset(assetCode, issuer.publicKey())

  const server = getHorizonServer(network)
  const account = await server.loadAccount(issuer.publicKey())

  const memoText = (metadata?.itemId ?? itemId).slice(0, 28)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(
      Operation.createClaimableBalance({
        asset,
        amount: NFT_UNIT_AMOUNT,
        claimants: [new Claimant(owner, Claimant.predicateUnconditional())],
      })
    )
    .addMemo(Memo.text(memoText))
    .setTimeout(30)
    .build()

  tx.sign(issuer)
  const result = await server.submitTransaction(tx)

  return {
    transactionHash: result.hash,
    assetId: `${assetCode}:${issuer.publicKey()}`,
  }
}
