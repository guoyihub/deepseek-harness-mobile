/**
 * Cordis conversation registries for the mobile PWA: Chat + Trajectory
 * Definitions used by the Session event-window assembler.
 */
import { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation/assembly.ts'
import { registerConversationNodes } from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/register.ts'
import { registerTrajectoryAssistantDefinition } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-assistant-definition.ts'
import { registerTrajectoryCompactionDefinitions } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-compaction-definition.ts'
import { registerTrajectoryMessageDefinitions } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-message-definitions.ts'
import { registerTrajectoryRequestHeaderDefinition } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-request-header-definition.ts'
import { registerTrajectoryConversationView } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-snapshot-builder.ts'
import { registerTrajectoryToolDefinition } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-tool-definition.ts'

export interface MobileConversationRuntime {
  readonly events: UiConversation['events']
  readonly views: UiConversation['views']
}

let runtimePromise: Promise<MobileConversationRuntime> | undefined

const stubSessions = {
  binding: () => undefined,
} as unknown as ISessions

/**
 * Boot (once) the mobile conversation registries with Chat + Trajectory Definitions.
 * @returns Event + View registry pair for Session conversation assembly.
 */
export function getMobileConversationRuntime(): Promise<MobileConversationRuntime> {
  runtimePromise ??= (async () => {
    const ctx = new Context()
    new UiConversation(ctx, stubSessions)
    registerConversationNodes(ctx)
    registerTrajectoryMessageDefinitions(ctx)
    registerTrajectoryRequestHeaderDefinition(ctx)
    registerTrajectoryAssistantDefinition(ctx)
    registerTrajectoryToolDefinition(ctx)
    registerTrajectoryCompactionDefinitions(ctx)
    registerTrajectoryConversationView(ctx)
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
