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
 *
 * Keep the page origin as-is: Mobile Vite (LAN or tunnel) proxies `/api` and
 * WebSocket upgrades to Host, so rewriting to `:3080` would break phones.
 */
export function readPairingLaunchContext(): PairingLaunchContext {
  const location = globalThis.location
  if (location === undefined) return { startPairPage: false }
  const url = new URL(location.href)
  const normalizedPath = url.pathname.replace(/\/+$/, '') || '/'
  const onPairPath = normalizedPath === '/mobile/pair' || normalizedPath.endsWith('/mobile/pair')
  const hasToken = url.searchParams.has('t')
  if (!onPairPath && !hasToken) return { startPairPage: false }
  return { startPairPage: true, initialRaw: url.href }
}
