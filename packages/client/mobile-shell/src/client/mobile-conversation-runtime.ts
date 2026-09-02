/**
 * Cordis conversation registries for the mobile PWA chat transcript.
 */
import { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation/assembly.ts'
import { registerConversationNodes } from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/register.ts'

export interface MobileConversationRuntime {
  readonly events: UiConversation['events']
  readonly views: UiConversation['views']
}

let runtimePromise: Promise<MobileConversationRuntime> | undefined

const stubSessions = {
  binding: () => undefined,
} as unknown as ISessions

/**
 * Boot (once) the mobile conversation registries with Chat Definitions.
 * @returns Event + View registry pair for Session conversation assembly.
 */
export function getMobileConversationRuntime(): Promise<MobileConversationRuntime> {
  runtimePromise ??= (async () => {
    const ctx = new Context()
    new UiConversation(ctx, stubSessions)
    registerConversationNodes(ctx)
    const uiConversation = ctx.get('uiConversation') as UiConversation
    return {
      events: uiConversation.events,
      views: uiConversation.views,
    }
  })()
  return runtimePromise
}

/** Warm the Cordis conversation registries before the first chat open. */
export function prefetchMobileConversationRuntime(): void {
  void getMobileConversationRuntime()
}
