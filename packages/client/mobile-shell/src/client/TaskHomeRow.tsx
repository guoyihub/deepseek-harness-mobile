import type { SessionSummary } from '@deepseek-ai/dsh-client-connection/client'
import {
  IconBrowseOutline16,
  IconListPenOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  formatSessionListTime,
  formatSessionSearchTime,
  sessionDisplayMeta,
  sessionDisplayTitle,
  sessionSearchMeta,
} from './session-label.ts'
import css from './mobile-shell.module.css'

/** Props for {@link TaskHomeRow}. */
export interface TaskHomeRowProps {
  /** One session.list row. */
  item: SessionSummary
  /** Optional Host label for metadata fallback. */
  hostLabel?: string | undefined
  /** Home list or search-result layout. */
  variant?: 'home' | 'search' | undefined
  /** Open the chat session. */
  onOpen: () => void
}

/**
 * Render one iOS-style task list row.
 * @param props - session row data and open handler.
 */
export function TaskHomeRow({
  item,
  hostLabel,
  variant = 'home',
  onOpen,
}: TaskHomeRowProps): JSX.Element {
  const search = variant === 'search'

  return (
    <li>
      <button
        type="button"
        className={search ? css.taskHomeSearchRowItem : css.taskHomeRow}
        onClick={onOpen}
      >
        <span className={search ? css.taskHomeSearchIconBox : css.taskHomeIconBox} aria-hidden="true">
          <IconBrowseOutline16 size={search ? 16 : 18} />
        </span>
        <span className={css.taskHomeRowBody}>
          <span className={css.taskHomeRowTop}>
            <span className={css.taskHomeTitle}>{sessionDisplayTitle(item)}</span>
            {!search && (
              <span className={css.taskHomeTime}>{formatSessionListTime(item.updatedAt)}</span>
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
              {item.running ? ' · 运行中' : ''}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}
