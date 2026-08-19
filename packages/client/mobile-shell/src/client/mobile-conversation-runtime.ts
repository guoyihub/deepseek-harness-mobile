/**
 * Cordis conversation registries for the mobile PWA: Event + View Definitions
 * used by Session's assembler. Registers the desktop Trajectory Definitions so
 * {@link TrajectoryView} can read `snapshot.views.get('trajectory')`.
 */
import { Context } from '@deepseek-ai/cordis'
import {
  ConversationEventRegistry,
  ConversationViewRegistry,
  type ConversationRuntime,
} from '@deepseek-ai/dsh-client-runtime/client'
import { registerTrajectoryAssistantDefinition } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-assistant-definition.ts'
import { registerTrajectoryCompactionDefinitions } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-compaction-definition.ts'
import { registerTrajectoryMessageDefinitions } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-message-definitions.ts'
import { registerTrajectoryRequestHeaderDefinition } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-request-header-definition.ts'
import { registerTrajectoryConversationView } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-snapshot-builder.ts'
import { registerTrajectoryToolDefinition } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/trajectory-tool-definition.ts'

let runtimePromise: Promise<ConversationRuntime> | undefined

/**
 * Boot (once) the mobile conversation registries with Trajectory Definitions.
 * @returns Event + View registry pair for {@link Session} construction.
 */
export function getMobileConversationRuntime(): Promise<ConversationRuntime> {
  runtimePromise ??= (async () => {
    const ctx = new Context()
    await ctx.plugin(ConversationEventRegistry).await()
    await ctx.plugin(ConversationViewRegistry).await()
    registerTrajectoryMessageDefinitions(ctx)
    registerTrajectoryRequestHeaderDefinition(ctx)
    registerTrajectoryAssistantDefinition(ctx)
    registerTrajectoryToolDefinition(ctx)
    registerTrajectoryCompactionDefinitions(ctx)
    registerTrajectoryConversationView(ctx)
    return {
      events: ctx.conversationEvents,
      views: ctx.conversationViews,
    }
  })()
  return runtimePromise
}
