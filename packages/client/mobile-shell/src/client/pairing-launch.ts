/** Detect QR deep-link launches (`/mobile/pair?t=…`) for the mobile PWA shell. */

/** Parsed launch context from the current page URL. */
export interface PairingLaunchContext {
  /** Full QR URL or query string to feed into {@link parsePairingInput}. */
  initialRaw?: string
  /** Whether the shell should open the pairing page on boot. */
  startPairPage: boolean
}

/**
 * Read pairing parameters from the current location.
 * Supports paths like `/mobile/pair?t=<token>&e=…&f=…`.
 */
export function readPairingLaunchContext(): PairingLaunchContext {
  const location = globalThis.location
  if (location === undefined) return { startPairPage: false }
  const url = new URL(location.href)
  const normalizedPath = url.pathname.replace(/\/+$/, '') || '/'
  const onPairPath = normalizedPath === '/mobile/pair' || normalizedPath.endsWith('/mobile/pair')
  const hasToken = url.searchParams.has('t')
  if (!onPairPath && !hasToken) return { startPairPage: false }
  const hostUrl = new URL(url.href)
  // Pairing API lives on the Host (:3080); rewrite mobile dev origin to Host port.
  if (hostUrl.port === '8030') hostUrl.port = '3080'
  return { startPairPage: true, initialRaw: hostUrl.href }
}
