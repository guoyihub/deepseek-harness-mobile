import { useEffect, useRef, useState } from 'react'
import { DisclosureRow, IconThinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

function firstLine(text: string): string {
  const newline = text.indexOf('\n')
  return newline === -1 ? text : text.slice(0, newline)
}

function latestLine(text: string): string {
  const visible = text.trimEnd()
  const newline = visible.lastIndexOf('\n')
  return newline === -1 ? visible : visible.slice(newline + 1)
}

/** Props for {@link MobileReasoningRow}. */
export interface MobileReasoningRowProps {
  text: string
  running: boolean
}

/**
 * Render one assistant reasoning block as the Think disclosure row.
 * @param props - reasoning text and streaming state.
 */
export function MobileReasoningRow({ text, running }: MobileReasoningRowProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const summaryRef = useRef<HTMLSpanElement>(null)
  const summary = running ? latestLine(text) : firstLine(text)

  useEffect(() => {
    const element = summaryRef.current
    if (element === null) return
    element.scrollLeft = running ? element.scrollWidth - element.clientWidth : 0
  }, [running, summary])

  return (
    <div className={css.reasoningRoot} data-state={running ? 'running' : 'ok'}>
      {running && <span className={css.reasoningA11y}>{mobileConversationT('row.running')}</span>}
      <DisclosureRow
        rowClassName={css.reasoningRow}
        chevronClassName={css.contextChevron}
        icon={<IconThinkOutline14 size={14} />}
        title={mobileConversationT('reasoning.label')}
        open={expanded}
        expandable
        expandOnRowClick
        onToggle={() => { setExpanded(value => !value) }}
        collapsedContent={(
          <>
            <span className={css.contextSep} aria-hidden />
            <span ref={summaryRef} className={css.reasoningSummary} data-follow-end={running || undefined}>
              {summary}
            </span>
          </>
        )}
      >
        <div className={css.reasoningBody}>{text}</div>
      </DisclosureRow>
    </div>
  )
}
