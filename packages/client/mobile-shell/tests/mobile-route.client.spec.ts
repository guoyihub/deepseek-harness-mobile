import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { mobileRouteFromHash, mobileRouteToHash } from '../src/client/mobile-route.ts'

const sid = (id: string): SessionId => id as SessionId

describe('mobile-route', () => {
  it('round-trips known routes through the location hash', () => {
    const routes = [
      { page: 'home' as const },
      { page: 'pair' as const },
      { page: 'connection' as const },
      { page: 'server-setup' as const },
      { page: 'server-setup' as const, returnTo: 'connection' as const },
      { page: 'chat' as const, sessionId: sid('sess-1') },
    ]

    for (const route of routes) {
      expect(mobileRouteFromHash(mobileRouteToHash(route))).toEqual(route)
    }
  })
})
