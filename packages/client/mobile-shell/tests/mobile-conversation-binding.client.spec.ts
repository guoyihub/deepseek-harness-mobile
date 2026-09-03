import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { MutableSessionEventSource } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import { bindMobileConversation } from '../src/client/mobile-conversation-binding.ts'
import { getMobileConversationRuntime } from '../src/client/mobile-conversation-runtime.ts'

function liveEvent(
  seq: number,
  type: string,
  data: unknown,
  extra: Record<string, unknown> = {},
) {
  return {
    type: 'event' as const,
    event: {
      seq,
      time: 1_700_000_000_000 + seq,
      type,
      data,
      ...extra,
    } as unknown as SessionEvent,
  }
}

describe('bindMobileConversation', () => {
  it('activates the chat target so transcript nodes are materialized', async () => {
    const runtime = await getMobileConversationRuntime()
    const feed = new MutableSessionEventSource()
    feed.replace([
      liveEvent(1, 'turn/start', { turn: 1 }),
      liveEvent(2, 'user/message', {
        id: 'user-1',
        role: 'user',
        content: [{ type: 'text', text: 'hello mobile' }],
        source: { kind: 'user' },
      }, { surfaceOp: 'append' }),
    ], false)

    const binding = bindMobileConversation(feed, runtime.events, runtime.views)
    const chat = binding.snapshot.getSnapshot().views.get('chat') as ChatSnapshot | undefined

    expect(chat).toBeDefined()
    expect(chat?.order.length).toBeGreaterThan(0)
    binding.dispose()
  })
})
