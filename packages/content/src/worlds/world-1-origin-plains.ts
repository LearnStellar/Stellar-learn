import type { World, Quest, Level, LessonBlock, QuizQuestion } from '../curriculum/types'

const WORLD_ID = 'world-1-origin-plains'

/**
 * Origin Plains — the tutorial world. 12 levels, 5 quests each, climbing from
 * Stellar fundamentals through Rust to Soroban smart contracts. Each lesson
 * cites its source; every fact is grounded in the official Stellar docs, the
 * Rust Book, or the Soroban docs.
 */

interface LessonArgs {
  levelId: string
  slug: string
  title: string
  description: string
  order: number
  minutes?: number
  source: string
  blocks: LessonBlock[]
}

interface QuizArgs {
  levelId: string
  slug: string
  title: string
  description: string
  order: number
  source: string
  questions: QuizQuestion[]
}

function lesson({ levelId, slug, title, description, order, minutes = 5, source, blocks }: LessonArgs): Quest {
  return {
    id: `${levelId}-q${order}-${slug}`,
    worldId: WORLD_ID,
    levelId,
    slug,
    title,
    description,
    type: 'lesson',
    order,
    xpReward: 50,
    estimatedMinutes: minutes,
    content: blocks,
    source,
  }
}

function quiz({ levelId, slug, title, description, order, source, questions }: QuizArgs): Quest {
  return {
    id: `${levelId}-q${order}-${slug}`,
    worldId: WORLD_ID,
    levelId,
    slug,
    title,
    description,
    type: 'quiz',
    order,
    xpReward: 100,
    estimatedMinutes: 5,
    content: questions,
    source,
  }
}

function level(
  n: number,
  slug: string,
  title: string,
  subtitle: string,
  description: string,
  phase: string,
  quests: Quest[]
): Level {
  return {
    id: `${WORLD_ID}-level-${n}`,
    worldId: WORLD_ID,
    slug,
    title,
    subtitle,
    description,
    phase,
    order: n,
    quests,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — The First Ledger (Stellar: blockchain fundamentals)
// ────────────────────────────────────────────────────────────────────────────

const L1 = `${WORLD_ID}-level-1`
const level1 = level(1, '1', 'The First Ledger', 'Where every journey begins', 'A shared book no one can rewrite. Learn what a blockchain is, how records are chained, and why it needs no middleman.', 'Stellar', [
  lesson({
    levelId: L1, slug: 'what-is-a-blockchain', title: 'What Is a Blockchain?',
    description: 'The ancient ledger magic that powers the digital realm.',
    order: 1, source: 'https://developers.stellar.org/docs/learn/fundamentals',
    blocks: [
      { type: 'text', content: '## The Magic Ledger\n\nImagine a magical book that thousands of wizards all share. When anyone writes in it, **every wizard gets the same update instantly** — and no single wizard can erase or change what was written. That shared book is called a **blockchain**.' },
      { type: 'callout', variant: 'info', content: '**Blockchain** = a chain of records (called *blocks* or *ledgers*) shared across many computers (nodes) so no single person controls it.' },
      { type: 'text', content: '## Why It Matters\n\nTraditional banking makes you *trust* a bank to keep your records. A blockchain removes that need — the math and cryptography do the trusting for you. This is called being **trustless**: trust the code, not the company.' },
    ],
  }),
  lesson({
    levelId: L1, slug: 'blocks-and-hashes', title: 'Blocks, Hashes & Chains',
    description: 'How one record links to the next, making tampering obvious.',
    order: 2, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/ledgers',
    blocks: [
      { type: 'text', content: '## How Records Are Chained\n\nEach block (Stellar calls them **ledgers**) contains:\n- A list of recent transactions\n- A **hash** — a fingerprint of the previous block\n- A timestamp\n\nBecause each block points to the one before it, changing any old block would break every block after it. Tampering becomes obvious and effectively impossible.' },
      { type: 'callout', variant: 'tip', content: 'A **hash** is a one-way function: same input always gives the same fingerprint, but you can never work backwards from the fingerprint to the input.' },
    ],
  }),
  lesson({
    levelId: L1, slug: 'decentralized-and-trustless', title: 'Decentralized & Trustless',
    description: 'No owner, no gatekeeper — the ledger is held by everyone.',
    order: 3, source: 'https://developers.stellar.org/docs/learn/fundamentals',
    blocks: [
      { type: 'text', content: '## No Single Owner\n\nA **decentralized** network has no central company, government, or person in charge. Copies of the ledger live on thousands of independent **nodes**, and they must agree on the truth together.' },
      { type: 'callout', variant: 'tip', content: '**Trustless** means you do not need to trust any individual participant — the protocol rules are enforced by code and cryptography.' },
    ],
  }),
  lesson({
    levelId: L1, slug: 'ledgers-in-stellar', title: 'Ledgers in Stellar',
    description: 'Stellar closes a fresh ledger every few seconds.',
    order: 4, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/ledgers',
    blocks: [
      { type: 'text', content: '## A Ledger Every ~5 Seconds\n\nStellar\'s ledger is its block. The network agrees on a new ledger roughly every **5 seconds**, each holding a batch of transactions. This steady heartbeat is what lets Stellar settle payments so fast.' },
      { type: 'callout', variant: 'info', content: 'Compare: Bitcoin confirms a block roughly every **10 minutes**; Stellar closes a ledger every **~5 seconds**.' },
    ],
  }),
  quiz({
    levelId: L1, slug: 'level-1-quiz', title: 'Quiz: The First Ledger',
    description: 'Prove you understand ledgers, hashes, and decentralization.',
    order: 5, source: 'https://developers.stellar.org/docs/learn/fundamentals',
    questions: [
      { id: 'q1', question: 'What makes a blockchain "trustless"?', options: [
        { id: 'a', text: 'Math and code enforce the rules — you trust no single party', isCorrect: true },
        { id: 'b', text: 'A government guarantees every transaction', isCorrect: false },
        { id: 'c', text: 'Only verified banks may participate', isCorrect: false },
        { id: 'd', text: 'Every record requires manual approval', isCorrect: false },
      ], explanation: 'Trustless means the protocol rules are enforced by code and cryptography, so no human or organization needs to be trusted.' },
      { id: 'q2', question: 'What links one block to the next in a chain?', options: [
        { id: 'a', text: 'A hash (fingerprint) of the previous block', isCorrect: true },
        { id: 'b', text: 'The timestamp alone', isCorrect: false },
        { id: 'c', text: 'A central database pointer', isCorrect: false },
        { id: 'd', text: 'The miner\'s username', isCorrect: false },
      ], explanation: 'Each block stores the hash of the previous block, chaining them so any tampering breaks the whole chain.' },
      { id: 'q3', question: 'How often does Stellar close a new ledger?', options: [
        { id: 'a', text: 'About every 5 seconds', isCorrect: true },
        { id: 'b', text: 'About every 10 minutes', isCorrect: false },
        { id: 'c', text: 'Once per hour', isCorrect: false },
        { id: 'd', text: 'Once per day', isCorrect: false },
      ], explanation: 'Stellar closes a new ledger roughly every 5 seconds — far faster than Bitcoin\'s ~10-minute blocks.' },
      { id: 'q4', question: '"Decentralized" means…', options: [
        { id: 'a', text: 'No single company, government, or person controls the network', isCorrect: true },
        { id: 'b', text: 'One central server holds the ledger', isCorrect: false },
        { id: 'c', text: 'All nodes run on one cloud provider', isCorrect: false },
        { id: 'd', text: 'A single administrator approves changes', isCorrect: false },
      ], explanation: 'Decentralization means the ledger is maintained by many independent nodes with no central owner.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — Enter the Stellar Realm (Stellar & XLM)
// ────────────────────────────────────────────────────────────────────────────

const L2 = `${WORLD_ID}-level-2`
const level2 = level(2, '2', 'Enter the Stellar Realm', 'Money at the speed of light', 'What makes Stellar different — and the currency, XLM, that powers every account on the network.', 'Stellar', [
  lesson({
    levelId: L2, slug: 'what-is-stellar', title: 'What Is Stellar?',
    description: 'Meet the network built to move money across borders.',
    order: 1, source: 'https://developers.stellar.org/docs/learn/fundamentals',
    blocks: [
      { type: 'text', content: '## The Stellar Realm\n\nNot all blockchains are alike. Stellar was built with one clear mission: **move money cheaply, quickly, and across borders**. It settles a transaction in **3–5 seconds** for a fee of a tiny fraction of a cent.' },
      { type: 'callout', variant: 'info', content: 'Stellar connects banks, payment systems, and people onto one shared ledger — think of it as a public payment network.' },
    ],
  }),
  lesson({
    levelId: L2, slug: 'lumens-and-their-jobs', title: 'Lumens (XLM) & Their Jobs',
    description: 'The currency that keeps the realm alive.',
    order: 2, source: 'https://developers.stellar.org/docs/learn/fundamentals/lumens',
    blocks: [
      { type: 'text', content: '## Lumens (XLM)\n\nStellar\'s native currency is **XLM** (Lumens). It has three jobs:\n1. **Pay transaction fees** — tiny fractions of XLM per transaction\n2. **Minimum account balance** — each account must hold at least 1 XLM to exist\n3. **Bridge currency** — XLM can act as the middle step when swapping two other assets' },
      { type: 'callout', variant: 'info', content: 'The minimum account balance is **1 XLM** (2 base reserves × 0.5 XLM) — a security deposit that keeps spam accounts off the network.' },
    ],
  }),
  lesson({
    levelId: L2, slug: 'stellar-vs-others', title: 'Stellar vs Bitcoin & Ethereum',
    description: 'Speed, cost, and purpose — how the chains differ.',
    order: 3, source: 'https://developers.stellar.org/docs/learn/fundamentals/lumens',
    blocks: [
      { type: 'text', content: '## A Different Kind of Beast\n\n| | XLM | Bitcoin |\n|---|---|---|\n| Speed | ~5 seconds | ~10 minutes |\n| Fee | ~$0.00001 | ~$1–$50 |\n| Purpose | Payments | Store of value |\n| Energy | Minimal | Enormous (mining) |\n\nStellar does not mine. It reaches agreement through voting, not energy-hungry computation.' },
    ],
  }),
  lesson({
    levelId: L2, slug: 'the-sdf', title: 'The Stellar Development Foundation',
    description: 'The non-profit that shepherds the network.',
    order: 4, source: 'https://developers.stellar.org/docs/learn/fundamentals',
    blocks: [
      { type: 'text', content: '## Who Maintains Stellar?\n\nStellar was created in **2014** by **Jed McCaleb** (a co-founder of Ripple) and **Joyce Kim**. It is maintained by the **Stellar Development Foundation (SDF)** — a non-profit organization supporting the open-source protocol and its ecosystem.' },
      { type: 'callout', variant: 'tip', content: 'USDC — one of the world\'s largest stablecoins — runs on Stellar. Billions of dollars flow through Stellar daily.' },
    ],
  }),
  quiz({
    levelId: L2, slug: 'level-2-quiz', title: 'Quiz: The Stellar Realm',
    description: 'Test what you know about Stellar and XLM.',
    order: 5, source: 'https://developers.stellar.org/docs/learn/fundamentals/lumens',
    questions: [
      { id: 'q1', question: 'What are the three jobs of XLM?', options: [
        { id: 'a', text: 'Fees, minimum balance, and bridge currency', isCorrect: true },
        { id: 'b', text: 'Mining, staking, and governance', isCorrect: false },
        { id: 'c', text: 'Storage, compute, and identity', isCorrect: false },
        { id: 'd', text: 'Lending, borrowing, and collateral', isCorrect: false },
      ], explanation: 'XLM pays fees, enforces the 1 XLM minimum balance, and bridges between assets during swaps.' },
      { id: 'q2', question: 'How long does a Stellar transaction take to finalize?', options: [
        { id: 'a', text: '3–5 seconds', isCorrect: true },
        { id: 'b', text: '~10 minutes', isCorrect: false },
        { id: 'c', text: '~1 hour', isCorrect: false },
        { id: 'd', text: '~30 seconds', isCorrect: false },
      ], explanation: 'Stellar reaches finality in 3–5 seconds thanks to its consensus protocol.' },
      { id: 'q3', question: 'Which organization maintains the Stellar network?', options: [
        { id: 'a', text: 'The Stellar Development Foundation (SDF)', isCorrect: true },
        { id: 'b', text: 'Google', isCorrect: false },
        { id: 'c', text: 'The US Federal Reserve', isCorrect: false },
        { id: 'd', text: 'Jed McCaleb personally', isCorrect: false },
      ], explanation: 'The SDF, a non-profit, maintains Stellar\'s core software and ecosystem.' },
      { id: 'q4', question: 'What is the minimum balance a Stellar account must hold?', options: [
        { id: 'a', text: '1 XLM', isCorrect: true },
        { id: 'b', text: '0 XLM', isCorrect: false },
        { id: 'c', text: '100 XLM', isCorrect: false },
        { id: 'd', text: '10 XLM', isCorrect: false },
      ], explanation: 'A fresh account must hold at least 1 XLM (2 × the 0.5 XLM base reserve).' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 3 — The Council of Agreement (SCP / consensus)
// ────────────────────────────────────────────────────────────────────────────

const L3 = `${WORLD_ID}-level-3`
const level3 = level(3, '3', 'The Council of Agreement', 'How the realm decides what is true', 'Thousands of nodes share the ledger — but how do they agree? Meet the Stellar Consensus Protocol and its council of quorum slices.', 'Stellar', [
  lesson({
    levelId: L3, slug: 'the-consensus-problem', title: 'The Consensus Problem',
    description: 'How do thousands of computers agree on one truth?',
    order: 1, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-consensus-protocol',
    blocks: [
      { type: 'text', content: '## Who Is Right?\n\nIf thousands of computers share a ledger, they must agree on what happened — the **consensus problem**.\n\n- **Bitcoin\'s answer:** whoever burns the most computation wins (Proof of Work — slow, energy-hungry).\n- **Stellar\'s answer:** a council of trusted nodes **votes** — the **Stellar Consensus Protocol (SCP)**.' },
    ],
  }),
  lesson({
    levelId: L3, slug: 'the-scp', title: 'Stellar Consensus Protocol (SCP)',
    description: 'Agreement by voting, not mining.',
    order: 2, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-consensus-protocol',
    blocks: [
      { type: 'text', content: '## The SCP\n\nSCP uses **Federated Byzantine Agreement (FBA)**. Instead of mining, nodes reach agreement through voting rounds. Because there is no mining, finality comes in seconds and uses almost no energy.' },
      { type: 'callout', variant: 'info', content: 'SCP = the algorithm that lets Stellar nodes agree on the ledger state without Proof of Work.' },
    ],
  }),
  lesson({
    levelId: L3, slug: 'quorum-slices', title: 'Quorum Slices & Federated Voting',
    description: 'Overlapping circles of trust.',
    order: 3, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-consensus-protocol',
    blocks: [
      { type: 'text', content: '## The Council Analogy\n\nImagine 1,000 wizards in guilds. Each guild trusts certain other guilds (its **quorum slice**). When a transaction happens:\n1. Your guild votes on it\n2. It checks with the guilds it trusts\n3. When enough overlapping guilds agree → the transaction is confirmed\n\nTrust circles overlap, so the network converges on one truth.' },
    ],
  }),
  lesson({
    levelId: L3, slug: 'safety-and-liveness', title: 'Safety, Liveness & Finality',
    description: 'What keeps the network correct and moving.',
    order: 4, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-consensus-protocol',
    blocks: [
      { type: 'text', content: '## Two Guarantees\n\n- **Safety** — the network never confirms two conflicting histories. Once agreed, a ledger is final.\n- **Liveness** — the network keeps making progress; it does not deadlock waiting forever.\n\nTogether they mean Stellar is both *correct* and *fast*.' },
    ],
  }),
  quiz({
    levelId: L3, slug: 'level-3-quiz', title: 'Quiz: The Council of Agreement',
    description: 'Show you understand consensus and quorum slices.',
    order: 5, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-consensus-protocol',
    questions: [
      { id: 'q1', question: 'What does SCP stand for?', options: [
        { id: 'a', text: 'Stellar Consensus Protocol', isCorrect: true },
        { id: 'b', text: 'Secure Chain Protocol', isCorrect: false },
        { id: 'c', text: 'Stellar Computing Program', isCorrect: false },
        { id: 'd', text: 'Synchronized Consensus Proof', isCorrect: false },
      ], explanation: 'SCP — Stellar Consensus Protocol — is Stellar\'s mining-free agreement algorithm.' },
      { id: 'q2', question: 'What is a quorum slice?', options: [
        { id: 'a', text: 'The set of other nodes a node chooses to trust', isCorrect: true },
        { id: 'b', text: 'A block reward', isCorrect: false },
        { id: 'c', text: 'A type of transaction', isCorrect: false },
        { id: 'd', text: 'A hardware wallet', isCorrect: false },
      ], explanation: 'A quorum slice is the set of nodes a given node trusts; overlapping slices let the network converge.' },
      { id: 'q3', question: 'How does Stellar reach agreement?', options: [
        { id: 'a', text: 'Federated voting between trusted nodes', isCorrect: true },
        { id: 'b', text: 'Proof of Work mining', isCorrect: false },
        { id: 'c', text: 'A single central server', isCorrect: false },
        { id: 'd', text: 'Proof of Stake staking', isCorrect: false },
      ], explanation: 'Stellar uses Federated Byzantine Agreement — voting between nodes with overlapping trust.' },
      { id: 'q4', question: '"Safety" in consensus means…', options: [
        { id: 'a', text: 'The network never confirms two conflicting histories', isCorrect: true },
        { id: 'b', text: 'No one can ever lose money', isCorrect: false },
        { id: 'c', text: 'All nodes are always online', isCorrect: false },
        { id: 'd', text: 'Transactions are encrypted', isCorrect: false },
      ], explanation: 'Safety means once a ledger is agreed it is final — the network cannot fork into conflicting truths.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 4 — Keys & Accounts (accounts / keypairs)
// ────────────────────────────────────────────────────────────────────────────

const L4 = `${WORLD_ID}-level-4`
const level4 = level(4, '4', 'Keys & Accounts', 'Guard your keys, claim your account', 'Accounts, keypairs, sequence numbers, and the reserves every Stellar account lives by.', 'Stellar', [
  lesson({
    levelId: L4, slug: 'public-and-secret-keys', title: 'Public & Secret Keys',
    description: 'The two keys every adventurer carries.',
    order: 1, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts',
    blocks: [
      { type: 'text', content: '## A Pair of Keys\n\nTo do anything on Stellar you need a **keypair**:\n- A **public key** starts with **G** (e.g. GABC…XYZ). It *is* your account address. Share it freely.\n- A **secret key** starts with **S** (e.g. SDEF…789). It signs your transactions. **Never share it.**' },
      { type: 'callout', variant: 'warning', content: '**Anyone with your secret key controls your account.** There is no password reset and no support line. Guard it like the crown jewels.' },
    ],
  }),
  lesson({
    levelId: L4, slug: 'accounts-and-minimum-balance', title: 'Accounts & the Minimum Balance',
    description: 'Why every account must lock away a little XLM.',
    order: 2, source: 'https://developers.stellar.org/docs/learn/fundamentals/lumens',
    blocks: [
      { type: 'text', content: '## The Reserve Tax\n\nEvery Stellar account must keep a **minimum balance** of XLM it cannot spend. It stops spammers from bloating the ledger. The unit is the **base reserve** — currently **0.5 XLM**.' },
      { type: 'callout', variant: 'info', content: 'Minimum balance = **(2 + number of subentries) × base reserve**. A fresh account = 2 × 0.5 = **1 XLM**.' },
    ],
  }),
  lesson({
    levelId: L4, slug: 'sequence-numbers', title: 'Sequence Numbers',
    description: 'The counter that keeps transactions ordered.',
    order: 3, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts',
    blocks: [
      { type: 'text', content: '## One Number, Strict Order\n\nEvery account keeps a **sequence number**. Each transaction must reference the next number in line, and it increments by one each time. This prevents **replay attacks** — a copied transaction cannot be re-submitted.' },
    ],
  }),
  lesson({
    levelId: L4, slug: 'funding-on-testnet', title: 'Funding on Testnet (Friendbot)',
    description: 'Free test XLM to practice without risk.',
    order: 4, source: 'https://developers.stellar.org/docs/learn/fundamentals/networks',
    blocks: [
      { type: 'text', content: '## Play Money, Real Network\n\nStellar has a **testnet** — a live network with worthless XLM. A friendly bot called **Friendbot** will fund any testnet account for free, so you can create accounts and send payments without spending a cent.' },
      { type: 'callout', variant: 'tip', content: 'All practice in Stellar Learn happens on **testnet**. Mainnet operations are never performed unless explicitly configured.' },
    ],
  }),
  quiz({
    levelId: L4, slug: 'level-4-quiz', title: 'Quiz: Keys & Accounts',
    description: 'Prove you understand keypairs, reserves, and sequence numbers.',
    order: 5, source: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts',
    questions: [
      { id: 'q1', question: 'Which key is safe to share publicly?', options: [
        { id: 'a', text: 'The public key (starts with G)', isCorrect: true },
        { id: 'b', text: 'The secret key (starts with S)', isCorrect: false },
        { id: 'c', text: 'Both are safe to share', isCorrect: false },
        { id: 'd', text: 'Neither is ever safe to share', isCorrect: false },
      ], explanation: 'The public key is your address — share it freely. The secret key signs transactions and must stay private.' },
      { id: 'q2', question: 'What is a sequence number for?', options: [
        { id: 'a', text: 'Ordering transactions and preventing replay attacks', isCorrect: true },
        { id: 'b', text: 'Showing how many XLM you hold', isCorrect: false },
        { id: 'c', text: 'A password to log in', isCorrect: false },
        { id: 'd', text: 'Your account\'s public address', isCorrect: false },
      ], explanation: 'Each transaction must reference the next sequence number, preventing replayed transactions.' },
      { id: 'q3', question: 'What is the minimum balance of a fresh account?', options: [
        { id: 'a', text: '1 XLM', isCorrect: true },
        { id: 'b', text: '0.5 XLM', isCorrect: false },
        { id: 'c', text: '5 XLM', isCorrect: false },
        { id: 'd', text: '0 XLM', isCorrect: false },
      ], explanation: '2 base reserves × 0.5 XLM = 1 XLM minimum for a fresh account.' },
      { id: 'q4', question: 'What is Friendbot?', options: [
        { id: 'a', text: 'A bot that funds testnet accounts with free test XLM', isCorrect: true },
        { id: 'b', text: 'A wallet for mainnet', isCorrect: false },
        { id: 'c', text: 'A consensus node', isCorrect: false },
        { id: 'd', text: 'A kind of smart contract', isCorrect: false },
      ], explanation: 'Friendbot funds testnet accounts so you can practice for free.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 5 — The Forge Awakens: Rust Basics
// ────────────────────────────────────────────────────────────────────────────

const L5 = `${WORLD_ID}-level-5`
const level5 = level(5, '5', 'The Forge Awakens: Rust Basics', 'The language Soroban speaks', 'Soroban contracts are written in Rust. Learn why Rust, then its variables, types, and functions.', 'Rust', [
  lesson({
    levelId: L5, slug: 'why-rust', title: 'Why Rust?',
    description: 'The language powering Soroban smart contracts.',
    order: 1, source: 'https://doc.rust-lang.org/book/ch00-00-introduction.html',
    blocks: [
      { type: 'text', content: '## Safety & Speed\n\nSoroban smart contracts are written in **Rust**. Rust gives you **memory safety without a garbage collector** — it catches whole classes of bugs at compile time, which is exactly what you want when your code manages other people\'s money.' },
      { type: 'callout', variant: 'info', content: 'Rust\'s compiler is famously strict: if it compiles, whole categories of memory bugs are already impossible.' },
    ],
  }),
  lesson({
    levelId: L5, slug: 'variables-and-mutability', title: 'Variables & Mutability',
    description: 'Rust variables are immutable by default.',
    order: 2, source: 'https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'let x = 5;        // immutable — cannot be changed\nlet mut y = 5;    // mutable — can be reassigned\ny = y + 1;        // ok\n// x = x + 1;      // error: cannot assign to immutable variable' },
      { type: 'text', content: 'In Rust, **variables are immutable by default**. Use the `mut` keyword to make one reassignable. This default nudges you toward safer code.' },
    ],
  }),
  lesson({
    levelId: L5, slug: 'data-types', title: 'Data Types',
    description: 'Numbers, booleans, and strings.',
    order: 3, source: 'https://doc.rust-lang.org/book/ch03-02-data-types.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'let count: u32 = 42;      // unsigned 32-bit integer\nlet balance: i64 = -5;    // signed 64-bit integer\nlet active: bool = true;  // boolean\nlet name: &str = "Stellar"; // string slice' },
      { type: 'callout', variant: 'tip', content: 'Rust is **statically typed** — the compiler knows every variable\'s type, catching type errors before you run anything.' },
    ],
  }),
  lesson({
    levelId: L5, slug: 'functions', title: 'Functions',
    description: 'Named blocks of reusable logic.',
    order: 4, source: 'https://doc.rust-lang.org/book/ch03-03-how-functions-work.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'fn add(a: u32, b: u32) -> u32 {\n    a + b   // the last expression is returned\n}\n\nfn main() {\n    let sum = add(2, 3);\n}' },
      { type: 'text', content: 'Rust functions declare parameter and return types explicitly with `->`. The **last expression** (no semicolon) is the return value.' },
    ],
  }),
  quiz({
    levelId: L5, slug: 'level-5-quiz', title: 'Quiz: Rust Basics',
    description: 'Test the foundations of Rust syntax.',
    order: 5, source: 'https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html',
    questions: [
      { id: 'q1', question: 'In Rust, variables are…', options: [
        { id: 'a', text: 'Immutable by default', isCorrect: true },
        { id: 'b', text: 'Mutable by default', isCorrect: false },
        { id: 'c', text: 'Always constants', isCorrect: false },
        { id: 'd', text: 'Dynamically typed', isCorrect: false },
      ], explanation: 'Rust variables are immutable by default; add `mut` to make one reassignable.' },
      { id: 'q2', question: 'Which keyword makes a variable reassignable?', options: [
        { id: 'a', text: 'mut', isCorrect: true },
        { id: 'b', text: 'var', isCorrect: false },
        { id: 'c', text: 'let', isCorrect: false },
        { id: 'd', text: 'static', isCorrect: false },
      ], explanation: '`let mut x = 5;` creates a mutable binding.' },
      { id: 'q3', question: 'Why is Rust a good fit for smart contracts?', options: [
        { id: 'a', text: 'Memory safety without a garbage collector', isCorrect: true },
        { id: 'b', text: 'It runs only in browsers', isCorrect: false },
        { id: 'c', text: 'It has no type system', isCorrect: false },
        { id: 'd', text: 'It requires a virtual machine', isCorrect: false },
      ], explanation: 'Rust\'s compile-time checks eliminate memory bugs, crucial for code that handles value.' },
      { id: 'q4', question: 'What type would you use for a signed 64-bit integer?', options: [
        { id: 'a', text: 'i64', isCorrect: true },
        { id: 'b', text: 'u32', isCorrect: false },
        { id: 'c', text: 'f64', isCorrect: false },
        { id: 'd', text: 'bool', isCorrect: false },
      ], explanation: '`i64` is a signed 64-bit integer; `u32` is unsigned, `f64` is a float.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 6 — Ownership & Borrowing (Rust's memory model)
// ────────────────────────────────────────────────────────────────────────────

const L6 = `${WORLD_ID}-level-6`
const level6 = level(6, '6', 'Ownership & Borrowing', "Rust's greatest spell", 'The rules that keep Rust memory-safe without a garbage collector: ownership, moves, and borrowing.', 'Rust', [
  lesson({
    levelId: L6, slug: 'the-ownership-rules', title: 'The Ownership Rules',
    description: 'Three rules that govern every value.',
    order: 1, source: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
    blocks: [
      { type: 'text', content: '## Three Simple Rules\n\n1. Each value in Rust has a single **owner**.\n2. There can only be **one owner** at a time.\n3. When the owner goes out of scope, the value is **dropped** (freed).\n\nThese rules are enforced at compile time — no runtime garbage collector needed.' },
    ],
  }),
  lesson({
    levelId: L6, slug: 'moves-and-copies', title: 'Moves & Copies',
    description: 'Passing a value hands over ownership.',
    order: 2, source: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'let s1 = String::from("hello");\nlet s2 = s1;  // s1 is MOVED into s2 — s1 is now invalid\n\nlet n = 5;\nlet m = n;    // n is COPIED (integers are cheap to copy)' },
      { type: 'text', content: 'Assigning a `String` **moves** ownership — the old variable is unusable. Simple types like integers **copy** instead, because they are cheap to duplicate.' },
    ],
  }),
  lesson({
    levelId: L6, slug: 'references-and-borrowing', title: 'References & Borrowing',
    description: 'Lend a value without giving it away.',
    order: 3, source: 'https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'fn length(s: &String) -> usize {\n    s.len()   // borrows s — does not take ownership\n}\n\nlet s = String::from("hello");\nlet n = length(&s);   // &s is a reference\nprintln!("{}", s);     // s is still valid!' },
      { type: 'text', content: 'A **reference** (`&`) lets a function *borrow* a value without taking ownership, so the original stays usable.' },
    ],
  }),
  lesson({
    levelId: L6, slug: 'the-borrow-checker', title: 'The Borrow Checker',
    description: 'The guardian that rejects unsafe code at compile time.',
    order: 4, source: 'https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html',
    blocks: [
      { type: 'text', content: '## Mutable vs Immutable Borrows\n\nAt any time you can have **either** one mutable reference **or** any number of immutable references — never both. The **borrow checker** enforces this, preventing data races before your code even runs.' },
      { type: 'callout', variant: 'tip', content: 'Rust\'s biggest superpower: whole classes of concurrency bugs become compile errors instead of runtime crashes.' },
    ],
  }),
  quiz({
    levelId: L6, slug: 'level-6-quiz', title: 'Quiz: Ownership & Borrowing',
    description: 'Prove you understand moves, copies, and borrows.',
    order: 5, source: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
    questions: [
      { id: 'q1', question: 'How many owners can a Rust value have at one time?', options: [
        { id: 'a', text: 'Exactly one', isCorrect: true },
        { id: 'b', text: 'As many as you want', isCorrect: false },
        { id: 'c', text: 'Two', isCorrect: false },
        { id: 'd', text: 'Zero', isCorrect: false },
      ], explanation: 'Rust\'s ownership model allows exactly one owner at a time.' },
      { id: 'q2', question: 'After `let s2 = s1;` where both are Strings, what is true?', options: [
        { id: 'a', text: 's1 is moved and can no longer be used', isCorrect: true },
        { id: 'b', text: 's1 and s2 both reference the same memory safely', isCorrect: false },
        { id: 'c', text: 's2 is a copy of s1', isCorrect: false },
        { id: 'd', text: 'Nothing happens', isCorrect: false },
      ], explanation: 'Strings are moved, not copied — ownership transfers to s2 and s1 becomes invalid.' },
      { id: 'q3', question: 'What is a reference (`&`) in Rust?', options: [
        { id: 'a', text: 'A borrow that does not take ownership', isCorrect: true },
        { id: 'b', text: 'A copy of the value', isCorrect: false },
        { id: 'c', text: 'A new owner', isCorrect: false },
        { id: 'd', text: 'A pointer that always mutates', isCorrect: false },
      ], explanation: 'A reference lets you borrow a value without taking ownership.' },
      { id: 'q4', question: 'The borrow checker prevents…', options: [
        { id: 'a', text: 'Data races and use-after-free bugs', isCorrect: true },
        { id: 'b', text: 'All runtime errors', isCorrect: false },
        { id: 'c', text: 'Slow code', isCorrect: false },
        { id: 'd', text: 'Compiling on Windows', isCorrect: false },
      ], explanation: 'The borrow checker eliminates data races and dangling references at compile time.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 7 — Data & Enums (structs, enums, collections)
// ────────────────────────────────────────────────────────────────────────────

const L7 = `${WORLD_ID}-level-7`
const level7 = level(7, '7', 'Data & Enums', 'Shaping the realm', 'Model real data in Rust: structs, enums, Option/Result, and vectors — the building blocks of every contract.', 'Rust', [
  lesson({
    levelId: L7, slug: 'structs', title: 'Structs',
    description: 'Bundle related data into one type.',
    order: 1, source: 'https://doc.rust-lang.org/book/ch05-01-defining-structs.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'struct Account {\n    owner: String,\n    balance: i64,\n}\n\nlet acc = Account { owner: "GABC...".into(), balance: 100 };' },
      { type: 'text', content: 'A **struct** groups related fields into one named type — like an object in other languages.' },
    ],
  }),
  lesson({
    levelId: L7, slug: 'enums', title: 'Enums',
    description: 'A type that is one of several variants.',
    order: 2, source: 'https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'enum AssetKind {\n    Native,\n    Credit { code: String },\n}\n\nlet xlm = AssetKind::Native;' },
      { type: 'text', content: 'An **enum** describes a value that is one of a fixed set of variants, each of which can carry its own data.' },
    ],
  }),
  lesson({
    levelId: L7, slug: 'option-and-result', title: 'Option & Result',
    description: 'Rust\'s tools for "maybe" and "might fail".',
    order: 3, source: 'https://doc.rust-lang.org/book/ch06-02-match.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'let maybe: Option<u32> = Some(42);\nlet none: Option<u32> = None;\n\nlet ok: Result<u32, String> = Ok(42);\nlet err: Result<u32, String> = Err("failed".into());' },
      { type: 'text', content: '**Option** (`Some`/`None`) represents a value that may be absent. **Result** (`Ok`/`Err`) represents success or failure. Both force you to handle every case.' },
    ],
  }),
  lesson({
    levelId: L7, slug: 'vectors', title: 'Vectors & Collections',
    description: 'Growable lists of values.',
    order: 4, source: 'https://doc.rust-lang.org/book/ch08-01-vectors.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'let mut nums: Vec<u32> = Vec::new();\nnums.push(1);\nnums.push(2);\n\nfor n in &nums {\n    println!("{n}");\n}' },
      { type: 'text', content: 'A **Vec** (vector) is a growable array. Iterate with `for … in` and borrow with `&`.' },
    ],
  }),
  quiz({
    levelId: L7, slug: 'level-7-quiz', title: 'Quiz: Data & Enums',
    description: 'Test structs, enums, Option, Result, and vectors.',
    order: 5, source: 'https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html',
    questions: [
      { id: 'q1', question: 'What does a struct do?', options: [
        { id: 'a', text: 'Groups related fields into one named type', isCorrect: true },
        { id: 'b', text: 'Runs code in parallel', isCorrect: false },
        { id: 'c', text: 'Handles errors', isCorrect: false },
        { id: 'd', text: 'Allocates memory only', isCorrect: false },
      ], explanation: 'A struct bundles related data fields into a single named type.' },
      { id: 'q2', question: 'What does Option<T> represent?', options: [
        { id: 'a', text: 'A value that may or may not be present (Some/None)', isCorrect: true },
        { id: 'b', text: 'A value that is always present', isCorrect: false },
        { id: 'c', text: 'A network error', isCorrect: false },
        { id: 'd', text: 'An infinite loop', isCorrect: false },
      ], explanation: 'Option is either Some(value) or None — a "maybe" value.' },
      { id: 'q3', question: 'What does Result<T, E> represent?', options: [
        { id: 'a', text: 'Success (Ok) or failure (Err)', isCorrect: true },
        { id: 'b', text: 'Only success', isCorrect: false },
        { id: 'c', text: 'A list of items', isCorrect: false },
        { id: 'd', text: 'A random number', isCorrect: false },
      ], explanation: 'Result is either Ok(value) or Err(error), forcing explicit error handling.' },
      { id: 'q4', question: 'Which type is a growable list in Rust?', options: [
        { id: 'a', text: 'Vec<T>', isCorrect: true },
        { id: 'b', text: 'String only', isCorrect: false },
        { id: 'c', text: 'Option<T>', isCorrect: false },
        { id: 'd', text: 'i32', isCorrect: false },
      ], explanation: 'Vec<T> is a growable, heap-allocated list.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 8 — Traits, Errors & Modules (Rust building blocks)
// ────────────────────────────────────────────────────────────────────────────

const L8 = `${WORLD_ID}-level-8`
const level8 = level(8, '8', 'Traits, Errors & Modules', 'Composing bigger spells', 'Share behavior with traits, handle failure with Result, and organize code into crates and modules.', 'Rust', [
  lesson({
    levelId: L8, slug: 'traits', title: 'Traits & impl',
    description: 'Shared behavior across types.',
    order: 1, source: 'https://doc.rust-lang.org/book/ch10-02-traits.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'trait Describe {\n    fn describe(&self) -> String;\n}\n\nimpl Describe for Account {\n    fn describe(&self) -> String {\n        format!("account with balance {}", self.balance)\n    }\n}' },
      { type: 'text', content: 'A **trait** declares shared behavior; an **impl** block provides it for a specific type. Traits are Rust\'s version of interfaces.' },
    ],
  }),
  lesson({
    levelId: L8, slug: 'generics', title: 'Generics',
    description: 'Write once, work with many types.',
    order: 2, source: 'https://doc.rust-lang.org/book/ch10-01-syntax.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'fn first<T>(items: &[T]) -> Option<&T> {\n    items.first()\n}\n\n// first works for &[u32], &[String], &[Account], ...' },
      { type: 'text', content: '**Generics** let a function or type work over many types without duplicating code, while the compiler still checks every use.' },
    ],
  }),
  lesson({
    levelId: L8, slug: 'error-handling', title: 'Error Handling (Result & ?)',
    description: 'Fail loudly and safely.',
    order: 3, source: 'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html',
    blocks: [
      { type: 'code', language: 'rust', content: 'fn load_account(id: &str) -> Result<Account, String> {\n    let acc = lookup(id)?;  // ? returns the Err early if lookup fails\n    Ok(acc)\n}' },
      { type: 'text', content: 'The `?` operator unwraps a `Result`, returning the error early on failure. It keeps error handling terse but explicit — no silent failures.' },
    ],
  }),
  lesson({
    levelId: L8, slug: 'crates-and-modules', title: 'Crates & Modules',
    description: 'Organizing code as projects grow.',
    order: 4, source: 'https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html',
    blocks: [
      { type: 'text', content: '## Crates & Modules\n\n- A **crate** is a Rust package (a library or binary).\n- **Modules** (`mod`) organize code inside a crate.\n- Soroban contracts are built as a **library crate** targeting `wasm32-unknown-unknown`.' },
      { type: 'callout', variant: 'tip', content: 'Your Soroban contract is a crate; the `soroban-sdk` is a dependency you import with `use`.' },
    ],
  }),
  quiz({
    levelId: L8, slug: 'level-8-quiz', title: 'Quiz: Traits, Errors & Modules',
    description: 'Test traits, generics, error handling, and crates.',
    order: 5, source: 'https://doc.rust-lang.org/book/ch10-02-traits.html',
    questions: [
      { id: 'q1', question: 'What is a trait in Rust?', options: [
        { id: 'a', text: 'Shared behavior implemented by many types', isCorrect: true },
        { id: 'b', text: 'A kind of struct', isCorrect: false },
        { id: 'c', text: 'A build script', isCorrect: false },
        { id: 'd', text: 'A memory allocator', isCorrect: false },
      ], explanation: 'A trait declares shared behavior; types implement it with `impl`.', },
      { id: 'q2', question: 'What does the `?` operator do?', options: [
        { id: 'a', text: 'Unwraps a Result, returning the Err early', isCorrect: true },
        { id: 'b', text: 'Panics immediately', isCorrect: false },
        { id: 'c', text: 'Ignores errors silently', isCorrect: false },
        { id: 'd', text: 'Creates a new thread', isCorrect: false },
      ], explanation: '`?` propagates errors: on Err it returns early; on Ok it yields the value.' },
      { id: 'q3', question: 'What is a crate?', options: [
        { id: 'a', text: 'A Rust package — a library or binary', isCorrect: true },
        { id: 'b', text: 'A test framework', isCorrect: false },
        { id: 'c', text: 'A type of error', isCorrect: false },
        { id: 'd', text: 'A syntax keyword', isCorrect: false },
      ], explanation: 'A crate is the unit of compilation — a library or binary package.' },
      { id: 'q4', question: 'Why use generics?', options: [
        { id: 'a', text: 'Write code that works over many types without duplication', isCorrect: true },
        { id: 'b', text: 'To make code run slower but safer', isCorrect: false },
        { id: 'c', text: 'To bypass the borrow checker', isCorrect: false },
        { id: 'd', text: 'To store values on disk', isCorrect: false },
      ], explanation: 'Generics let you write a function once and use it with many types.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 9 — The Soroban Gateway (Soroban fundamentals)
// ────────────────────────────────────────────────────────────────────────────

const L9 = `${WORLD_ID}-level-9`
const level9 = level(9, '9', 'The Soroban Gateway', 'Contracts, WASM, and the host', 'Enter Soroban — Stellar\'s smart-contract platform. Learn what it is, how WASM powers it, and the lifecycle of a contract.', 'Soroban', [
  lesson({
    levelId: L9, slug: 'introducing-soroban', title: 'What Is Soroban?',
    description: 'Stellar\'s smart-contract platform.',
    order: 1, source: 'https://developers.stellar.org/docs/smart-contracts',
    blocks: [
      { type: 'text', content: '## The Smart-Contract Layer\n\n**Soroban** is Stellar\'s smart-contract platform. Contracts are written in **Rust** and compiled to **WASM** (WebAssembly), then deployed to the network where anyone can invoke them.' },
      { type: 'callout', variant: 'info', content: 'Soroban contracts run in a sandboxed **host environment**, isolated from the network and each other.' },
    ],
  }),
  lesson({
    levelId: L9, slug: 'wasm-and-the-host', title: 'WASM & the Host Environment',
    description: 'A portable binary format, sandboxed.',
    order: 2, source: 'https://developers.stellar.org/docs/smart-contracts',
    blocks: [
      { type: 'text', content: '## Compile Once, Run Anywhere\n\nRust compiles to **WASM** — a compact, portable binary. Soroban runs WASM inside a **host** that mediates every interaction with the ledger (storage, accounts, balances), so a contract cannot touch anything it is not allowed to.' },
    ],
  }),
  lesson({
    levelId: L9, slug: 'contract-lifecycle', title: 'The Contract Lifecycle',
    description: 'Upload, instantiate, invoke.',
    order: 3, source: 'https://developers.stellar.org/docs/smart-contracts/getting-started/setup',
    blocks: [
      { type: 'text', content: '## From Code to Running Contract\n\n1. **Upload** — the WASM is uploaded to the network and gets a *WASM hash*.\n2. **Deploy / instantiate** — a deploy creates an instance with its own **contract ID**.\n3. **Invoke** — call the contract\'s methods; it reads and writes storage, emits events.' },
    ],
  }),
  lesson({
    levelId: L9, slug: 'the-soroban-sdk', title: 'The Soroban SDK',
    description: 'The crate that makes contracts easy.',
    order: 4, source: 'https://developers.stellar.org/docs/smart-contracts/getting-started/setup',
    blocks: [
      { type: 'code', language: 'rust', content: 'use soroban_sdk::{contract, contractimpl, Env, String};\n\n#[contract]\npub struct HelloContract;\n\n#[contractimpl]\nimpl HelloContract {\n    pub fn hello(env: Env, to: String) -> String {\n        to\n    }\n}' },
      { type: 'text', content: 'The **soroban-sdk** crate provides the `#[contract]` and `#[contractimpl]` macros plus `Env` — your handle to the host. `Env` is how a contract reaches storage, events, and the ledger.' },
    ],
  }),
  quiz({
    levelId: L9, slug: 'level-9-quiz', title: 'Quiz: The Soroban Gateway',
    description: 'Test what you know about Soroban and WASM.',
    order: 5, source: 'https://developers.stellar.org/docs/smart-contracts',
    questions: [
      { id: 'q1', question: 'What language are Soroban contracts written in?', options: [
        { id: 'a', text: 'Rust', isCorrect: true },
        { id: 'b', text: 'JavaScript', isCorrect: false },
        { id: 'c', text: 'Solidity', isCorrect: false },
        { id: 'd', text: 'Python', isCorrect: false },
      ], explanation: 'Soroban contracts are written in Rust and compiled to WASM.' },
      { id: 'q2', question: 'What does Rust compile to for Soroban?', options: [
        { id: 'a', text: 'WebAssembly (WASM)', isCorrect: true },
        { id: 'b', text: 'x86 machine code', isCorrect: false },
        { id: 'c', text: 'JavaScript', isCorrect: false },
        { id: 'd', text: 'Solidity bytecode', isCorrect: false },
      ], explanation: 'Soroban runs WebAssembly, a portable sandboxed binary format.' },
      { id: 'q3', question: 'What is the host environment?', options: [
        { id: 'a', text: 'The sandbox that mediates contract access to the ledger', isCorrect: true },
        { id: 'b', text: 'The Rust compiler', isCorrect: false },
        { id: 'c', text: 'A web server', isCorrect: false },
        { id: 'd', text: 'The wallet', isCorrect: false },
      ], explanation: 'The host sits between a contract and the ledger, enforcing isolation and access.' },
      { id: 'q4', question: 'What does deploying a contract give you?', options: [
        { id: 'a', text: 'A contract ID you can invoke', isCorrect: true },
        { id: 'b', text: 'A new cryptocurrency', isCorrect: false },
        { id: 'c', text: 'A keypair', isCorrect: false },
        { id: 'd', text: 'A WASM hash only', isCorrect: false },
      ], explanation: 'Deploying instantiates a contract and returns a contract ID used to invoke it.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 10 — Contract Anatomy (first Soroban contract)
// ────────────────────────────────────────────────────────────────────────────

const L10 = `${WORLD_ID}-level-10`
const level10 = level(10, '10', 'Contract Anatomy', 'Your first Soroban contract', 'Dissect a real contract: the #[contract] macro, contractimpl, Env, and the data types Soroban understands.', 'Soroban', [
  lesson({
    levelId: L10, slug: 'the-contract-macro', title: 'The #[contract] Macro',
    description: 'The annotation that marks a contract type.',
    order: 1, source: 'https://developers.stellar.org/docs/smart-contracts/getting-started/hello-world',
    blocks: [
      { type: 'code', language: 'rust', content: '#[contract]\npub struct CounterContract;\n\n// The #[contract] macro generates the boilerplate\n// that registers this struct as a Soroban contract.' },
      { type: 'text', content: 'The `#[contract]` attribute marks a struct as a Soroban contract and generates the code that lets the host call it.' },
    ],
  }),
  lesson({
    levelId: L10, slug: 'contractimpl-and-env', title: 'contractimpl & Env',
    description: 'Implement the contract and reach the host.',
    order: 2, source: 'https://developers.stellar.org/docs/smart-contracts/getting-started/hello-world',
    blocks: [
      { type: 'code', language: 'rust', content: '#[contractimpl]\nimpl CounterContract {\n    pub fn increment(env: Env) -> u32 {\n        // env is the handle to the host\n        let count: u32 = env.storage().instance().get(&COUNT_KEY).unwrap_or(0);\n        let next = count + 1;\n        env.storage().instance().set(&COUNT_KEY, &next);\n        next\n    }\n}' },
      { type: 'text', content: '`#[contractimpl]` implements the contract\'s methods. The **`Env`** parameter is how every method reaches storage, events, and the ledger.' },
    ],
  }),
  lesson({
    levelId: L10, slug: 'first-counter-contract', title: 'Your First Contract (Counter)',
    description: 'A complete stateful contract, end to end.',
    order: 3, source: 'https://developers.stellar.org/docs/smart-contracts/getting-started/hello-world',
    blocks: [
      { type: 'code', language: 'rust', content: 'use soroban_sdk::{contract, contractimpl, Env, Symbol};\n\nconst COUNT: Symbol = Symbol::short("COUNT");\n\n#[contract]\npub struct CounterContract;\n\n#[contractimpl]\nimpl CounterContract {\n    pub fn increment(env: Env) -> u32 {\n        let count: u32 = env.storage().instance().get(&COUNT).unwrap_or(0);\n        env.storage().instance().set(&COUNT, &(count + 1));\n        count + 1\n    }\n}' },
      { type: 'text', content: 'This counter stores its value in **instance storage** under a `Symbol` key, increments it, and returns the new value. A classic first contract.' },
    ],
  }),
  lesson({
    levelId: L10, slug: 'soroban-data-types', title: 'Data Types in Soroban',
    description: 'The types a contract can exchange.',
    order: 4, source: 'https://developers.stellar.org/docs/smart-contracts/getting-started/hello-world',
    blocks: [
      { type: 'text', content: '## Soroban-Native Types\n\nSoroban methods exchange host types, not raw Rust types:\n- `u32`, `i64`, `u64` — integers\n- `String`, `Symbol` — text (Symbol is a short, cheap identifier)\n- `Vec`, `Map`, `Address`, `BytesN` — collections and addresses\n\nThese map onto the ledger\'s data model so contracts and clients share a vocabulary.' },
    ],
  }),
  quiz({
    levelId: L10, slug: 'level-10-quiz', title: 'Quiz: Contract Anatomy',
    description: 'Test the parts of a Soroban contract.',
    order: 5, source: 'https://developers.stellar.org/docs/smart-contracts/getting-started/hello-world',
    questions: [
      { id: 'q1', question: 'What does `#[contract]` mark?', options: [
        { id: 'a', text: 'A struct as a Soroban contract', isCorrect: true },
        { id: 'b', text: 'A function as pure', isCorrect: false },
        { id: 'c', text: 'A test', isCorrect: false },
        { id: 'd', text: 'A dependency', isCorrect: false },
      ], explanation: '`#[contract]` registers a struct as a Soroban contract and generates boilerplate.' },
      { id: 'q2', question: 'What is `Env` in a contract method?', options: [
        { id: 'a', text: 'The handle to the host (storage, events, ledger)', isCorrect: true },
        { id: 'b', text: 'The environment variables', isCorrect: false },
        { id: 'c', text: 'The network passphrase', isCorrect: false },
        { id: 'd', text: 'A random number generator', isCorrect: false },
      ], explanation: 'Env is the contract\'s gateway to the host — storage, events, and the ledger.' },
      { id: 'q3', question: 'Which is a Soroban-native type?', options: [
        { id: 'a', text: 'Symbol', isCorrect: true },
        { id: 'b', text: 'Object', isCorrect: false },
        { id: 'c', text: 'float32', isCorrect: false },
        { id: 'd', text: 'HTMLString', isCorrect: false },
      ], explanation: 'Symbol, String, Vec, Map, Address, and integer types are Soroban-native.' },
      { id: 'q4', question: 'Where does the counter store its value in the example?', options: [
        { id: 'a', text: 'Instance storage, keyed by a Symbol', isCorrect: true },
        { id: 'b', text: 'A global variable', isCorrect: false },
        { id: 'c', text: 'A local file', isCorrect: false },
        { id: 'd', text: 'The blockchain event log', isCorrect: false },
      ], explanation: 'The counter persists its value in instance storage under a Symbol key.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 11 — Storage & Events (Soroban persistence)
// ────────────────────────────────────────────────────────────────────────────

const L11 = `${WORLD_ID}-level-11`
const level11 = level(11, '11', 'Storage & Events', 'Where contracts remember', 'Persist state with temp, persistent, and instance storage; understand TTL and state expiration; emit events for the outside world.', 'Soroban', [
  lesson({
    levelId: L11, slug: 'storage-types', title: 'Storage Types',
    description: 'Three kinds of storage, three lifetimes.',
    order: 1, source: 'https://developers.stellar.org/docs/smart-contracts/fundamentals/storing-data',
    blocks: [
      { type: 'text', content: '## Three Storage Kinds\n\n- **Instance** — the contract\'s own state; lives for the contract instance.\n- **Persistent** — long-lived data owned by the contract.\n- **Temporary** — short-lived data (e.g. during a multi-step flow), cheaper but expires quickly.\n\nChoose the cheapest kind that fits how long the data must live.' },
    ],
  }),
  lesson({
    levelId: L11, slug: 'ttl-and-expiration', title: 'State Expiration & TTL',
    description: 'Nothing on-chain lives forever by default.',
    order: 2, source: 'https://developers.stellar.org/docs/smart-contracts/fundamentals/state-expiration',
    blocks: [
      { type: 'text', content: '## Ledger Rent\n\nSoroban storage is **rented**, not bought. Every entry has a **time-to-live (TTL)** measured in ledgers. Before it expires, the contract (or anyone) must **bump** its TTL to keep it alive. Expired entries are archived.' },
      { type: 'callout', variant: 'warning', content: 'Forget to bump, and your data can expire. Long-lived contracts must renew their storage.' },
    ],
  }),
  lesson({
    levelId: L11, slug: 'events', title: 'Events',
    description: 'The contract\'s announcements to the world.',
    order: 3, source: 'https://developers.stellar.org/docs/smart-contracts/fundamentals/storing-data',
    blocks: [
      { type: 'code', language: 'rust', content: 'env.events().publish(\n    (Symbol::short("minted"), amount),\n    to.clone(),\n);' },
      { type: 'text', content: 'An **event** is a structured, on-chain record a contract emits. Clients and indexers subscribe to events to react to what a contract did — like "token minted" or "trade executed".' },
    ],
  }),
  lesson({
    levelId: L11, slug: 'data-keys', title: 'Data Keys & the Data Model',
    description: 'How entries are addressed.',
    order: 4, source: 'https://developers.stellar.org/docs/smart-contracts/fundamentals/storing-data',
    blocks: [
      { type: 'text', content: '## Keys, Not Pointers\n\nEvery stored entry is addressed by a **key** (a `Symbol`, `Vec`, or composite). You `get` and `set` values by key — there are no pointers or memory addresses in Soroban storage, only keyed entries in a flat map.' },
    ],
  }),
  quiz({
    levelId: L11, slug: 'level-11-quiz', title: 'Quiz: Storage & Events',
    description: 'Test storage kinds, TTL, and events.',
    order: 5, source: 'https://developers.stellar.org/docs/smart-contracts/fundamentals/storing-data',
    questions: [
      { id: 'q1', question: 'Which Soroban storage is cheapest and shortest-lived?', options: [
        { id: 'a', text: 'Temporary', isCorrect: true },
        { id: 'b', text: 'Persistent', isCorrect: false },
        { id: 'c', text: 'Instance', isCorrect: false },
        { id: 'd', text: 'Eternal', isCorrect: false },
      ], explanation: 'Temporary storage is cheap but expires quickly — ideal for short-lived state.' },
      { id: 'q2', question: 'What is a TTL (time-to-live)?', options: [
        { id: 'a', text: 'The number of ledgers before an entry expires', isCorrect: true },
        { id: 'b', text: 'The contract\'s runtime limit', isCorrect: false },
        { id: 'c', text: 'The transaction fee', isCorrect: false },
        { id: 'd', text: 'A network passphrase', isCorrect: false },
      ], explanation: 'TTL is the ledger countdown before a storage entry is archived.' },
      { id: 'q3', question: 'What keeps a storage entry from expiring?', options: [
        { id: 'a', text: 'Bumping its TTL before it runs out', isCorrect: true },
        { id: 'b', text: 'Nothing — entries never expire', isCorrect: false },
        { id: 'c', text: 'Restarting the network', isCorrect: false },
        { id: 'd', text: 'Deleting the contract', isCorrect: false },
      ], explanation: 'Entries must have their TTL bumped to stay alive on the ledger.' },
      { id: 'q4', question: 'What is an event?', options: [
        { id: 'a', text: 'A structured on-chain record a contract emits', isCorrect: true },
        { id: 'b', text: 'A random crash', isCorrect: false },
        { id: 'c', text: 'A transaction fee', isCorrect: false },
        { id: 'd', text: 'A network upgrade', isCorrect: false },
      ], explanation: 'Events are structured records clients and indexers subscribe to.' },
    ],
  }),
])

// ────────────────────────────────────────────────────────────────────────────
// LEVEL 12 — Deploy & Invoke (Soroban in the wild)
// ────────────────────────────────────────────────────────────────────────────

const L12 = `${WORLD_ID}-level-12`
const level12 = level(12, '12', 'Deploy & Invoke', 'Ship it to testnet', 'Build and optimize your WASM, deploy to testnet with the Stellar CLI, invoke methods, and call contracts from a frontend.', 'Soroban', [
  lesson({
    levelId: L12, slug: 'build-and-optimize', title: 'Build & Optimize',
    description: 'Compile Rust to compact WASM.',
    order: 1, source: 'https://developers.stellar.org/docs/smart-contracts',
    blocks: [
      { type: 'code', language: 'bash', content: 'stellar contract build\n# or, manually:\ncargo build --target wasm32-unknown-unknown --release\nstellar contract optimize --wasm target/wasm32-unknown-unknown/release/hello.wasm' },
      { type: 'text', content: 'Contracts are compiled to WASM for the `wasm32-unknown-unknown` target, then **optimized** to shrink the binary. Smaller WASM = cheaper upload.' },
    ],
  }),
  lesson({
    levelId: L12, slug: 'deploy-with-cli', title: 'Deploy with the Stellar CLI',
    description: 'Get a contract ID on testnet.',
    order: 2, source: 'https://developers.stellar.org/docs/smart-contracts',
    blocks: [
      { type: 'code', language: 'bash', content: 'stellar contract deploy \\\n  --wasm target/wasm32-unknown-unknown/release/hello.wasm \\\n  --network testnet' },
      { type: 'callout', variant: 'tip', content: 'Deploy returns a **contract ID** — the address you invoke. Always deploy to **testnet** first; it is funded by Friendbot and costs nothing.' },
    ],
  }),
  lesson({
    levelId: L12, slug: 'invoking-methods', title: 'Invoking Methods',
    description: 'Call a deployed contract.',
    order: 3, source: 'https://developers.stellar.org/docs/smart-contracts',
    blocks: [
      { type: 'code', language: 'bash', content: 'stellar contract invoke \\\n  --id <CONTRACT_ID> \\\n  --network testnet \\\n  --source <YOUR_ACCOUNT> \\\n  -- increment' },
      { type: 'text', content: '`stellar contract invoke` calls a method on a deployed contract, signing the transaction with your account. Every call is a real on-chain transaction.' },
    ],
  }),
  lesson({
    levelId: L12, slug: 'cross-contract-and-frontend', title: 'Cross-Contract Calls & Frontends',
    description: 'Contracts talking to contracts, and apps talking to contracts.',
    order: 4, source: 'https://developers.stellar.org/docs/smart-contracts',
    blocks: [
      { type: 'text', content: '## The Wider World\n\n- **Cross-contract calls** — one contract can invoke another using a `client` built from its contract ID.\n- **Frontend integration** — apps call contracts through the **Stellar JS SDK** (or the generated Rust client), often signing with the **Freighter** wallet.\n\nThis is how a web app becomes a real Soroban dapp.' },
    ],
  }),
  quiz({
    levelId: L12, slug: 'level-12-quiz', title: 'Quiz: Deploy & Invoke',
    description: 'Test the full ship-to-testnet flow.',
    order: 5, source: 'https://developers.stellar.org/docs/smart-contracts',
    questions: [
      { id: 'q1', question: 'Why optimize WASM before deploying?', options: [
        { id: 'a', text: 'Smaller binary means cheaper upload', isCorrect: true },
        { id: 'b', text: 'It makes the contract faster to write', isCorrect: false },
        { id: 'c', text: 'It is required to compile', isCorrect: false },
        { id: 'd', text: 'It adds features', isCorrect: false },
      ], explanation: 'Optimizing shrinks the WASM, reducing the cost of uploading it.' },
      { id: 'q2', question: 'What does `stellar contract deploy` return?', options: [
        { id: 'a', text: 'A contract ID', isCorrect: true },
        { id: 'b', text: 'A secret key', isCorrect: false },
        { id: 'c', text: 'XLM', isCorrect: false },
        { id: 'd', text: 'A WASM hash only', isCorrect: false },
      ], explanation: 'Deploying returns a contract ID, the address you use to invoke it.' },
      { id: 'q3', question: 'Which command invokes a method on a deployed contract?', options: [
        { id: 'a', text: 'stellar contract invoke', isCorrect: true },
        { id: 'b', text: 'stellar contract build', isCorrect: false },
        { id: 'c', text: 'stellar account create', isCorrect: false },
        { id: 'd', text: 'stellar network list', isCorrect: false },
      ], explanation: '`stellar contract invoke` calls a contract method with a signed transaction.' },
      { id: 'q4', question: 'How can a web app call a Soroban contract?', options: [
        { id: 'a', text: 'Through the Stellar SDK, often signing with Freighter', isCorrect: true },
        { id: 'b', text: 'Only by running the Rust code locally', isCorrect: false },
        { id: 'c', text: 'By editing the contract directly', isCorrect: false },
        { id: 'd', text: 'It cannot', isCorrect: false },
      ], explanation: 'Apps invoke contracts via the Stellar SDK, commonly signing transactions with the Freighter wallet.' },
    ],
  }),
])

export const world1: World = {
  id: WORLD_ID,
  slug: 'origin-plains',
  title: 'The Origin Plains',
  subtitle: 'Where every journey begins',
  description:
    'Awaken in the Origin Plains and journey from your first ledger to your first deployed Soroban contract — twelve levels that climb from Stellar fundamentals through Rust to smart contracts on testnet.',
  theme: 'forest',
  order: 1,
  xpReward: 1000,
  bossName: 'The Doubt Wraith',
  bossDescription:
    'A creature of confusion and misinformation. Defeat it by proving you understand the entire journey — from the first ledger to your first deployed contract.',
  levels: [
    level1,
    level2,
    level3,
    level4,
    level5,
    level6,
    level7,
    level8,
    level9,
    level10,
    level11,
    level12,
  ],
}
