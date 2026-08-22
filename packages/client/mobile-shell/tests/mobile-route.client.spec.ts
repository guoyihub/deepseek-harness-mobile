import { describe, expect, it } from 'vitest'
import { mobileRouteFromHash, mobileRouteToHash } from '../src/client/mobile-route.ts'

describe('mobile-route', () => {
  it('round-trips known routes through the location hash', () => {
    const routes = [
      { page: 'home' as const },
      { page: 'pair' as const },
      { page: 'connection' as const },
      { page: 'server-setup' as const },
      { page: 'server-setup' as const, returnTo: 'connection' as const },
      { page: 'chat' as const, sessionId: 'sess-1' },
    ]

    for (const route of routes) {
      expect(mobileRouteFromHash(mobileRouteToHash(route))).toEqual(route)
    }
  })
})
