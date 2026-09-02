import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { EMPTY_CONVERSATION_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-conversation/client'

const sessionId = 'sess-cache' as SessionId

const mockBinding = {
  snapshot: {
    getSnapshot: vi.fn(() => EMPTY_CONVERSATION_SNAPSHOT),
    subscribe: vi.fn(() => () => {}),
  },
  dispose: vi.fn(),
}

const mockSession = {
  getSnapshot: vi.fn(() => ({ openState: 'cold' as const })),
  resync: vi.fn(async () => {}),
  dispose: vi.fn(async () => {}),
  eventSource: {},
}

vi.mock('@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts', () => ({
  Session: vi.fn(function Session(this: unknown) {
    return mockSession
  }),
}))

vi.mock('../src/client/mobile-conversation-runtime.ts', () => ({
  getMobileConversationRuntime: vi.fn(async () => ({
    events: {},
    views: {},
  })),
}))

vi.mock('../src/client/mobile-conversation-binding.ts', () => ({
  bindMobileConversation: vi.fn(() => mockBinding),
}))

const generationListeners = new Set<() => void>()
let generation: { id: number; host: { home: string } } | undefined = { id: 1, host: { home: '/tmp' } }

vi.mock('../src/client/mobile-stream-runtime.ts', () => ({
  mobileSessionRemotes: {},
  getConnectionGeneration: () => generation,
  subscribeConnectionGeneration: (listener: () => void) => {
    generationListeners.add(listener)
    return () => { generationListeners.delete(listener) }
  },
}))

function publishGeneration(next: typeof generation): void {
  generation = next
  for (const listener of [...generationListeners]) listener()
}

describe('mobile-session-cache', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    generation = { id: 1, host: { home: '/tmp' } }
    const cache = await import('../src/client/mobile-session-cache.ts')
    cache.clearMobileSessionCache()
  })

  it('reuses one binding across acquire and release without disposing', async () => {
    const cache = await import('../src/client/mobile-session-cache.ts')
    const binding = await import('../src/client/mobile-conversation-binding.ts')

    const first = await cache.acquireMobileSession(sessionId)
    cache.releaseMobileSession(sessionId)
    const second = await cache.acquireMobileSession(sessionId)

    expect(first.binding).toBe(second.binding)
    expect(binding.bindMobileConversation).toHaveBeenCalledTimes(1)
    expect(mockBinding.dispose).not.toHaveBeenCalled()
  })

  it('clears every entry when the Connection generation is lost', async () => {
    const cache = await import('../src/client/mobile-session-cache.ts')
    await cache.acquireMobileSession(sessionId)
    publishGeneration(undefined)
    expect(cache.getCachedMobileSession(sessionId)).toBeUndefined()
  })

  it('evicts unpinned entries once the LRU cap is exceeded', async () => {
    const cache = await import('../src/client/mobile-session-cache.ts')
    for (let index = 0; index < 9; index += 1) {
      const id = `sess-${index}` as SessionId
      await cache.acquireMobileSession(id)
      cache.releaseMobileSession(id)
    }
    expect(cache.getCachedMobileSession('sess-0' as SessionId)).toBeUndefined()
    expect(cache.getCachedMobileSession('sess-8' as SessionId)).toBeDefined()
  })
})
