import type { CommandNode } from '@deepseek-ai/dsh-client-runtime/client'
import { mobileConversationT } from './mobile-locale.ts'

const FEEDBACK_TEXT_REQUIRED = 'Feedback text is required. Usage: /feedback <text>'
const COMPACT_EMPTY = 'No compactable history yet.'
const COMPACTED = /^Compacted (\d+) history items \(~(\d+) tokens\)\.$/u

/**
 * Localize one settled slash-command outcome for the mobile chat surface.
 * @param name - command name without `/`, or null when unknown.
 * @param text - handler-authored settlement text from the session log.
 * @param kind - command outcome kind after settlement.
 */
export function localizeCommandOutcome(
  name: string | null,
  text: string | undefined,
  kind: 'success' | 'error',
): string {
  if (name === 'feedback' && kind === 'error' && text === FEEDBACK_TEXT_REQUIRED) {
    return mobileConversationT('command.feedback.required')
  }
  if (name === 'compact' && kind === 'success') {
    if (text === COMPACT_EMPTY) return mobileConversationT('message.compaction.empty')
    const match = text === undefined ? null : COMPACTED.exec(text)
    if (match !== null) {
      return mobileConversationT('message.compaction.completed', {
        items: match[1] ?? '0',
        tokens: match[2] ?? '0',
      })
    }
  }
  return text ?? (kind === 'error'
    ? mobileConversationT('command.failed')
    : mobileConversationT('command.done'))
}

/**
 * Return a command node whose settled outcome text is localized when known.
 * @param node - command conversation node from the session fold.
 */
export function localizeCommandNode(node: CommandNode): CommandNode {
  if (node.outcome === null) return node
  const text = localizeCommandOutcome(node.name, node.outcome.text, node.outcome.kind)
  if (text === node.outcome.text) return node
  return { ...node, outcome: { ...node.outcome, text } }
}
