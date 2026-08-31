/** Resolve Host API base URL for mobile PWA (dev proxy, LAN, tunnel, and native shell). */

import { isLoopbackHostname } from '../loopback-hostname.ts'
import { readStoredHostBase, readStoredServerUrl } from './mobile-session.ts'

/**
 * Whether the page runs inside a native Capacitor shell rather than a browser tab.
 */
export function isNativeShell(): boolean {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env
  if (env?.VITE_DSH_NATIVE_SHELL === 'true' || env?.VITE_DSH_NATIVE_SHELL === true) return true
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  if (capacitor?.isNativePlatform?.() === true) return true
  const location = globalThis.location
  if (location === undefined) return false
  return location.protocol === 'capacitor:' || location.protocol === 'ionic:'
}

/**
 * Normalize a user-entered Mobile server URL to a canonical origin.
 * @param raw - hostname, host:port, or full URL.
 * @returns normalized origin, or empty string when invalid.
 */
export function normalizeMobileServerUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const withScheme = trimmed.includes('://') ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return normalizeHostBaseUrl(url.origin)
  } catch {
    return ''
  }
}

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
 * Resolve the configured Mobile deployment origin.
 *
 * Native shell apps require an explicit server URL. Browser PWAs on LAN or
 * tunnel surfaces use the page origin so `/api` stays same-origin through Vite.
 */
export function resolveMobileServerBase(): string | undefined {
  const stored = readStoredServerUrl()
  if (stored !== undefined && stored !== '') {
    return normalizeHostBaseUrl(stored)
  }
  if (isNativeShell()) return undefined
  const location = globalThis.location
  if (location === undefined || location.origin === 'null') return undefined
  if (isLoopbackHostname(location.hostname)) return undefined
  return location.origin
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
  const serverBase = resolveMobileServerBase()
  if (serverBase !== undefined) return serverBase

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

const INTERNAL_ORIGIN = 'http://dsh.internal'

/**
 * Origin the browser Connection client posts and streams against.
 * Prefers a stored pairing Host, then a native-shell server URL, then the page origin.
 */
export function resolveBrowserConnectionOrigin(): string {
  const stored = readStoredHostBase()
  if (stored !== undefined) return resolveMobileApiBase(stored)
  const server = resolveMobileServerBase()
  if (server !== undefined) return server
  const location = (globalThis as { location?: { origin?: string } }).location
  return location?.origin !== undefined && location.origin !== 'null' ? location.origin : INTERNAL_ORIGIN
}
