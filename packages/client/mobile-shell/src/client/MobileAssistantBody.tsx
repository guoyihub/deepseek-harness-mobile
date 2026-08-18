import { memo, useMemo } from 'react'
import type { AssistantBlock } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/conversation.ts'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileConversationT } from './mobile-locale.ts'
import { MobileReasoningRow } from './MobileReasoningRow.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link MobileAssistantBody}. */
export interface MobileAssistantBodyProps {
  /** Classified assistant blocks in source order. */
  blocks: readonly AssistantBlock[]
  /** Whether the owning turn is still streaming. */
  streaming: boolean
}

/**
 * Render assistant text and reasoning blocks with the same disclosure chrome as desktop.
 * @param props - blocks and streaming state.
 */
export const MobileAssistantBody = memo(function MobileAssistantBody({
  blocks,
  streaming,
}: MobileAssistantBodyProps) {
  const codeLabels = useMemo(
    () => ({ copyLabel: mobileConversationT('copy'), copiedLabel: mobileConversationT('copied') }),
    [],
  )
  const last = blocks.length - 1
  const visible = streaming || blocks.some(block => block.kind !== 'tool-call' && (
    block.kind !== 'text' && block.kind !== 'reasoning' ? true : block.text.trim() !== ''
  ))
  if (!visible) return null

  return (
    <div className={css.assistantBody} data-streaming={streaming || undefined}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'text':
            if (block.text.trim() === '') return null
            return (
              <MarkdownText
                key={index}
                text={block.text}
                streaming={streaming}
                codeLabels={codeLabels}
              />
            )
          case 'reasoning':
            if (block.text.trim() === '') return null
            return (
              <MobileReasoningRow
                key={index}
                text={block.text}
                running={streaming && index === last}
              />
            )
          case 'tool-call':
            return null
          default:
            return null
        }
      })}
    </div>
  )
})
