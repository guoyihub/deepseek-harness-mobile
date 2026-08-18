import { useEffect, useMemo, useRef } from 'react'
import type { SessionId, SessionSummary } from '@deepseek-ai/dsh-client-connection/client'
import {
  IconCloseOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { sessionDisplayTitle } from './session-label.ts'
import { TaskHomeRow } from './TaskHomeRow.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link TaskHomeSearchOverlay}. */
export interface TaskHomeSearchOverlayProps {
  /** Current search query. */
  query: string
  /** All sessions to filter locally by title. */
  sessions: readonly SessionSummary[]
  /** Update the search query. */
  onQueryChange: (query: string) => void
  /** Close the overlay and clear the query. */
  onClose: () => void
  /** Open one matching chat session. */
  onOpenChat: (sessionId: SessionId) => void
}

/**
 * Full-screen task search: capsule field, circular close, and title-filtered rows.
 * @param props - query, session list, and navigation callbacks.
 */
export function TaskHomeSearchOverlay({
  query,
  sessions,
  onQueryChange,
  onClose,
  onOpenChat,
}: TaskHomeSearchOverlayProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return sessions
    return sessions.filter(item => sessionDisplayTitle(item).toLowerCase().includes(needle))
  }, [query, sessions])

  return (
    <div className={css.page}>
      <header className={css.taskHomeSearchHeader}>
        <label className={css.taskHomeSearchField}>
          <span className={css.taskHomeSearchGlyph} aria-hidden="true">
            <IconSearchOutline16 size={16} />
          </span>
          <input
            ref={inputRef}
            className={css.taskHomeSearchInput}
            type="search"
            value={query}
            placeholder="搜索消息"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label="搜索消息"
            onChange={(event) => { onQueryChange(event.target.value) }}
          />
        </label>
        <button
          type="button"
          className={css.taskHomeSearchClose}
          aria-label="关闭搜索"
          onClick={onClose}
        >
          <IconCloseOutline16 size={14} />
        </button>
      </header>
      <div className={css.taskHomeSearchBody}>
        {matches.length === 0 ? (
          <div className={css.taskHomeEmpty}>没有匹配的任务</div>
        ) : (
          <ul className={css.taskHomeSearchList}>
            {matches.map(item => (
              <TaskHomeRow
                key={item.sessionId}
                item={item}
                variant="search"
                onOpen={() => { onOpenChat(item.sessionId) }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
