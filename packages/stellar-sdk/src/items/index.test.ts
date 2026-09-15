import { Account, Keypair } from '@stellar/stellar-sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockLoadAccount = vi.fn()
const mockSubmitTransaction = vi.fn()
const mockGetActiveNetwork = vi.fn()

vi.mock('../utils/network', () => ({
  getActiveNetwork: () => mockGetActiveNetwork(),
  getHorizonServer: () => ({ loadAccount: mockLoadAccount, submitTransaction: mockSubmitTransaction }),
  getNetworkPassphrase: () => 'Test SDF Network ; September 2015',
}))

const ISSUER = Keypair.random()
const OWNER = Keypair.random().publicKey()

describe('mintItemNFT', () => {
  const originalSecret = process.env.STELLAR_ITEM_ISSUER_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveNetwork.mockReturnValue('testnet')
    process.env.STELLAR_ITEM_ISSUER_SECRET = ISSUER.secret()
    mockLoadAccount.mockResolvedValue(new Account(ISSUER.publicKey(), '100'))
    mockSubmitTransaction.mockResolvedValue({ hash: 'fake-tx-hash-123' })
  })

  afterEach(() => {
    process.env.STELLAR_ITEM_ISSUER_SECRET = originalSecret
  })

  it('refuses to run on any network other than testnet, unconditionally', async () => {
    const { mintItemNFT } = await import('./index')
    mockGetActiveNetwork.mockReturnValue('mainnet')

    await expect(mintItemNFT({ itemId: 'sword-legendary', owner: OWNER })).rejects.toThrow(/testnet/i)
    expect(mockSubmitTransaction).not.toHaveBeenCalled()
  })

  it('fails loudly when the issuer secret env var is unset', async () => {
    const { mintItemNFT } = await import('./index')
    delete process.env.STELLAR_ITEM_ISSUER_SECRET

    await expect(mintItemNFT({ itemId: 'sword-legendary', owner: OWNER })).rejects.toThrow(
      /STELLAR_ITEM_ISSUER_SECRET/
    )
    expect(mockSubmitTransaction).not.toHaveBeenCalled()
  })

  it('mints on testnet and returns a transaction hash plus a CODE:ISSUER asset id', async () => {
    const { mintItemNFT } = await import('./index')

    const result = await mintItemNFT({ itemId: 'sword-legendary', owner: OWNER })

    expect(result.transactionHash).toBe('fake-tx-hash-123')
    expect(mockSubmitTransaction).toHaveBeenCalledTimes(1)

    const [assetCode, issuerPublicKey] = result.assetId.split(':')
    expect(issuerPublicKey).toBe(ISSUER.publicKey())
    expect(assetCode).toBeDefined()
    expect(assetCode!.length).toBeLessThanOrEqual(12)
    expect(assetCode).toMatch(/^[A-Za-z0-9]+$/) // valid Stellar asset code characters
    expect(assetCode!.startsWith('SWORDLE')).toBe(true) // readable prefix from the item id (7 chars, hyphen stripped)
  })

  it('mints a different asset code for every call, even for the same item (one-off per purchase)', async () => {
    const { mintItemNFT } = await import('./index')

    const first = await mintItemNFT({ itemId: 'sword-legendary', owner: OWNER })
    const second = await mintItemNFT({ itemId: 'sword-legendary', owner: OWNER })

    expect(first.assetId).not.toBe(second.assetId)
  })

  it('sends the claimable balance to the owner, not a direct payment', async () => {
    const { mintItemNFT } = await import('./index')
    await mintItemNFT({ itemId: 'sword-legendary', owner: OWNER })

    const submittedTx = mockSubmitTransaction.mock.calls[0]![0]
    const operation = submittedTx.operations[0]
    expect(operation.type).toBe('createClaimableBalance')
    expect(operation.claimants[0].destination).toBe(OWNER)
  })
})
