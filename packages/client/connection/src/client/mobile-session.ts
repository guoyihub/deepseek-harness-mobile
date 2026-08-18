/**
 * Browser localStorage keys and readers for mobile Host pairing.
 * Keep {@link MOBILE_STORAGE_KEYS} aligned with
 * `packages/client/mobile-shell/src/client/mobile-session.ts`.
 */

/** localStorage keys for mobile pairing persistence. */
export const MOBILE_STORAGE_KEYS = {
  /** Canonical Host base URL (`https://host:port`). */
  host: 'dsh.mobile.host',
  /** Opaque session token. */
  sessionToken: 'dsh.mobile.sessionToken',
  /** Registered device id. */
  deviceId: 'dsh.mobile.deviceId',
  /** Last seen Host fingerprint. */
  fingerprint: 'dsh.mobile.fingerprint',
} as const

/**
 * Read the configured Host base URL for cross-origin mobile clients.
 * @returns stored base URL, or undefined when unset or storage is unavailable.
 */
export function readStoredHostBase(): string | undefined {
  try {
    const value = globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.host)
    return value === null || value === '' ? undefined : value
  } catch {
    return undefined
  }
}

/**
 * Persist the Host base URL for subsequent API calls.
 * @param base - canonical origin (`https://host:port`).
 */
export function writeStoredHostBase(base: string): void {
  globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.host, base)
}

/**
 * Read the stored mobile session token.
 * @returns opaque token, or undefined when unset or storage is unavailable.
 */
export function readSessionToken(): string | undefined {
  try {
    const value = globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.sessionToken)
    return value === null || value === '' ? undefined : value
  } catch {
    return undefined
  }
}

/**
 * Persist pairing results after a successful exchange.
 * @param base - Host base URL.
 * @param sessionToken - issued opaque token.
 * @param deviceId - registered device id.
 * @param fingerprint - Host instance fingerprint.
 */
export function writePairingResult(
  base: string,
  sessionToken: string,
  deviceId: string,
  fingerprint: string,
): void {
  writeStoredHostBase(base)
  globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.sessionToken, sessionToken)
  globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.deviceId, deviceId)
  globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.fingerprint, fingerprint)
}

/** Clear stored pairing state (user-visible disconnect). */
export function clearPairingStorage(): void {
  for (const key of Object.values(MOBILE_STORAGE_KEYS)) {
    globalThis.localStorage?.removeItem(key)
  }
}
