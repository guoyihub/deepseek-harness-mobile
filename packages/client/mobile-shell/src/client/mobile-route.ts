import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'

/** Mobile shell route discriminant. */
export type MobileRoute =
  | { page: 'server-setup'; returnTo?: 'connection' }
  | { page: 'home' }
  | { page: 'pair' }
  | { page: 'chat'; sessionId: SessionId; draft?: string }
  | { page: 'connection' }

/** Serialized navigation state stored in `history.state`. */
export interface MobileHistoryState {
  mobileRoute: MobileRoute
}

const HOME_HASH = '#/'

/**
 * Encode one mobile route as a location hash.
 * @param route - shell route.
 */
export function mobileRouteToHash(route: MobileRoute): string {
  switch (route.page) {
    case 'home':
      return HOME_HASH
    case 'pair':
      return '#/pair'
    case 'connection':
      return '#/connection'
    case 'server-setup':
      return route.returnTo === 'connection' ? '#/server-setup?from=connection' : '#/server-setup'
    case 'chat':
      return `#/chat/${encodeURIComponent(route.sessionId)}`
    default: {
      const _exhaustive: never = route
      return _exhaustive
    }
  }
}

/**
 * Parse a location hash into a mobile route when recognized.
 * @param hash - `location.hash` value.
 */
export function mobileRouteFromHash(hash: string): MobileRoute | undefined {
  if (hash === '' || hash === HOME_HASH || hash === '#') return { page: 'home' }
  if (hash === '#/pair') return { page: 'pair' }
  if (hash === '#/connection') return { page: 'connection' }
  if (hash === '#/server-setup') return { page: 'server-setup' }
  if (hash === '#/server-setup?from=connection') return { page: 'server-setup', returnTo: 'connection' }
  const chatMatch = /^#\/chat\/([^/?#]+)$/.exec(hash)
  if (chatMatch !== null) {
    const sessionIdRaw = chatMatch[1]
    if (sessionIdRaw === undefined) return undefined
    return { page: 'chat', sessionId: decodeURIComponent(sessionIdRaw) as SessionId }
  }
  return undefined
}

/**
 * Whether two routes describe the same shell page.
 * @param left - first route.
 * @param right - second route.
 */
export function mobileRoutesEqual(left: MobileRoute, right: MobileRoute): boolean {
  if (left.page !== right.page) return false
  switch (left.page) {
    case 'home':
    case 'pair':
    case 'connection':
      return true
    case 'server-setup':
      return left.returnTo === (right as typeof left).returnTo
    case 'chat':
      return left.sessionId === (right as typeof left).sessionId
      && left.draft === (right as typeof left).draft
    default: {
      const _exhaustive: never = left
      return _exhaustive
    }
  }
}
