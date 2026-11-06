import type { World } from '../curriculum/types'

/**
 * World 2 — Wallet Kingdom.
 * Teaches keypairs, accounts, Freighter wallets, minimum balance / base reserve model,
 * multi-signature authorization, and how accounts are funded on testnet. Grounded in the Stellar docs:
 * https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts
 */
export const world2: World = {
  id: 'world-2-wallet-kingdom',
  slug: 'wallet-kingdom',
  title: 'Wallet Kingdom',
  subtitle: 'Guard your keys, claim your account',
  description:
    'Enter the golden halls of the Wallet Kingdom, where every citizen carries a keypair. Master accounts, keys, Freighter wallets, and the reserves that keep the realm spam-free.',
  theme: 'castle',
  order: 2,
  xpReward: 550,
  bossName: 'The Key Crusher',
  bossDescription:
    'A brutish gatekeeper who preys on careless adventurers. Prove you can keep a secret key safe and it crumbles to dust.',
  quests: [
    {
      id: 'q2-1-keypairs',
      worldId: 'world-2-wallet-kingdom',
      slug: 'keypairs',
      title: 'The Two Keys & Freighter',
      description:
        'Every adventurer carries a public key and a secret key. Learn how wallets like Freighter protect them.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#public-and-secret-keys',
      content: [
        {
          type: 'text',
          content:
            "## A Pair of Keys\n\nTo do anything on Stellar you need a **keypair** — two linked keys generated together:\n\n- A **public key** starts with **G** (e.g. `GABC…XYZ`). It *is* your account's address. Share it freely so people can pay you.\n- A **secret key** starts with **S** (e.g. `SDEF…789`). It signs your transactions and proves ownership. **Never share it.**",
        },
        {
          type: 'callout',
          variant: 'warning',
          content:
            '**Anyone with your secret key controls your account.** There is no password reset and no support line that can recover it. Guard it like the crown jewels.',
        },
        {
          type: 'code',
          language: 'javascript',
          content:
            '// Generate a fresh keypair with the Stellar SDK\nconst pair = Keypair.random();\npair.publicKey(); // "GABC...XYZ"  → your address (safe to share)\npair.secret();    // "SDEF...789"  → keep this secret!',
        },
        {
          type: 'text',
          content:
            '## Browser Wallets: Freighter\n\nIn modern web apps, users never paste their raw secret key into web forms. Instead, they use a non-custodial browser wallet extension like **Freighter**.\n\nFreighter stores the encrypted secret key securely on your machine. When a dApp requests a transaction, Freighter displays the details in a confirmation popup and signs the envelope without ever exposing the underlying secret key to the website.',
        },
        {
          type: 'callout',
          variant: 'tip',
          content:
            'Think of it like a mailbox: the **public key** is the slot anyone can drop mail into; the **secret key** is the only key that opens it to take mail out.',
        },
      ],
    },
    {
      id: 'q2-2-accounts',
      worldId: 'world-2-wallet-kingdom',
      slug: 'accounts',
      title: 'Claiming Your Account',
      description: 'A keypair is not yet an account. Learn what turns one into the other.',
      type: 'lesson',
      order: 2,
      xpReward: 50,
      estimatedMinutes: 6,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#creating-an-account',
      content: [
        {
          type: 'text',
          content:
            "## Keypair vs. Account\n\nGenerating a keypair is free and offline — it's just math. But that address doesn't exist on the ledger until someone **funds it** with the minimum balance of XLM. Only then does it become a real **account** the network tracks.",
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            "An account is created by sending it XLM with a **Create Account** operation. Until that happens, the address is simply 'not found' on the network.",
        },
        {
          type: 'text',
          content:
            '## What an Account Stores\n\nOnce created, your account entry on the ledger holds:\n- Your **XLM balance**\n- A **sequence number** (a counter that orders your transactions)\n- **Signers** and thresholds (who can authorize what)\n- **Subentries** like trustlines, offers, and data entries',
        },
        {
          type: 'callout',
          variant: 'tip',
          content:
            'The **sequence number** must increase by exactly 1 with each transaction. This is how Stellar stops the same transaction from being replayed twice.',
        },
      ],
    },
    {
      id: 'q2-3-fund-testnet-account',
      worldId: 'world-2-wallet-kingdom',
      slug: 'fund-testnet-account',
      title: 'Friendbot, the Royal Treasury',
      description: 'Fund a fresh Stellar testnet account with Friendbot.',
      type: 'challenge',
      order: 3,
      xpReward: 50,
      estimatedMinutes: 5,
      source: 'https://developers.stellar.org/docs/learn/fundamentals/networks#friendbot',
      content: {
        description:
          'Fund the runner-provided learner account with Friendbot. Passing requires a real Stellar testnet account with at least 5 XLM; no mainnet credentials or endpoints are available in this quest.',
        starterCode: `// Friendbot only funds accounts on Stellar testnet.
// The challenge runner manages the temporary account behind the "learner" label.
await stellar.fundAccount('learner')`,
        validationRules: [
          {
            type: 'tx_success',
            params: { transaction: 'fundAccount' },
            errorMessage: 'Use stellar.fundAccount to fund the testnet account.',
          },
          {
            type: 'account_created',
            params: { account: 'learner' },
            errorMessage: 'Friendbot did not create the required testnet account.',
          },
          {
            type: 'balance_check',
            params: { account: 'learner', assetCode: 'XLM', minimumDelta: '5' },
            errorMessage: 'The funded account needs at least 5 XLM more than its starting balance.',
          },
        ],
        hints: [
          'Call stellar.fundAccount with the account label exactly as "learner".',
          'Friendbot creates the account and funds it in one testnet-only operation.',
          'The runner keeps the temporary account credentials private, so your code only needs the account label.',
        ],
        testnetRequired: true,
      },
    },
    {
      id: 'q2-4-reserves',
      worldId: 'world-2-wallet-kingdom',
      slug: 'minimum-balance',
      title: 'Reserves, Signers & Multi-Sig',
      description:
        'Why accounts require reserves and how multi-signature thresholds protect assets.',
      type: 'lesson',
      order: 4,
      xpReward: 50,
      estimatedMinutes: 7,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/operations-and-transactions#multi-signature',
      content: [
        {
          type: 'text',
          content:
            "## The Base Reserve\n\nEvery account must hold a **minimum balance** of XLM it can't spend. It exists to stop spammers from bloating the ledger with junk accounts. The unit is the **base reserve**, currently **0.5 XLM**.",
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'Minimum balance = **(2 + number of subentries) × base reserve**. With a base reserve of 0.5 XLM, a fresh account needs **2 × 0.5 = 1 XLM**.',
        },
        {
          type: 'text',
          content:
            '## Signers and Multi-Sig\n\nStellar natively supports multi-signature authorization without smart contracts. Accounts can add other public keys as **signers**, each with an assigned **weight**.\n\nOperations are categorized into three threshold levels:\n- **Low:** AllowTrust, BumpSequence\n- **Medium:** Payment, ManageOffer, ChangeTrust\n- **High:** SetOptions (changing signers or thresholds), AccountMerge\n\nA transaction only succeeds if the combined weight of valid signatures meets or exceeds the required threshold.',
        },
        {
          type: 'callout',
          variant: 'tip',
          content:
            'Example: An account can require 2 out of 3 executive keys to sign before a high-value payment executes. Adding an additional signer costs one base reserve (0.5 XLM) as a subentry.',
        },
      ],
    },
    {
      id: 'q2-5-quiz',
      worldId: 'world-2-wallet-kingdom',
      slug: 'wallet-kingdom-quiz',
      title: 'Quiz: Keys, Wallets & Accounts',
      description: 'Prove you can be trusted with keys, wallets, and signatures.',
      type: 'quiz',
      order: 5,
      xpReward: 100,
      estimatedMinutes: 5,
      source:
        'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts',
      content: [
        {
          id: 'q1',
          question: 'Which key should you NEVER share with anyone?',
          options: [
            { id: 'a', text: 'The public key (starts with G)', isCorrect: false },
            { id: 'b', text: 'The secret key (starts with S)', isCorrect: true },
            { id: 'c', text: 'Both keys must be shared to receive payments', isCorrect: false },
            { id: 'd', text: 'Neither — keys are always public', isCorrect: false },
          ],
          explanation:
            'The secret key (S...) signs transactions and grants full control of the account. The public key (G...) is your address and is safe to share.',
        },
        {
          id: 'q2',
          question: 'What turns a freshly generated keypair into a real account on the ledger?',
          options: [
            { id: 'a', text: 'Funding it with the minimum balance of XLM', isCorrect: true },
            { id: 'b', text: 'Posting the public key on social media', isCorrect: false },
            {
              id: 'c',
              text: 'Nothing — every keypair is automatically an account',
              isCorrect: false,
            },
            { id: 'd', text: 'Mining a block for it', isCorrect: false },
          ],
          explanation:
            'A keypair is just math until an account is created for it on-chain by funding it with XLM (via a Create Account operation, or Friendbot on testnet).',
        },
        {
          id: 'q3',
          question: 'What is the purpose of non-custodial browser wallets like Freighter?',
          options: [
            {
              id: 'a',
              text: 'To securely store secret keys and sign transactions without exposing secrets to dApps',
              isCorrect: true,
            },
            { id: 'b', text: 'To mine new XLM automatically in background tabs', isCorrect: false },
            { id: 'c', text: 'To print paper wallets on physical printers', isCorrect: false },
            { id: 'd', text: 'To reset forgotten account passwords', isCorrect: false },
          ],
          explanation:
            'Freighter keeps secret keys safely encrypted locally and signs transaction envelopes requested by dApps without exposing secret keys to web forms.',
        },
        {
          id: 'q4',
          question: 'On the testnet, how do you get free XLM to fund an account?',
          options: [
            { id: 'a', text: 'Buy it on an exchange', isCorrect: false },
            { id: 'b', text: 'Use Friendbot', isCorrect: true },
            { id: 'c', text: 'Mine it with your GPU', isCorrect: false },
            { id: 'd', text: 'You cannot fund testnet accounts', isCorrect: false },
          ],
          explanation:
            'Friendbot creates and funds testnet accounts with free test XLM. It only exists on testnet — mainnet accounts must be funded by an existing account.',
        },
        {
          id: 'q5',
          question: 'In Stellar multi-sig, when does a transaction successfully authorize?',
          options: [
            {
              id: 'a',
              text: 'When the total weight of valid signers meets or exceeds the required operation threshold',
              isCorrect: true,
            },
            {
              id: 'b',
              text: 'Only when 100% of all possible signers in the world sign',
              isCorrect: false,
            },
            { id: 'c', text: 'Whenever any random key signs', isCorrect: false },
            {
              id: 'd',
              text: 'When the Stellar Development Foundation approves it',
              isCorrect: false,
            },
          ],
          explanation:
            'Stellar multi-signature operations require signatures whose combined weights meet the operation threshold (low, medium, or high).',
        },
      ],
    },
  ],
}
