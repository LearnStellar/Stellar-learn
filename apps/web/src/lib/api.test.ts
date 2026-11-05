import { describe, expect, it } from 'vitest'
import { apiError, apiResponse, parseJsonBody } from './api'
import { CORRELATION_ID_HEADER } from './correlation'

describe('API utilities (apps/web/src/lib/api)', () => {
  describe('apiResponse', () => {
    it('returns a 200 JSON response by default', async () => {
      const res = apiResponse({ message: 'hello' })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ message: 'hello' })
    })

    it('echoes back X-Correlation-ID when provided in request headers', () => {
      const headers = new Headers({ [CORRELATION_ID_HEADER]: 'test-cid-123' })
      const res = apiResponse({ ok: true }, { headers })
      expect(res.headers.get(CORRELATION_ID_HEADER)).toBe('test-cid-123')
    })

    it('does not set X-Correlation-ID header when missing or fallback', () => {
      const res = apiResponse({ ok: true })
      expect(res.headers.get(CORRELATION_ID_HEADER)).toBeNull()
    })
  })

  describe('apiError', () => {
    it('returns a 400 error by default', async () => {
      const res = apiError('Bad request')
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data).toEqual({ error: 'Bad request' })
    })

    it('allows custom HTTP error status codes', async () => {
      const res = apiError('Unauthorized', 401)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('forwards correlation id on errors', () => {
      const headers = new Headers({ [CORRELATION_ID_HEADER]: 'err-cid-456' })
      const res = apiError('Server failure', 500, headers)
      expect(res.status).toBe(500)
      expect(res.headers.get(CORRELATION_ID_HEADER)).toBe('err-cid-456')
    })
  })

  describe('parseJsonBody', () => {
    it('parses valid JSON bodies', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: 'quest-1', score: 100 }),
      })
      const result = await parseJsonBody<{ questId: string; score: number }>(req)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.questId).toBe('quest-1')
        expect(result.data.score).toBe(100)
      }
    })

    it('returns error when body is invalid JSON', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid-json{',
      })
      const result = await parseJsonBody(req)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Invalid JSON body')
      }
    })

    it('rejects primitive JSON values like null or strings', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: 'null',
      })
      const result = await parseJsonBody(req)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Request body must be a JSON object')
      }
    })
  })
})
