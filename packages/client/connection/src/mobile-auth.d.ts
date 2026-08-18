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
export declare function parseBearerToken(headers: IncomingHttpHeaders | Headers): string | undefined
/**
 * Parse `access_token` from a request URL.
 * @param url - absolute or relative request URL.
 * @returns the opaque token, or undefined when absent.
 */
export declare function parseAccessTokenFromUrl(url: string): string | undefined
/**
 * Decide whether a request may proceed given an optional mobile session token.
 * @param validator - Host mobilePairing service, when loaded.
 * @param token - Bearer or query token, when present.
 * @returns true when no token was sent or the token is valid.
 */
export declare function isMobileSessionAuthorized(validator: MobileSessionValidator | undefined, token: string | undefined): boolean
//# sourceMappingURL=mobile-auth.d.ts.map
