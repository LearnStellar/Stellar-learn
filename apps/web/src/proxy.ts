import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { clerkEnabled } from '@/lib/auth'
import { CORRELATION_ID_HEADER, getOrCreateCorrelationId } from '@/lib/correlation'

/**
 * Attach a correlation ID to the request lifecycle: reuse an inbound
 * `X-Correlation-ID` or generate a uuidv4, forward it on the request headers so
 * route handlers can read it (the App Router equivalent of `req.correlationId`),
 * and echo it on the response header for clients and downstream proxies.
 */
function withCorrelationId(request: NextRequest): NextResponse {
  const correlationId = getOrCreateCorrelationId(request.headers)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(CORRELATION_ID_HEADER, correlationId)
  return response
}

/**
 * Next.js 16 proxy (formerly `middleware.ts`) running Clerk — required for `auth()` / `<SignedIn>` / `<SignedOut>` and
 * server-side user lookups. When Clerk isn't configured (no real key), this
 * becomes a no-op pass-through so the app still boots for UI preview instead
 * of redirecting to a non-existent Clerk handshake domain. Either way the
 * correlation ID is applied first so every request is traceable.
 */
export default clerkEnabled
  ? clerkMiddleware((_auth, request) => withCorrelationId(request))
  : (request: NextRequest) => withCorrelationId(request)

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
