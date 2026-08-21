import { useState, type ReactNode } from 'react'
import { DisclosureRow, IconApiOutline14, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { CommandChatRow } from './chat-projection.ts'
import { localizeCommandOutcome } from './mobile-command-outcome.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileCommandRow}. */
export interface MobileCommandRowProps {
  row: CommandChatRow
}

type CommandRowState = 'running' | 'ok' | 'error'

function stateOf(outcome: CommandChatRow['outcome']): CommandRowState {
  if (outcome === null) return 'running'
  return outcome.kind === 'error' ? 'error' : 'ok'
}

function leadingFor(state: CommandRowState): ReactNode {
  return state === 'error' ? <StateDot state="error" /> : <IconApiOutline14 size={14} />
}

function runningSummary(name: string | null): string {
  if (name === 'compact') return mobileConversationT('message.compaction.running')
  return mobileConversationT('command.running')
}

function settledSummary(name: string | null, text: string | undefined, kind: 'success' | 'error'): string {
  return localizeCommandOutcome(name, text, kind)
}

/**
 * Render one slash-command lifecycle row aligned with desktop GenericCommandCard.
 * @param props - folded command chat row.
 */
export function MobileCommandRow({ row }: MobileCommandRowProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const state = stateOf(row.outcome)
  const text = row.outcome?.text
  const summary = row.outcome === null
    ? runningSummary(row.name)
    : settledSummary(row.name, text, row.outcome.kind)
  const title = row.name ?? mobileConversationT('command.title')
  const body = text !== undefined && text.includes('\n') ? text : null
  const open = expanded && body !== null
  const a11y = state === 'running'
    ? mobileConversationT('row.running')
    : state === 'error'
      ? mobileConversationT('row.failed')
      : null

  return (
    <div className={css.toolRoot} data-state={state}>
      {a11y !== null && <span className={css.toolA11y}>{a11y}</span>}
      <DisclosureRow
        rowClassName={css.toolRow}
        chevronClassName={css.contextChevron}
        icon={leadingFor(state)}
        title={title}
        open={open}
        expandable={body !== null}
        expandOnRowClick={body !== null}
        keepContentWhenOpen
        onToggle={() => { setExpanded(value => !value) }}
        collapsedContent={(
          <>
            <span className={css.contextSep} aria-hidden />
            <span className={css.toolSummary} data-error={state === 'error' || undefined}>{summary}</span>
          </>
        )}
      >
        {body !== null && (
          <pre className={css.toolSectionBody} data-error={state === 'error' || undefined}>{body}</pre>
        )}
      </DisclosureRow>
    </div>
  )
}
