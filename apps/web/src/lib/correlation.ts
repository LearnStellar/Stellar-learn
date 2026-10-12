/**
 * Header used to carry a request's correlation ID end-to-end. A single value is
 * read from the inbound request (if a client/proxy already set one), forwarded
 * to route handlers on the request, and echoed back on the response so the same
 * ID appears in logs across every layer that touches the request.
 */
export const CORRELATION_ID_HEADER = 'X-Correlation-ID'

/** Fallback used when a handler runs outside `src/proxy.ts` (e.g. local tests). */
const MISSING_CORRELATION_ID = 'no-correlation-id'

/**
 * Return the inbound `X-Correlation-ID` if the request already carries a
 * non-empty one, otherwise mint a fresh UUID v4 via the built-in Web Crypto API. Header lookups are
 * case-insensitive, so this matches `x-correlation-id` too.
 */
export function getOrCreateCorrelationId(headers: Headers): string {
  const existing = headers.get(CORRELATION_ID_HEADER)
  if (existing && existing.trim().length > 0) return existing
  return crypto.randomUUID()
}

/**
 * Read the correlation ID a route handler received from the proxy. The
 * proxy always forwards it on the request headers; the fallback only
 * applies when a handler is invoked without the proxy in front of it.
 */
export function getCorrelationId(headers: Headers): string {
  return headers.get(CORRELATION_ID_HEADER) ?? MISSING_CORRELATION_ID
}

type Logger = {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Build a console logger whose every line is prefixed with the correlation ID,
 * so logs belonging to one API call can be grepped out of production output.
 */
export function createLogger(correlationId: string): Logger {
  const prefix = `[cid:${correlationId}]`
  return {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  }
}

/** Convenience: derive a correlation-prefixed logger straight from request headers. */
export function loggerFromHeaders(headers: Headers): Logger {
  return createLogger(getCorrelationId(headers))
}
