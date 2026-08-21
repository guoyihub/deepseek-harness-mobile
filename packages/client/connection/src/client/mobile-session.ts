/**
 * Browser localStorage keys and readers for mobile Host pairing.
 * Keep {@link MOBILE_STORAGE_KEYS} aligned with
 * `packages/client/mobile-shell/src/client/mobile-session.ts`.
 */

/** localStorage keys for mobile pairing persistence. */
export const MOBILE_STORAGE_KEYS = {
  /** User-configured Mobile server URL for native shell apps. */
  serverUrl: 'dsh.mobile.serverUrl',
  /** Canonical Host base URL (`https://host:port`). */
  host: 'dsh.mobile.host',
  /** Opaque session token. */
  sessionToken: 'dsh.mobile.sessionToken',
  /** Registered device id. */
  deviceId: 'dsh.mobile.deviceId',
  /** Last seen Host fingerprint. */
  fingerprint: 'dsh.mobile.fingerprint',
  /** User-visible mobile device label (survives disconnect). */
  deviceLabel: 'dsh.mobile.deviceLabel',
  /** Whether the user explicitly edited {@link MOBILE_STORAGE_KEYS.deviceLabel}. */
  deviceLabelCustomized: 'dsh.mobile.deviceLabelCustomized',
  /** Saved successful Host connections for settings quick reconnect. */
  connectionHistory: 'dsh.mobile.connectionHistory',
} as const

const PAIRING_ONLY_STORAGE_KEYS = [
  MOBILE_STORAGE_KEYS.host,
  MOBILE_STORAGE_KEYS.sessionToken,
  MOBILE_STORAGE_KEYS.deviceId,
  MOBILE_STORAGE_KEYS.fingerprint,
] as const

/**
 * Read the user-configured Mobile server URL (native shell).
 * @returns stored server URL, or undefined when unset or storage is unavailable.
 */
export function readStoredServerUrl(): string | undefined {
  try {
    const value = globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.serverUrl)
    return value === null || value === '' ? undefined : value
  } catch {
    return undefined
  }
}

/**
 * Persist the Mobile server URL for native shell API calls.
 * @param url - canonical origin (`https://mobile.example.com`).
 */
export function writeStoredServerUrl(url: string): void {
  globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.serverUrl, url)
}

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
 * Read the stored Host fingerprint for the active pairing.
 * @returns fingerprint string, or undefined when unset or storage is unavailable.
 */
export function readStoredFingerprint(): string | undefined {
  try {
    const value = globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.fingerprint)
    return value === null || value === '' ? undefined : value
  } catch {
    return undefined
  }
}

/**
 * Read the stored registered device id for the active pairing.
 * @returns device id, or undefined when unset or storage is unavailable.
 */
export function readStoredDeviceId(): string | undefined {
  try {
    const value = globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.deviceId)
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

/**
 * Read the stored mobile device label.
 * @returns saved label, or undefined when unset or storage is unavailable.
 */
export function readStoredDeviceLabel(): string | undefined {
  try {
    const value = globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.deviceLabel)
    return value === null || value === '' ? undefined : value
  } catch {
    return undefined
  }
}

/**
 * Whether the user explicitly saved a custom device label.
 */
export function readDeviceLabelCustomized(): boolean {
  try {
    return globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.deviceLabelCustomized) === '1'
  } catch {
    return false
  }
}

/**
 * Persist the user-visible mobile device label after an explicit edit.
 * @param label - trimmed display name for this phone.
 */
export function writeStoredDeviceLabel(label: string): void {
  const trimmed = label.trim()
  if (trimmed === '') {
    globalThis.localStorage?.removeItem(MOBILE_STORAGE_KEYS.deviceLabel)
    globalThis.localStorage?.removeItem(MOBILE_STORAGE_KEYS.deviceLabelCustomized)
    return
  }
  globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.deviceLabel, trimmed)
  globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.deviceLabelCustomized, '1')
}

/** Clear stored pairing state (user-visible disconnect). */
export function clearPairingStorage(): void {
  for (const key of PAIRING_ONLY_STORAGE_KEYS) {
    globalThis.localStorage?.removeItem(key)
  }
}
