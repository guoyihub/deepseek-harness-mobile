import { useState } from 'react'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import type { ContextProvenanceView, KnownContextForm } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { DisclosureRow, IconBrowseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileContextRow}. */
export interface MobileContextRowProps {
  content: readonly ContentBlock[]
  provenance: ContextProvenanceView
  form: KnownContextForm | null
}

const MAX_CHARS = 20_000

function boundedText(text: string): string {
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n…` : text
}

function bodyText(content: readonly ContentBlock[]): string {
  return boundedText(
    content
      .filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
      .map(block => block.text)
      .join(''),
  )
}

/**
 * Render one logged context injection with desktop-style collapsed disclosure chrome.
 * @param props - durable content and projected provenance.
 */
export function MobileContextRow({ content, provenance, form }: MobileContextRowProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const title = mobileConversationT(
    provenance.role === 'recall' ? 'message.contextRecall' : 'message.contextInjection',
  )

  return (
    <DisclosureRow
      className={css.contextDisclosure}
      icon={<IconBrowseOutline16 size={14} />}
      chevronClassName={css.contextChevron}
      title={title}
      collapsedContent={provenance.label === null ? undefined : (
        <>
          <span className={css.contextSep} aria-hidden />
          <span className={css.contextSource}>{provenance.label}</span>
        </>
      )}
      keepContentWhenOpen
      open={open}
      expandable
      expandOnRowClick
      onToggle={() => { setOpen(value => !value) }}
    >
      <pre className={css.contextBody} data-context-form={form ?? undefined}>{bodyText(content)}</pre>
    </DisclosureRow>
  )
}
