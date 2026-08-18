/** Resolve Host API base URL for mobile PWA (dev proxy, LAN, and tunnel). */

import { isLoopbackHostname } from '../loopback-hostname.ts'

/**
 * Downgrade legacy https loopback URLs to http for the plain-HTTP M1 Host.
 * @param baseUrl - configured Host origin.
 */
export function normalizeHostBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl)
    if (url.protocol === 'https:' && isLoopbackHostname(url.hostname)) {
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
 *
 * Prefer the page origin whenever the phone is already on a reachable Mobile
 * surface (LAN Vite or tunnel): `/api` and WS upgrades then hit the local
 * reverse proxy instead of Host bind authority baked into an old QR.
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
    // Phone on tunnel / LAN PWA: always same-origin through the Vite proxy.
    if (!isLoopbackHostname(page.hostname)) {
      return location.origin
    }
    // Local Vite on loopback (:8030) still proxies to Host (:3080).
    // Pairing QR may store 127.0.0.1 while the dev page is localhost (or vice versa).
    if (isLoopbackHostname(target.hostname) && isLoopbackHostname(page.hostname) && target.port !== page.port) {
      return location.origin
    }
  } catch {
    return normalized
  }
  return normalized
}
