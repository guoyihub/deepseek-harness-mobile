/** Resolve Host API base URL for mobile PWA (Vite dev proxy vs direct LAN). */

/**
 * Whether the configured Host authority is loopback.
 * @param hostname - URL hostname.
 */
export function isLoopbackHost(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]'
}

/**
 * Downgrade legacy https loopback URLs to http for the plain-HTTP M1 Host.
 * @param baseUrl - configured Host origin.
 */
export function normalizeHostBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl)
    if (url.protocol === 'https:' && isLoopbackHost(url.hostname)) {
      url.protocol = 'http:'
      return url.origin
    }
  } catch {
    return baseUrl
  }
  return baseUrl
}

/**
 * Base URL for browser fetch/WebSocket calls.
 * During Vite dev, when the page origin differs from the configured Host port,
 * same-origin `/api` proxy on the dev server is used instead of cross-port calls.
 * @param configured - stored Host origin from pairing.
 */
export function resolveMobileApiBase(configured: string | undefined): string {
  if (configured === undefined || configured === '') {
    return globalThis.location?.origin ?? 'http://127.0.0.1:3080'
  }
  const normalized = normalizeHostBaseUrl(configured)
  const location = globalThis.location
  if (location === undefined) return normalized
  try {
    const target = new URL(normalized)
    const page = new URL(location.href)
    if (target.hostname === page.hostname && target.port !== page.port) {
      return location.origin
    }
  } catch {
    return normalized
  }
  return normalized
}
