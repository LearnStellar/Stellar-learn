import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SOROBAN_PLAYGROUND_TEMPLATES } from '@stellar-learn/stellar/soroban/templates'

const VALID_CONTRACT_ID = `C${'A'.repeat(55)}`
const HELLO_SOURCE = SOROBAN_PLAYGROUND_TEMPLATES.hello.source
const TAMPERED_SOURCE = HELLO_SOURCE.replace('env', 'not_the_reviewed_template')

vi.mock('@stellar-learn/stellar/soroban', async () => {
  const actual = await vi.importActual<typeof import('@stellar-learn/stellar/soroban')>(
    '@stellar-learn/stellar/soroban'
  )
  return {
    ...actual,
    deploySorobanPlaygroundTemplate: vi.fn(),
    invokeSorobanPlaygroundContract: vi.fn(),
  }
})

function post(body: unknown) {
  return new Request('http://localhost/api/playground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('api/playground', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('request validation', () => {
    it('rejects a request body that is not an object', async () => {
      const { POST } = await import('./route')
      const res = await POST(post('deploy'))

      expect(res.status).toBe(400)
      expect((await res.json()).error.code).toBe('INVALID_REQUEST')
    })

    it('rejects an unexpected field, such as a caller-supplied network endpoint', async () => {
      const { POST } = await import('./route')
      const res = await POST(
        post({ action: 'deploy', templateId: 'hello', code: HELLO_SOURCE, rpcUrl: 'https://evil.example' })
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_REQUEST')
      expect(body.error.message).toMatch(/rpcUrl/)
    })

    it('rejects an unsupported action', async () => {
      const { POST } = await import('./route')
      const res = await POST(post({ action: 'compile', templateId: 'hello', code: HELLO_SOURCE }))

      expect(res.status).toBe(400)
    })

    it('rejects an unsupported template id', async () => {
      const { POST } = await import('./route')
      const res = await POST(post({ action: 'deploy', templateId: 'evil', code: HELLO_SOURCE }))

      expect(res.status).toBe(400)
    })

    it('rejects missing or empty source code', async () => {
      const { POST } = await import('./route')
      const res = await POST(post({ action: 'deploy', templateId: 'hello', code: '' }))

      expect(res.status).toBe(400)
    })

    it('rejects source code over the max length', async () => {
      const { POST } = await import('./route')
      const res = await POST(
        post({ action: 'deploy', templateId: 'hello', code: 'a'.repeat(24_001) })
      )

      expect(res.status).toBe(400)
    })

    it('rejects a run request without a well-formed contract id', async () => {
      const { POST } = await import('./route')
      const res = await POST(
        post({ action: 'run', templateId: 'hello', code: HELLO_SOURCE, contractId: 'not-a-contract-id' })
      )

      expect(res.status).toBe(400)
    })
  })

  describe('the testnet-only reviewed-template guard', () => {
    it('rejects source that does not match the selected reviewed template', async () => {
      const { POST } = await import('./route')
      const { deploySorobanPlaygroundTemplate } = await import('@stellar-learn/stellar/soroban')

      const res = await POST(post({ action: 'deploy', templateId: 'hello', code: TAMPERED_SOURCE }))

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.ok).toBe(false)
      expect(body.network).toBe('testnet')
      expect(body.error.code).toBe('UNSUPPORTED_SOURCE')
      expect(deploySorobanPlaygroundTemplate).not.toHaveBeenCalled()
    })

    it('rejects source copied from the other reviewed template', async () => {
      const { POST } = await import('./route')
      const { deploySorobanPlaygroundTemplate } = await import('@stellar-learn/stellar/soroban')

      const res = await POST(
        post({
          action: 'deploy',
          templateId: 'hello',
          code: SOROBAN_PLAYGROUND_TEMPLATES.counter.source,
        })
      )

      expect(res.status).toBe(422)
      expect(deploySorobanPlaygroundTemplate).not.toHaveBeenCalled()
    })

    it('every successful response reports network: testnet and never echoes a caller endpoint', async () => {
      const { POST } = await import('./route')
      const { deploySorobanPlaygroundTemplate } = await import('@stellar-learn/stellar/soroban')
      vi.mocked(deploySorobanPlaygroundTemplate).mockResolvedValue({
        contractId: VALID_CONTRACT_ID,
        transactionHash: 'deploy-hash',
        result: 'ok',
      })

      const res = await POST(post({ action: 'deploy', templateId: 'hello', code: HELLO_SOURCE }))
      const body = await res.json()

      expect(body.network).toBe('testnet')
      expect(body).not.toHaveProperty('rpcUrl')
    })
  })

  describe('deploy branch', () => {
    it('deploys the matching reviewed template and returns the contract id', async () => {
      const { POST } = await import('./route')
      const { deploySorobanPlaygroundTemplate } = await import('@stellar-learn/stellar/soroban')
      vi.mocked(deploySorobanPlaygroundTemplate).mockResolvedValue({
        contractId: VALID_CONTRACT_ID,
        transactionHash: 'deploy-hash',
        result: ['Hello', 'Playground'],
      })

      const res = await POST(post({ action: 'deploy', templateId: 'hello', code: HELLO_SOURCE }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.stage).toBe('deploy')
      expect(body.contractId).toBe(VALID_CONTRACT_ID)
      expect(deploySorobanPlaygroundTemplate).toHaveBeenCalledWith('hello')
    })

    it('returns a redacted 502 when the testnet deployment fails', async () => {
      const { POST } = await import('./route')
      const { deploySorobanPlaygroundTemplate } = await import('@stellar-learn/stellar/soroban')
      const leakedSecret = `S${'B'.repeat(55)}`
      vi.mocked(deploySorobanPlaygroundTemplate).mockRejectedValue(
        new Error(`Signing failed for secret ${leakedSecret}`)
      )

      const res = await POST(post({ action: 'deploy', templateId: 'hello', code: HELLO_SOURCE }))
      const body = await res.json()

      expect(res.status).toBe(502)
      expect(body.error.code).toBe('TESTNET_EXECUTION_FAILED')
      expect(body.error.message).not.toContain(leakedSecret)
      expect(body.error.message).toContain('[redacted secret key]')
    })
  })

  describe('run branch', () => {
    it('invokes the deployed contract for the matching reviewed template', async () => {
      const { POST } = await import('./route')
      const { invokeSorobanPlaygroundContract } = await import('@stellar-learn/stellar/soroban')
      vi.mocked(invokeSorobanPlaygroundContract).mockResolvedValue({
        transactionHash: 'run-hash',
        result: 'Playground',
      })

      const res = await POST(
        post({ action: 'run', templateId: 'hello', code: HELLO_SOURCE, contractId: VALID_CONTRACT_ID })
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.stage).toBe('run')
      expect(body.contractId).toBe(VALID_CONTRACT_ID)
      expect(invokeSorobanPlaygroundContract).toHaveBeenCalledWith('hello', VALID_CONTRACT_ID)
    })

    it('returns a redacted 502 when the testnet invocation fails', async () => {
      const { POST } = await import('./route')
      const { invokeSorobanPlaygroundContract } = await import('@stellar-learn/stellar/soroban')
      const leakedSecret = `S${'C'.repeat(55)}`
      vi.mocked(invokeSorobanPlaygroundContract).mockRejectedValue(
        new Error(`Signing failed for secret ${leakedSecret}`)
      )

      const res = await POST(
        post({ action: 'run', templateId: 'hello', code: HELLO_SOURCE, contractId: VALID_CONTRACT_ID })
      )
      const body = await res.json()

      expect(res.status).toBe(502)
      expect(body.error.message).not.toContain(leakedSecret)
    })
  })
})
