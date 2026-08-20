import type { SessionSummary } from '@deepseek-ai/dsh-client-connection/client'
import type { PendingInteractionStatus } from '@deepseek-ai/dsh-client-runtime/client'
import {
  IconBrowseOutline16,
  IconListPenOutline16,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  formatSessionRelativeTime,
  mobileSessionStatuses,
} from './mobile-session-status.ts'
import {
  sessionDisplayMeta,
  sessionDisplayTitle,
  sessionSearchMeta,
  formatSessionSearchTime,
} from './session-label.ts'
import css from './mobile-shell.module.css'

/** Props for {@link TaskHomeRow}. */
export interface TaskHomeRowProps {
  /** One session.list row. */
  item: SessionSummary
  /** Live pending-interaction status from the mux tracker. */
  pendingInteraction?: PendingInteractionStatus
  /** Optional Host label for metadata fallback. */
  hostLabel?: string | undefined
  /** Home list or search-result layout. */
  variant?: 'home' | 'search' | undefined
  /** Open the chat session. */
  onOpen: () => void
}

/**
 * Render one mobile task list row aligned with desktop session rows.
 * @param props - session row data and open handler.
 */
export function TaskHomeRow({
  item,
  pendingInteraction,
  hostLabel,
  variant = 'home',
  onOpen,
}: TaskHomeRowProps): JSX.Element {
  const search = variant === 'search'
  const statuses = mobileSessionStatuses({
    running: item.running,
    ...(pendingInteraction !== undefined ? { pendingInteraction } : {}),
  })
  const primaryStatus = statuses[0]
  const showStatus = primaryStatus !== undefined

  return (
    <li>
      <button
        type="button"
        className={search ? css.taskHomeSearchRowItem : css.taskHomeRow}
        onClick={onOpen}
      >
        <span
          className={showStatus ? css.taskHomeStatusSlot : (search ? css.taskHomeSearchIconBox : css.taskHomeIconBox)}
          aria-hidden={showStatus ? undefined : true}
        >
          {showStatus
            ? <StateDot state={primaryStatus.state} size={10} />
            : <IconBrowseOutline16 size={search ? 16 : 18} />}
        </span>
        <span className={css.taskHomeRowBody}>
          <span className={css.taskHomeRowTop}>
            <span className={css.taskHomeTitle}>{sessionDisplayTitle(item)}</span>
            {!search && !item.blank && (
              <span className={css.taskHomeTime}>{formatSessionRelativeTime(item.updatedAt)}</span>
            )}
          </span>
          {search ? (
            <span className={css.taskHomeSearchMeta}>
              <span className={css.taskHomeSearchMetaLead}>
                <IconListPenOutline16 size={12} />
                <span>{sessionSearchMeta(item)}</span>
              </span>
              <span className={css.taskHomeTime}>{formatSessionSearchTime(item.updatedAt)}</span>
            </span>
          ) : (
            <span className={css.taskHomeMeta}>
              {sessionDisplayMeta(item, hostLabel)}
              {showStatus ? ` · ${primaryStatus.label}` : ''}
            </span>
          )}
          {showStatus && (
            <span className={css.taskHomeStatusA11y}>{primaryStatus.label}</span>
          )}
        </span>
      </button>
    </li>
  )
}
