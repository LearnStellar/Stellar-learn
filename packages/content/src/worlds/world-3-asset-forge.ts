import type { World } from '../curriculum/types'

/**
 * World 3 — Asset Forge.
 * Teaches Stellar assets, the issuer/asset-code identity, trustlines, issuing
 * tokens via payment, the issuer vs. distribution account pattern, auth flags,
 * and regulatory clawback (CAP-0035).
 * Grounded in:
 * https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets
 */
export const world3: World = {
  id: 'world-3-asset-forge',
  slug: 'asset-forge',
  title: 'Asset Forge',
  subtitle: 'Mint your own tokens in the molten depths',
  description:
    'Descend into the Asset Forge, where new tokens are hammered into existence. Learn what an asset really is, why trustlines exist, how auth flags protect issuers, and how to forge your own.',
  theme: 'dungeon',
  order: 3,
  xpReward: 600,
  bossName: 'The Trust Breaker',
  bossDescription:
    'A serpent that whispers doubts about which tokens to trust. Defeat it by mastering trustlines, asset identity, and clawback controls.',
  quests: [
    {
      id: 'q3-1-what-is-an-asset',
      worldId: 'world-3-asset-forge',
      slug: 'what-is-an-asset',
      title: 'Anatomy of an Asset',
      description: 'XLM is just one asset. Learn what defines all the others.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets#overview',
      content: [
        {
          type: 'text',
          content:
            '## More Than Lumens\n\nStellar accounts can hold, send, and trade **any** asset — not just XLM. Assets can represent fiat currencies (USD, EUR), stablecoins like USDC, commodities, or your own custom tokens.\n\nThere are two kinds of assets:\n- The **native asset**, XLM, which has no issuer and exists by default.\n- **Issued assets**, created and authorized by a specific issuing account.',
        },
        {
          type: 'text',
          content:
            '## Code + Issuer = Identity\n\nAn issued asset is uniquely identified by **two** values together:\n1. Its **asset code** — a name such as `USDC` or `GOLD`.\n2. Its **issuer public key** — the account address (`G…`) that created it.',
        },
        {
          type: 'callout',
          variant: 'warning',
          content:
            'Anyone on Stellar can create a token called `USDC`. Only the **code + issuer** pair uniquely identifies the genuine asset. Always verify the issuer public key before accepting a token.',
        },
        {
          type: 'text',
          content:
            '## Asset Code Formats & Precision\n\nStellar supports two code sizes for classic assets:\n- **Alphanumeric 4:** 1 to 4 characters (e.g., `USDC`, `EUR`, `BTC`).\n- **Alphanumeric 12:** 5 to 12 characters (e.g., `RealEstate1`, `COMMODITY`).\n\nAll balances are stored with **7 decimal places** of precision. The smallest transferable unit (`0.0000001`) is called a **stroop**.',
        },
      ],
    },
    {
      id: 'q3-2-trustlines',
      worldId: 'world-3-asset-forge',
      slug: 'trustlines',
      title: 'Trustlines: Opt In to Hold',
      description: 'Before you can hold an asset, you must trust it. Find out why.',
      type: 'lesson',
      order: 2,
      xpReward: 50,
      estimatedMinutes: 7,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets#trustlines',
      content: [
        {
          type: 'text',
          content:
            "## You Choose What to Hold\n\nOn Stellar, no one can send you unsolicited tokens or spam your balance without your consent. To hold any non-native asset, your account must first establish a **trustline** via a `ChangeTrust` operation.\n\nA trustline is an explicit statement: *'I am willing to hold this asset from this issuer up to a specified limit.'*",
        },
        {
          type: 'code',
          language: 'javascript',
          content:
            "// Open a trustline using the Stellar SDK\nconst usdc = new Asset('USDC', issuerPublicKey);\nconst tx = new TransactionBuilder(account, { fee: '100' })\n  .addOperation(Operation.changeTrust({ asset: usdc, limit: '1000' }))\n  .setTimeout(30)\n  .build();",
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'A trustline is an on-chain **subentry**. Opening a trustline locks **one base reserve (0.5 XLM)** in your account until the trustline is removed (with a 0 balance).',
        },
        {
          type: 'text',
          content:
            '## Controlling Trustline Limits\n\nWhen establishing a trustline, you can set a maximum limit (e.g., `1000`). If omitted, the limit defaults to the maximum possible integer balance. Setting the limit to `0` removes the trustline when you no longer hold any tokens, returning the 0.5 XLM reserve.',
        },
      ],
    },
    {
      id: 'q3-3-issue-test-asset',
      worldId: 'world-3-asset-forge',
      slug: 'issue-test-asset',
      title: 'Forging a Token',
      description: 'Open a trustline and issue 100 FORGE on Stellar testnet.',
      type: 'challenge',
      order: 3,
      xpReward: 50,
      estimatedMinutes: 7,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets#issuing-assets',
      content: {
        description:
          "Fund the runner-provided issuer and holder, open the holder's FORGE trustline, then issue at least 100 FORGE to it. The issuer and holder labels map to temporary testnet accounts, so your code never handles credentials.",
        starterCode: `// The runner stores temporary testnet keys behind these labels.
await stellar.fundAccount('issuer')
await stellar.fundAccount('holder')

await stellar.createTrustline({
  account: 'holder',
  issuer: 'issuer',
  assetCode: 'FORGE',
})

await stellar.issueAsset({
  issuer: 'issuer',
  holder: 'holder',
  assetCode: 'FORGE',
  amount: '100',
})`,
        validationRules: [
          {
            type: 'tx_success',
            params: { transaction: 'issueAsset' },
            errorMessage: 'Issue FORGE with stellar.issueAsset after opening the trustline.',
          },
          {
            type: 'asset_issued',
            params: { assetCode: 'FORGE', issuer: 'issuer', holder: 'holder', minimum: '100' },
            errorMessage: 'No FORGE asset was issued by the required issuer account.',
          },
          {
            type: 'balance_check',
            params: { account: 'holder', assetCode: 'FORGE', issuer: 'issuer', minimum: '100' },
            errorMessage: 'The holder needs a FORGE balance of at least 100 from the issuer.',
          },
        ],
        hints: [
          'Fund both temporary accounts before creating a trustline; a trustline needs enough XLM reserve.',
          'Use stellar.createTrustline for account "holder", asset code "FORGE", and issuer "issuer".',
          'Only stellar.issueAsset can mint FORGE here. Send at least "100" to the holder after its trustline exists.',
        ],
        testnetRequired: true,
      },
    },
    {
      id: 'q3-4-issuer-distribution',
      worldId: 'world-3-asset-forge',
      slug: 'issuer-controls-and-clawback',
      title: 'Auth Flags, Clawback & Architecture',
      description: 'Master the two-account pattern, auth flags, and regulatory clawback.',
      type: 'lesson',
      order: 4,
      xpReward: 50,
      estimatedMinutes: 8,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets#flags',
      content: [
        {
          type: 'text',
          content:
            '## The Two-Account Architecture\n\nProduction token projects use two dedicated accounts:\n1. **Issuing Account:** Mints tokens and maintains the asset definition. It holds zero non-native assets and never trades on the DEX.\n2. **Distribution Account:** Receives initial minted supply from the issuer and acts as the public-facing operational wallet.',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'Tokens sent back to their issuing account are automatically **burned** (removed from circulation). This is the native deflation/redemption mechanism on Stellar.',
        },
        {
          type: 'text',
          content:
            '## Issuer Auth Flags\n\nAn issuing account can configure flags using `SetOptions` before distributing tokens:\n- **AUTH_REQUIRED:** The issuer must explicitly authorize any account before it can hold or transact the asset (useful for KYC/accredited investor assets).\n- **AUTH_REVOCABLE:** The issuer can freeze an account’s authorization to trade the asset.\n- **AUTH_IMMUTABLE:** Permanently locks the flags so the issuer can never alter these rules in the future.',
        },
        {
          type: 'text',
          content:
            '## Regulatory Clawback (CAP-0035)\n\nRegulated financial institutions (e.g. securities, bonds, fiat stablecoins) often require the ability to recover funds due to legal orders, fraud, or lost credentials.\n\nBy enabling **AUTH_CLAWBACK_ENABLED** before minting, the issuer can execute a `Clawback` operation to burn or recover tokens directly from a specific holder account. Clawback is transparent: users know whether an asset supports clawback before opening a trustline.',
        },
        {
          type: 'callout',
          variant: 'warning',
          content:
            'Clawback can only be enabled BEFORE the asset is created. An issuer cannot secretly enable clawback on an existing asset later.',
        },
      ],
    },
    {
      id: 'q3-5-quiz',
      worldId: 'world-3-asset-forge',
      slug: 'asset-forge-quiz',
      title: 'Quiz: Assets, Trustlines & Clawback',
      description: 'Prove you can forge, regulate, and trust tokens correctly.',
      type: 'quiz',
      order: 5,
      xpReward: 120,
      estimatedMinutes: 5,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets',
      content: [
        {
          id: 'q1',
          question: 'What uniquely identifies an issued asset on Stellar?',
          options: [
            { id: 'a', text: 'The asset code alone (e.g. "USDC")', isCorrect: false },
            {
              id: 'b',
              text: 'The combination of asset code AND issuer public key',
              isCorrect: true,
            },
            { id: 'c', text: 'A random token ID created on the DEX', isCorrect: false },
            { id: 'd', text: 'The total amount in circulation', isCorrect: false },
          ],
          explanation:
            'Anyone can mint a token with any code, so the code alone is not unique. Code + issuer together uniquely identify an asset.',
        },
        {
          id: 'q2',
          question: 'Before an account can receive a non-native asset, it must first…',
          options: [
            { id: 'a', text: 'Open a trustline to that asset', isCorrect: true },
            { id: 'b', text: 'Mine 10 blocks on the ledger', isCorrect: false },
            { id: 'c', text: 'Pay a 10 XLM fee to the SDF', isCorrect: false },
            {
              id: 'd',
              text: 'Nothing — any account can hold any asset automatically',
              isCorrect: false,
            },
          ],
          explanation:
            'A trustline is an explicit opt-in to hold an asset. It is a subentry, so it raises the minimum balance by 0.5 XLM.',
        },
        {
          id: 'q3',
          question: 'How are brand-new tokens minted on Stellar?',
          options: [
            { id: 'a', text: 'Through a dedicated "CreateAsset" opcode', isCorrect: false },
            {
              id: 'b',
              text: 'The issuing account pays the asset to an account with an open trustline',
              isCorrect: true,
            },
            { id: 'c', text: 'By deploying a Rust smart contract', isCorrect: false },
            { id: 'd', text: 'By burning native XLM', isCorrect: false },
          ],
          explanation:
            'Stellar creates tokens the moment the issuing account sends a payment of that asset to an account that has opened a trustline.',
        },
        {
          id: 'q4',
          question: 'What happens to issued tokens sent back to their issuing account?',
          options: [
            {
              id: 'a',
              text: 'They are permanently burned (removed from circulation)',
              isCorrect: true,
            },
            {
              id: 'b',
              text: 'They are automatically redistributed to validators',
              isCorrect: false,
            },
            { id: 'c', text: 'They are locked in escrow for 30 days', isCorrect: false },
            { id: 'd', text: 'Nothing special happens', isCorrect: false },
          ],
          explanation:
            'Sending an asset back to its issuer removes it from circulation — this is how supply is burned on Stellar.',
        },
        {
          id: 'q5',
          question: 'What does the AUTH_CLAWBACK_ENABLED flag allow an issuer to do?',
          options: [
            {
              id: 'a',
              text: 'Recover or burn tokens from a holder account to comply with regulatory or fraud mandates',
              isCorrect: true,
            },
            { id: 'b', text: 'Steal any random user’s XLM at will', isCorrect: false },
            { id: 'c', text: 'Bypass the consensus protocol', isCorrect: false },
            { id: 'd', text: 'Disable all transaction fees for their asset', isCorrect: false },
          ],
          explanation:
            'Clawback (CAP-0035) enables regulated asset issuers (such as tokenized securities or fiat tokens) to recover funds due to regulatory requirements or court orders.',
        },
      ],
    },
  ],
}
