import { useState, type ReactNode } from 'react'
import {
  DisclosureRow,
  IconApiOutline14,
  IconBrowseOutline16,
  IconCodeOutline16,
  IconEditOutline16,
  IconSearchOutline16,
  IconSparkle16,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  toolRowModel,
  type ToolRowState,
  type ToolRowVariant,
} from '@deepseek-ai/dsh-client-ui-tool/src/client/tool/models/tool-call-model.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

const VARIANT_ICONS: Record<ToolRowVariant, ReactNode> = {
  search: <IconSearchOutline16 size={14} />,
  read: <IconBrowseOutline16 size={14} />,
  bash: <IconApiOutline14 size={14} />,
  write: <IconEditOutline16 size={14} />,
  edit: <IconEditOutline16 size={14} />,
  code: <IconCodeOutline16 size={14} />,
  others: <IconSparkle16 size={14} />,
}

function leadingFor(state: ToolRowState, variant: ToolRowVariant): ReactNode {
  switch (state) {
    case 'error':
      return <StateDot state="error" />
    case 'stopped':
      return <StateDot state="warning" />
    default:
      return VARIANT_ICONS[variant]
  }
}

function stateStatus(state: ToolRowState): string | null {
  switch (state) {
    case 'running':
      return mobileConversationT('row.running')
    case 'error':
      return mobileConversationT('row.failed')
    case 'stopped':
      return mobileConversationT('row.stopped')
    default:
      return null
  }
}

/** Props for {@link MobileToolRow}. */
export interface MobileToolRowProps {
  /** Wire tool name from the paired tool/call event. */
  toolName: string
  /** Running or settled call slice. */
  block: ToolCallBlock
}

/**
 * Render one tool call as the left-aligned disclosure row shared with desktop.
 * @param props - tool name and call block.
 */
export function MobileToolRow({ toolName, block }: MobileToolRowProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const model = toolRowModel(toolName, block)
  const summary = model.state === 'error' && model.errorSummary !== null
    ? model.errorSummary
    : model.summary
  const expandable = model.body !== null || model.output !== null
  const a11y = stateStatus(model.state)

  return (
    <div className={css.toolRoot} data-state={model.state}>
      {a11y !== null && <span className={css.toolA11y}>{a11y}</span>}
      <DisclosureRow
        rowClassName={css.toolRow}
        chevronClassName={css.contextChevron}
        icon={leadingFor(model.state, model.variant)}
        title={model.title}
        open={expanded}
        expandable={expandable}
        expandOnRowClick={expandable}
        onToggle={() => { setExpanded(value => !value) }}
        collapsedContent={(
          <>
            <span className={css.contextSep} aria-hidden />
            <span className={css.toolSummary}>{summary}</span>
          </>
        )}
      >
        {model.body !== null && (
          <div className={css.toolSection}>
            <div className={css.toolSectionLabel}>IN</div>
            <pre className={css.toolSectionBody}>{model.body}</pre>
          </div>
        )}
        {model.output !== null && (
          <div className={css.toolSection}>
            <div className={css.toolSectionLabel}>OUT</div>
            <pre className={css.toolSectionBody}>{model.output}</pre>
          </div>
        )}
      </DisclosureRow>
    </div>
  )
}
