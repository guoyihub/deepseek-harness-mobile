/** Chat working-state helpers and command-row projection used by mobile chrome. */

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
 * Whether the composer should show a stop control.
 * @param running - Session running bit.
 * @param snapshot - Chat target snapshot.
 * @param sending - local prompt admission in flight.
 */
export function deriveAgentWorkingFromSnapshot(
  running: boolean,
  snapshot: { readonly chat: ChatSnapshot; readonly running: boolean },
  sending: boolean,
): boolean {
  if (sending) return true
  if (running || snapshot.running) return true
  for (const key of snapshot.chat.order) {
    const node = snapshot.chat.nodes.get(key) as ChatNode | undefined
    if (node?.kind === 'assistant-step' && node.data.status === 'running') return true
  }
  return false
}
