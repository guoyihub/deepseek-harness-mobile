/** Mobile sessionToken extraction and validation helpers (Host side). */

import type { IncomingHttpHeaders } from 'node:http'

/** Minimal mobilePairing surface required for token validation. */
export interface MobileSessionValidator {
  /**
   * Validate an opaque session token.
   * @param token - Bearer or WebSocket access_token value.
   * @returns true when the token is live.
   */
  validateSessionToken(token: string): unknown
}

/**
 * Parse a Bearer token from request headers.
 * @param headers - Node or Fetch request headers.
 * @returns the opaque token, or undefined when absent.
 */
export function parseBearerToken(headers: IncomingHttpHeaders | Headers): string | undefined {
  const raw = header(headers, 'authorization')
  if (raw === undefined) return undefined
  const match = /^Bearer\s+(\S+)\s*$/i.exec(raw)
  return match?.[1]
}

/**
 * Parse `access_token` from a request URL.
 * @param url - absolute or relative request URL.
 * @returns the opaque token, or undefined when absent.
 */
export function parseAccessTokenFromUrl(url: string): string | undefined {
  try {
    return new URL(url, 'http://dsh.internal').searchParams.get('access_token') ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Decide whether a request may proceed given an optional mobile session token.
 * @param validator - Host mobilePairing service, when loaded.
 * @param token - Bearer or query token, when present.
 * @returns true when no token was sent or the token is valid.
 */
export function isMobileSessionAuthorized(
  validator: MobileSessionValidator | undefined,
  token: string | undefined,
): boolean {
  if (token === undefined) return true
  if (validator === undefined) return false
  return validator.validateSessionToken(token) !== undefined
}

function header(headers: IncomingHttpHeaders | Headers, name: string): string | undefined {
  if (headers instanceof Headers) return headers.get(name) ?? undefined
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}
