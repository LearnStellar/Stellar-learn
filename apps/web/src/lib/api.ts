import { NextResponse } from 'next/server'
import { CORRELATION_ID_HEADER, getCorrelationId } from './correlation'

/** Standard unified error response body. */
export interface ApiErrorResponse {
  error: string
  correlationId?: string
}

/**
 * Return a JSON response with correlation ID echoed back in the response headers.
 */
export function apiResponse<T>(
  body: T,
  options: { status?: number; headers?: Headers } = {}
): NextResponse {
  const { status = 200, headers: reqHeaders } = options
  const responseHeaders = new Headers()

  if (reqHeaders) {
    const cid = getCorrelationId(reqHeaders)
    if (cid && cid !== 'no-correlation-id') {
      responseHeaders.set(CORRELATION_ID_HEADER, cid)
    }
  }

  return NextResponse.json(body, {
    status,
    headers: responseHeaders,
  })
}

/**
 * Return a standardized JSON error response with appropriate status code and headers.
 */
export function apiError(
  message: string,
  status = 400,
  headers?: Headers
): NextResponse {
  return apiResponse<ApiErrorResponse>({ error: message }, { status, headers })
}

/**
 * Safely parse a JSON request body without crashing if malformed.
 */
export async function parseJsonBody<T>(
  request: Request
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = (await request.json()) as T
    if (data === null || typeof data !== 'object') {
      return { ok: false, error: 'Request body must be a JSON object' }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Invalid JSON body' }
  }
}
