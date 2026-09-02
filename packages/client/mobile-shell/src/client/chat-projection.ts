/** Chat working-state helpers and command-row projection used by mobile chrome. */

import type { ConversationTimelineSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'

/** Slash-command lifecycle folded from command/run and command/done. */
export interface CommandChatRow {
  id: string
  role: 'command'
  commandId: string
  name: string | null
  outcome: { kind: 'success' | 'error'; text?: string } | null
}

/**
 * Logged `turn/start` time of the latest open Turn, when one exists.
 * @param timeline - Chat conversation timeline.
 */
export function latestOpenTurnStartTime(timeline: ConversationTimelineSnapshot): number | null {
  let latest: number | null = null
  for (const turn of timeline.turns.values()) {
    if (turn.status === 'open' && turn.start !== undefined) latest = turn.start.time
  }
  return latest
}

/**
 * Whether the composer should show a stop control.
 * @param running - Session-list running bit (used only before any Turn is folded).
 * @param snapshot - Chat target snapshot.
 * @param sending - local prompt admission in flight.
 */
export function deriveAgentWorkingFromSnapshot(
  running: boolean,
  snapshot: { readonly chat: ChatSnapshot; readonly running: boolean },
  sending: boolean,
): boolean {
  if (sending) return true
  if (latestOpenTurnStartTime(snapshot.chat.timeline) !== null) return true
  for (const key of snapshot.chat.order) {
    const node = snapshot.chat.nodes.get(key) as ChatNode | undefined
    if (node?.kind === 'assistant-step' && node.data.status === 'running') return true
  }
  // A list `running` bit can arrive after `turn/end`. Trust it only while the
  // fold has not yet published a Turn (first-token wait on a blank session).
  if (snapshot.chat.timeline.turnOrder.length === 0 && (running || snapshot.running)) return true
  return false
}
