import type { World } from '../curriculum/types'

/**
 * World 3 — Asset Forge.
 * Teaches Stellar assets, the issuer/asset-code identity, trustlines, issuing
 * tokens via payment, and the issuer vs. distribution account pattern.
 * Grounded in:
 * https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets
 */
export const world3: World = {
  id: 'world-3-asset-forge',
  slug: 'asset-forge',
  title: 'Asset Forge',
  subtitle: 'Mint your own tokens in the molten depths',
  description:
    'Descend into the Asset Forge, where new tokens are hammered into existence. Learn what an asset really is, why trustlines exist, and how to issue your own.',
  theme: 'dungeon',
  order: 3,
  xpReward: 600,
  bossName: 'The Trust Breaker',
  bossDescription:
    'A serpent that whispers doubts about which tokens to trust. Defeat it by mastering trustlines and asset identity.',
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
      content: [
        {
          type: 'text',
          content:
            "## More Than Lumens\n\nStellar accounts can hold, send, and trade **any** asset — not just XLM. Assets can represent dollars, euros, stablecoins like USDC, stocks, bonds, NFTs, or your own custom token.\n\nThere are two kinds:\n- The **native asset**, XLM, which needs no issuer.\n- **Issued assets**, created and backed by an account.",
        },
        {
          type: 'text',
          content:
            "## Code + Issuer = Identity\n\nAn issued asset is uniquely identified by **two** things together:\n1. Its **asset code** — a short name like `USDC` or `GOLD`.\n2. Its **issuer** — the public key (G…) of the account that created it.",
        },
        {
          type: 'callout',
          variant: 'warning',
          content:
            'Anyone can issue a token called `USDC`. Only the **code + issuer** combination is unique. Always check the issuer before trusting an asset — the code alone means nothing.',
        },
        {
          type: 'text',
          content:
            '## Asset Code Sizes\n\nThere are two code formats:\n- **Alphanumeric 4** — 1 to 4 characters (e.g. `USDC`, `XLM`).\n- **Alphanumeric 12** — 5 to 12 characters (e.g. `RealEstate1`).\n\nAmounts are stored with **7 decimal places** of precision; the smallest unit is `0.0000001` (one **stroop**).',
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
      content: [
        {
          type: 'text',
          content:
            "## You Choose What to Hold\n\nYou can't be forced to hold a random token. To receive any non-native asset, your account must first open a **trustline** to it — an explicit opt-in that says 'I'm willing to hold this asset from this issuer.'",
        },
        {
          type: 'code',
          language: 'javascript',
          content:
            "// Open a trustline to an asset (a change_trust operation)\nconst usdc = new Asset('USDC', issuerPublicKey);\ntx.addOperation(\n  Operation.changeTrust({ asset: usdc, limit: '1000' })\n);",
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'A trustline is a **subentry**, so it raises your minimum balance by one base reserve (0.5 XLM). You can set a **limit** for the maximum amount you are willing to hold.',
        },
        {
          type: 'text',
          content:
            '## Why Trustlines Matter\n\nTrustlines protect you from spam tokens and let issuers track who holds their asset. To close a trustline you must hold a zero balance of that asset; removing it frees the 0.5 XLM reserve.',
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
      content: {
        description:
          'Fund the runner-provided issuer and holder, open the holder\'s FORGE trustline, then issue at least 100 FORGE to it. The issuer and holder labels map to temporary testnet accounts, so your code never handles credentials.',
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
      slug: 'issuer-and-distribution',
      title: 'The Two-Account Pattern',
      description: 'Why serious issuers use two accounts, not one.',
      type: 'lesson',
      order: 4,
      xpReward: 50,
      estimatedMinutes: 6,
      content: [
        {
          type: 'text',
          content:
            "## Issuer vs. Distribution\n\nProfessional token projects use **two** accounts:\n- The **issuing account** — mints the asset and ideally then locks itself so no more can ever be created.\n- The **distribution account** — holds the working supply and is the one that actually trades and pays out to users.",
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'Tokens sent **back to the issuing account are burned** (they leave circulation). This is how supply is reduced on Stellar.',
        },
        {
          type: 'text',
          content:
            '## Locking the Issuer\n\nTo prove a fixed supply, an issuer can **lock** its account by setting its signing weights so no key can sign anymore (the master weight goes to 0). After that, no new tokens can ever be minted — a credible "this is the entire supply" guarantee.',
        },
        {
          type: 'callout',
          variant: 'warning',
          content:
            'Lock the issuer only after the full supply is distributed. Locking is irreversible — there is no way to mint again afterward.',
        },
      ],
    },
    {
      id: 'q3-5-quiz',
      worldId: 'world-3-asset-forge',
      slug: 'asset-forge-quiz',
      title: 'Quiz: Assets & Trustlines',
      description: 'Prove you can forge and trust tokens correctly.',
      type: 'quiz',
      order: 5,
      xpReward: 120,
      estimatedMinutes: 5,
      content: [
        {
          id: 'q1',
          question: 'What uniquely identifies an issued asset on Stellar?',
          options: [
            { id: 'a', text: 'The asset code alone (e.g. "USDC")', isCorrect: false },
            { id: 'b', text: 'The combination of asset code AND issuer public key', isCorrect: true },
            { id: 'c', text: 'A random token ID', isCorrect: false },
            { id: 'd', text: 'The amount in circulation', isCorrect: false },
          ],
          explanation:
            'Anyone can mint a token with any code, so the code alone is not unique. Code + issuer together uniquely identify an asset.',
        },
        {
          id: 'q2',
          question: 'Before an account can receive a non-native asset, it must first…',
          options: [
            { id: 'a', text: 'Open a trustline to that asset', isCorrect: true },
            { id: 'b', text: 'Mine the asset', isCorrect: false },
            { id: 'c', text: 'Pay a 10 XLM fee', isCorrect: false },
            { id: 'd', text: 'Nothing — any account can hold any asset automatically', isCorrect: false },
          ],
          explanation:
            'A trustline is an explicit opt-in to hold an asset. It is a subentry, so it also raises the minimum balance by 0.5 XLM.',
        },
        {
          id: 'q3',
          question: 'How is a brand-new asset first created on Stellar?',
          options: [
            { id: 'a', text: 'With a special "create asset" operation', isCorrect: false },
            { id: 'b', text: 'The issuing account sends it in a payment', isCorrect: true },
            { id: 'c', text: 'By deploying a smart contract', isCorrect: false },
            { id: 'd', text: 'By staking XLM', isCorrect: false },
          ],
          explanation:
            'There is no dedicated create-asset operation. An asset is created the first time its issuing account pays it out (after the receiver opens a trustline).',
        },
        {
          id: 'q4',
          question: 'What happens to tokens sent back to their issuing account?',
          options: [
            { id: 'a', text: 'They are burned (removed from circulation)', isCorrect: true },
            { id: 'b', text: 'They double in value', isCorrect: false },
            { id: 'c', text: 'They are locked for 30 days', isCorrect: false },
            { id: 'd', text: 'Nothing special happens', isCorrect: false },
          ],
          explanation:
            'Sending an asset back to its issuer removes it from circulation — this is how supply is burned on Stellar.',
        },
        {
          id: 'q5',
          question: 'Why do serious projects lock the issuing account after distributing?',
          options: [
            { id: 'a', text: 'To guarantee a fixed supply that can never be inflated', isCorrect: true },
            { id: 'b', text: 'To earn staking rewards', isCorrect: false },
            { id: 'c', text: 'To make payments faster', isCorrect: false },
            { id: 'd', text: 'To hide the issuer’s identity', isCorrect: false },
          ],
          explanation:
            'Locking the issuer (setting all signing weights to 0) makes it impossible to mint more, providing a credible fixed-supply guarantee.',
        },
      ],
    },
    {
      id: 'q3-6-anchors-rwa',
      worldId: 'world-3-asset-forge',
      slug: 'anchors-and-rwa',
      title: 'Anchors & Real-World Assets',
      description: 'How fiat money and real-world value bridge onto the Stellar network.',
      type: 'lesson',
      order: 6,
      xpReward: 60,
      estimatedMinutes: 8,
      content: [
        {
          type: 'text',
          content:
            "## Bridging Two Worlds\n\nStellar is great for moving value, but how does value get onto the network in the first place? This is where **Anchors** come in. Anchors are trusted entities (like banks, fintech companies, or money service businesses) that act as a bridge between the Stellar network and traditional finance.\n\nThey hold fiat currency (like USD or EUR) or other Real-World Assets (RWA) in reserve, and issue equivalent tokens on Stellar. For example, a fiat-backed stablecoin like USDC is issued by Circle, which acts as an anchor.",
        },
        {
          type: 'text',
          content:
            "## Real-World Assets (RWA)\n\nAn anchor doesn't just have to issue fiat stablecoins. It can digitize any real-world asset (RWA). Stocks, bonds, real estate, and commodities can all be represented as tokens on Stellar. As long as users trust the anchor to hold the real asset and honor redemptions, the digital token holds its real-world value.\n\n*Source: [Stellar Docs - Anchors](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/anchors)*",
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            "Trust is key. When you hold an anchor's token, you are trusting them to maintain the 1:1 backing and process withdrawals.",
        },
        {
          type: 'text',
          content:
            "## Stellar Ecosystem Proposals (SEPs)\n\nTo ensure all wallets and anchors can talk to each other seamlessly, the Stellar community uses **SEPs** (Stellar Ecosystem Proposals). These are standardized protocols for interoperability.\n\nFor depositing and withdrawing, two SEPs are critical:\n- **SEP-6**: Programmatic, API-based deposit and withdrawal.\n- **SEP-24**: Interactive, web-based deposit and withdrawal (often used for KYC).",
        },
        {
          type: 'text',
          content:
            "## How Deposits Work (SEP-24)\n\n1. A user wants to deposit USD via a wallet.\n2. The wallet contacts the anchor using SEP-24.\n3. The anchor opens an interactive web page inside the wallet for the user to complete KYC (Know Your Customer) and bank transfer details.\n4. Once the anchor receives the real USD, it mints and sends the equivalent Stellar token to the user's account.\n\nWithdrawals work in reverse: the user sends tokens back to the anchor, the anchor burns them, and wires the real USD to the user's bank account.\n\n*Source: [Stellar SEP-24 Specification](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)*",
        },
      ],
    },
    {
      id: 'q3-7-anchors-quiz',
      worldId: 'world-3-asset-forge',
      slug: 'anchors-rwa-quiz',
      title: 'Quiz: Anchors & RWA',
      description: 'Test your knowledge on how value enters and exits the network.',
      type: 'quiz',
      order: 7,
      xpReward: 100,
      estimatedMinutes: 5,
      content: [
        {
          id: 'q1',
          question: 'What is the primary role of an Anchor on the Stellar network?',
          options: [
            { id: 'a', text: 'To mine new XLM for the network', isCorrect: false },
            { id: 'b', text: 'To act as a bridge between the Stellar network and traditional finance', isCorrect: true },
            { id: 'c', text: 'To securely store user private keys', isCorrect: false },
            { id: 'd', text: 'To govern protocol upgrades', isCorrect: false },
          ],
          explanation:
            'Anchors bridge two worlds by taking in real-world assets (like fiat) and issuing equivalent tokens on Stellar.',
        },
        {
          id: 'q2',
          question: 'What does RWA stand for in the context of Stellar tokens?',
          options: [
            { id: 'a', text: 'Real-World Assets', isCorrect: true },
            { id: 'b', text: 'Return With Analytics', isCorrect: false },
            { id: 'c', text: 'Randomized Wallet Access', isCorrect: false },
            { id: 'd', text: 'Read-Write Authority', isCorrect: false },
          ],
          explanation:
            'RWA stands for Real-World Assets, which refers to off-chain assets (like stocks, bonds, or fiat) that are tokenized on the blockchain.',
        },
        {
          id: 'q3',
          question: 'Which Stellar Ecosystem Proposal (SEP) is commonly used for interactive, web-based deposits and withdrawals that require KYC?',
          options: [
            { id: 'a', text: 'SEP-7', isCorrect: false },
            { id: 'b', text: 'SEP-6', isCorrect: false },
            { id: 'c', text: 'SEP-24', isCorrect: true },
            { id: 'd', text: 'SEP-10', isCorrect: false },
          ],
          explanation:
            'SEP-24 provides an interactive web flow, allowing users to easily complete KYC and provide bank details inside their wallet interface.',
        },
        {
          id: 'q4',
          question: 'What happens during a fiat withdrawal process via an Anchor?',
          options: [
            { id: 'a', text: 'The user sends XLM to the anchor, and the anchor sends fiat back', isCorrect: false },
            { id: 'b', text: 'The anchor locks the user account', isCorrect: false },
            { id: 'c', text: 'The user sends the token to the anchor, the anchor burns it and wires the real-world asset/fiat', isCorrect: true },
            { id: 'd', text: 'The user converts the token to native XLM instantly', isCorrect: false },
          ],
          explanation:
            'To withdraw, the user returns the token to the anchor. The anchor removes it from circulation (burns it) and sends the underlying real-world asset to the user.',
        },
      ],
    },
  ],
}
