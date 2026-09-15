import type { World } from '../curriculum/types'

/**
 * World 2 — Wallet Kingdom.
 * Teaches keypairs, accounts, the minimum balance / base reserve model, and
 * how accounts are funded on testnet. Grounded in the Stellar docs:
 * https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts
 */
export const world2: World = {
  id: 'world-2-wallet-kingdom',
  slug: 'wallet-kingdom',
  title: 'Wallet Kingdom',
  subtitle: 'Guard your keys, claim your account',
  description:
    'Enter the golden halls of the Wallet Kingdom, where every citizen carries a keypair. Master accounts, keys, and the reserves that keep the realm spam-free.',
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
      title: 'The Two Keys',
      description: 'Every adventurer carries a public key and a secret key. Learn the difference.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
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
            "// Generate a fresh keypair with the Stellar SDK\nconst pair = Keypair.random();\npair.publicKey(); // \"GABC...XYZ\"  → your address (safe to share)\npair.secret();    // \"SDEF...789\"  → keep this secret!",
        },
        {
          type: 'text',
          content:
            '## How the Keys Relate\n\nThe public key is derived from the secret key using **Ed25519** cryptography — a one-way street. You can always compute the public key from the secret, but you can **never** work backwards from the public key to the secret. That math is what makes the network trustless.',
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
      title: 'The Reserve Tax',
      description: 'Why must every account hold a little XLM it can never spend?',
      type: 'lesson',
      order: 4,
      xpReward: 50,
      estimatedMinutes: 7,
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
            '## Subentries Cost Reserves\n\nEach **subentry** you add raises your minimum balance by one base reserve (0.5 XLM). Subentries include:\n- **Trustlines** (assets you hold)\n- **Offers** (open trades on the DEX)\n- Extra **signers**\n- **Data entries**\n\nAn account can hold at most **1,000 subentries**.',
        },
        {
          type: 'callout',
          variant: 'tip',
          content:
            'Example: an account with 3 trustlines needs (2 + 3) × 0.5 = **2.5 XLM** locked as reserve. Delete a trustline and that 0.5 XLM becomes spendable again.',
        },
      ],
    },
    {
      id: 'q2-5-quiz',
      worldId: 'world-2-wallet-kingdom',
      slug: 'wallet-kingdom-quiz',
      title: 'Quiz: Keys & Accounts',
      description: 'Prove you can be trusted with a keypair.',
      type: 'quiz',
      order: 5,
      xpReward: 100,
      estimatedMinutes: 5,
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
            { id: 'c', text: 'Nothing — every keypair is automatically an account', isCorrect: false },
            { id: 'd', text: 'Mining a block for it', isCorrect: false },
          ],
          explanation:
            "A keypair is just math until an account is created for it on-chain by funding it with XLM (via a Create Account operation, or Friendbot on testnet).",
        },
        {
          id: 'q3',
          question: 'What is the current base reserve on Stellar?',
          options: [
            { id: 'a', text: '1 XLM', isCorrect: false },
            { id: 'b', text: '0.5 XLM', isCorrect: true },
            { id: 'c', text: '0.00001 XLM', isCorrect: false },
            { id: 'd', text: '10 XLM', isCorrect: false },
          ],
          explanation:
            'One base reserve is currently 0.5 XLM. The minimum balance is (2 + subentries) × 0.5 XLM, so a new account needs at least 1 XLM.',
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
          question: 'Each extra subentry (like a trustline) changes your account how?',
          options: [
            { id: 'a', text: 'Raises the minimum balance by one base reserve (0.5 XLM)', isCorrect: true },
            { id: 'b', text: 'Lowers your minimum balance', isCorrect: false },
            { id: 'c', text: 'Has no effect on balance', isCorrect: false },
            { id: 'd', text: 'Deletes the account', isCorrect: false },
          ],
          explanation:
            'Every subentry (trustline, offer, signer, data entry) raises the minimum balance by one base reserve (0.5 XLM). Accounts can hold at most 1,000 subentries.',
        },
      ],
    },
  ],
}
