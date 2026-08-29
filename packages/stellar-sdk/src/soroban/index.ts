import { randomBytes } from 'node:crypto'
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk'
import { getSorobanPlaygroundTemplate, type PlaygroundTemplateId } from './templates'

export * from './templates'

export const SOROBAN_TESTNET_RPC_URL = 'https://soroban-testnet.stellar.org'
export const SOROBAN_TESTNET_FRIENDBOT_URL = 'https://friendbot.stellar.org'
export const SOROBAN_TESTNET_NETWORK_PASSPHRASE = Networks.TESTNET

const TRANSACTION_TIMEOUT_SECONDS = 30
const TRANSACTION_POLL_INTERVAL_MS = 1_000
const TRANSACTION_POLL_ATTEMPTS = 30

export interface SorobanPlaygroundResult {
  contractId: string
  transactionHash?: string
  result: unknown
}

/**
 * Deploy a reviewed template with an ephemeral, Friendbot-funded testnet
 * account. No caller-supplied network, key, or RPC endpoint is accepted.
 */
export async function deploySorobanPlaygroundTemplate(
  templateId: PlaygroundTemplateId
): Promise<SorobanPlaygroundResult> {
  const template = getSorobanPlaygroundTemplate(templateId)
  const server = new rpc.Server(SOROBAN_TESTNET_RPC_URL)
  const source = await createFundedTestnetAccount(server)

  const uploadAccount = await server.getAccount(source.publicKey())
  const uploadTransaction = new TransactionBuilder(uploadAccount, transactionOptions())
    .addOperation(Operation.uploadContractWasm({ wasm: Buffer.from(template.wasmBase64, 'base64') }))
    .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
    .build()
  const uploadSubmission = await submitAndWait(server, uploadTransaction, source)
  const wasmHash = getReturnValueBytes(uploadSubmission.response, 'upload the contract Wasm')

  const deployAccount = await server.getAccount(source.publicKey())
  const deployTransaction = new TransactionBuilder(deployAccount, transactionOptions())
    .addOperation(
      Operation.createCustomContract({
        wasmHash,
        address: Address.fromString(source.publicKey()),
        salt: randomBytes(32),
      })
  )
    .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
    .build()
  const deploySubmission = await submitAndWait(server, deployTransaction, source)
  const contractId = StrKey.encodeContract(
    Address.fromScAddress(getReturnValueAddress(deploySubmission.response, 'create the contract')).toBuffer()
  )
  const invocation = await invokeSorobanPlaygroundContract(templateId, contractId)

  return {
    contractId,
    transactionHash: invocation.transactionHash ?? deploySubmission.transactionHash,
    result: invocation.result,
  }
}

/** Invoke the default action for a reviewed template on the fixed testnet. */
export async function invokeSorobanPlaygroundContract(
  templateId: PlaygroundTemplateId,
  contractId: string
): Promise<Omit<SorobanPlaygroundResult, 'contractId'>> {
  const template = getSorobanPlaygroundTemplate(templateId)
  const server = new rpc.Server(SOROBAN_TESTNET_RPC_URL)
  const source = await createFundedTestnetAccount(server)
  const account = await server.getAccount(source.publicKey())
  const contract = new Contract(contractId)
  const args = template.invoke.argument
    ? [nativeToScVal(template.invoke.argument, { type: 'string' })]
    : []
  const transaction = new TransactionBuilder(account, transactionOptions())
    .addOperation(contract.call(template.invoke.functionName, ...args))
    .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
    .build()

  const submission = await submitAndWait(server, transaction, source)
  if (!submission.response.returnValue) {
    throw new Error('The testnet invocation did not return a contract value.')
  }

  return {
    transactionHash: submission.transactionHash,
    result: scValToNative(submission.response.returnValue),
  }
}

function transactionOptions() {
  return {
    fee: BASE_FEE,
    networkPassphrase: SOROBAN_TESTNET_NETWORK_PASSPHRASE,
  }
}

async function createFundedTestnetAccount(server: rpc.Server): Promise<Keypair> {
  const keypair = Keypair.random()
  await server.requestAirdrop(keypair.publicKey(), SOROBAN_TESTNET_FRIENDBOT_URL)
  return keypair
}

async function submitAndWait(
  server: rpc.Server,
  transaction: ReturnType<TransactionBuilder['build']>,
  signer: Keypair
) {
  const prepared = await server.prepareTransaction(transaction)
  prepared.sign(signer)
  const sent = await server.sendTransaction(prepared)
  if (sent.status !== 'PENDING') {
    throw new Error('The testnet refused to accept the prepared transaction.')
  }
  const response = await waitForTransaction(server, sent.hash)

  return { response, transactionHash: sent.hash }
}

async function waitForTransaction(server: rpc.Server, hash: string) {
  for (let attempt = 0; attempt < TRANSACTION_POLL_ATTEMPTS; attempt += 1) {
    const response = await server.getTransaction(hash)

    if (response.status === 'SUCCESS') {
      return response
    }

    if (response.status === 'FAILED') {
      throw new Error('The testnet rejected this transaction.')
    }

    await wait(TRANSACTION_POLL_INTERVAL_MS)
  }

  throw new Error('Timed out while waiting for Stellar testnet confirmation.')
}

function getReturnValueBytes(
  response: Awaited<ReturnType<rpc.Server['getTransaction']>>,
  action: string
): Buffer {
  const returnValue = (response as unknown as { returnValue?: { bytes?: () => Buffer } }).returnValue
  const bytes = returnValue?.bytes?.()

  if (!bytes) {
    throw new Error(`The testnet did not return a Wasm hash while attempting to ${action}.`)
  }

  return bytes
}

function getReturnValueAddress(
  response: Awaited<ReturnType<rpc.Server['getTransaction']>>,
  action: string
): Parameters<typeof Address.fromScAddress>[0] {
  const returnValue = (
    response as unknown as {
      returnValue?: { address?: () => Parameters<typeof Address.fromScAddress>[0] }
    }
  ).returnValue
  const address = returnValue?.address?.()

  if (!address) {
    throw new Error(`The testnet did not return a contract address while attempting to ${action}.`)
  }

  return address
}

function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}
