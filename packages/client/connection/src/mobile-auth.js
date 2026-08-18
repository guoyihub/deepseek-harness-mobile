/** Mobile sessionToken extraction and validation helpers (Host side). */
/**
 * Parse a Bearer token from request headers.
 * @param headers - Node or Fetch request headers.
 * @returns the opaque token, or undefined when absent.
 */
export function parseBearerToken(headers) {
    const raw = header(headers, 'authorization');
    if (raw === undefined)
        return undefined;
    const match = /^Bearer\s+(\S+)\s*$/i.exec(raw);
    return match?.[1];
}
/**
 * Parse `access_token` from a request URL.
 * @param url - absolute or relative request URL.
 * @returns the opaque token, or undefined when absent.
 */
export function parseAccessTokenFromUrl(url) {
    try {
        return new URL(url, 'http://dsh.internal').searchParams.get('access_token') ?? undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * Decide whether a request may proceed given an optional mobile session token.
 * @param validator - Host mobilePairing service, when loaded.
 * @param token - Bearer or query token, when present.
 * @returns true when no token was sent or the token is valid.
 */
export function isMobileSessionAuthorized(validator, token) {
    if (token === undefined)
        return true;
    if (validator === undefined)
        return false;
    return validator.validateSessionToken(token) !== undefined;
}
function header(headers, name) {
    if (headers instanceof Headers)
        return headers.get(name) ?? undefined;
    const value = headers[name];
    return typeof value === 'string' ? value : undefined;
}
//# sourceMappingURL=mobile-auth.js.map
