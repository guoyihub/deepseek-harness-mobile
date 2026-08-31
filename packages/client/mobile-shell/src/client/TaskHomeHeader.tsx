import { useEffect, useRef, useState } from 'react'
import {
  IconChevronDownOutline14,
  IconCloseFill14,
  IconCloseOutline16,
  IconSearchOutline16,
  IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { sanitizeSearchQuery } from './mobile-session-search.ts'
import { mobileConversationT } from './mobile-locale.ts'
import { TASK_HOME_MOTION_MS } from './task-home-motion.ts'
import css from './mobile-shell.module.css'

/** Task list filter mode for the home surface. */
export type TaskHomeFilter = 'all' | 'running'

/** Props for {@link TaskHomeHeader}. */
export interface TaskHomeHeaderProps {
  /** Whether the device is paired with a Host. */
  paired: boolean
  /** Whether the live Host streams are connected. */
  connected: boolean
  /** Active filter mode. */
  filter: TaskHomeFilter
  /** Whether the inline search field is expanded. */
  searchExpanded: boolean
  /** Current search query. */
  searchQuery: string
  /** Multi-select mode: show selected count and exit control. */
  selecting?: boolean | undefined
  /** Selected session count while selecting. */
  selectedCount?: number | undefined
  /** Exit multi-select mode. */
  onExitSelect?: (() => void) | undefined
  /** Change the filter mode. */
  onFilterChange: (filter: TaskHomeFilter) => void
  /** Expand the inline search capsule. */
  onSearchExpand: () => void
  /** Update the search query (already sanitized by the header). */
  onSearchQueryChange: (query: string) => void
  /** Collapse search and clear the query. */
  onSearchCollapse: () => void
  /** Open connection management. */
  onOpenConnection: () => void
}

function filterLabel(filter: TaskHomeFilter): string {
  return mobileConversationT(filter === 'all' ? 'taskHome.filter.all' : 'taskHome.filter.running')
}

function connectionAriaLabel(paired: boolean, connected: boolean): string {
  if (!paired) return mobileConversationT('connection.title')
  return connected
    ? mobileConversationT('connection.titleConnected')
    : mobileConversationT('connection.titleDisconnected')
}

/**
 * Task home header with filter, inline-expanding search (desktop WorkspaceBrowser),
 * and profile pill.
 * @param props - filter/search state and navigation callbacks.
 */
export function TaskHomeHeader({
  paired,
  connected,
  filter,
  searchExpanded,
  searchQuery,
  selecting = false,
  selectedCount = 0,
  onExitSelect,
  onFilterChange,
  onSearchExpand,
  onSearchQueryChange,
  onSearchCollapse,
  onOpenConnection,
}: TaskHomeHeaderProps): JSX.Element {
  const [filterOpen, setFilterOpen] = useState(false)
  const [visualSearchExpanded, setVisualSearchExpanded] = useState(searchExpanded)
  const filterRef = useRef<HTMLDivElement>(null)
  const searchRoot = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchExpanded) {
      setVisualSearchExpanded(true)
      return
    }
    const timer = window.setTimeout(() => {
      setVisualSearchExpanded(false)
    }, TASK_HOME_MOTION_MS)
    return () => { window.clearTimeout(timer) }
  }, [searchExpanded])

  useEffect(() => {
    if (!filterOpen || selecting || searchExpanded) return
    const onPointerDown = (event: MouseEvent): void => {
      if (filterRef.current?.contains(event.target as Node) !== true) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, [filterOpen, searchExpanded, selecting])

  useEffect(() => {
    if (!searchExpanded) return
    searchInput.current?.focus({ preventScroll: true })
  }, [searchExpanded])

  // Outside-click collapses only when the query is empty (desktop rule).
  useEffect(() => {
    if (!searchExpanded || selecting) return
    const onClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Node) || searchRoot.current?.contains(event.target) === true) return
      searchInput.current?.blur()
      if (searchQuery.trim() !== '') return
      onSearchCollapse()
    }
    document.addEventListener('click', onClick)
    return () => { document.removeEventListener('click', onClick) }
  }, [onSearchCollapse, searchExpanded, searchQuery, selecting])

  const statusClass = !paired
    ? css.taskHomeStatusOffline
    : connected
      ? css.taskHomeStatusOnline
      : css.taskHomeStatusError

  const expandSearch = (): void => {
    if (!paired) return
    setFilterOpen(false)
    onSearchExpand()
  }

  if (selecting) {
    return (
      <header className={css.taskHomeHeader}>
        <div className={css.taskHomeHeaderRow}>
          <h1 className={css.taskHomeSelectTitle}>
            {selectedCount === 0
              ? mobileConversationT('taskHome.selectSession')
              : mobileConversationT('taskHome.selectedCount', { n: selectedCount })}
          </h1>
          <button
            type="button"
            className={css.taskHomeSelectClose}
            aria-label={mobileConversationT('taskHome.exitSelect')}
            onClick={onExitSelect}
          >
            <IconCloseOutline16 size={14} />
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className={css.taskHomeHeader}>
      <div className={css.taskHomeHeaderRow}>
        <div
          className={`${css.taskHomeTitleWrap}${visualSearchExpanded ? ` ${css.taskHomeTitleWrapHidden}` : ''}${filterOpen ? ` ${css.taskHomeTitleWrapFilterOpen}` : ''}`}
          ref={filterRef}
        >
          <button
            type="button"
            className={css.taskHomeTitleButton}
            aria-haspopup="listbox"
            aria-expanded={filterOpen}
            disabled={!paired || searchExpanded}
            tabIndex={searchExpanded ? -1 : 0}
            onClick={() => { setFilterOpen(open => !open) }}
          >
            <span>{filterLabel(filter)}</span>
            <IconChevronDownOutline14 size={14} />
          </button>
          {filterOpen && paired && !searchExpanded && (
            <div className={css.taskHomeFilterMenu} role="listbox">
              {(['all', 'running'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={filter === option}
                  className={css.taskHomeFilterOption}
                  data-active={filter === option || undefined}
                  onClick={() => {
                    onFilterChange(option)
                    setFilterOpen(false)
                  }}
                >
                  {filterLabel(option)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          ref={searchRoot}
          className={`${css.taskHomeTrailing}${visualSearchExpanded ? ` ${css.taskHomeTrailingExpanded}` : ''}`}
        >
          <div
            className={`${css.taskHomeSearch}${visualSearchExpanded ? ` ${css.taskHomeSearchExpanded}` : ''}`}
            onClick={() => {
              expandSearch()
              searchInput.current?.focus({ preventScroll: true })
            }}
          >
            <button
              type="button"
              className={css.taskHomeSearchButton}
              aria-label={mobileConversationT('taskHome.search')}
              aria-expanded={searchExpanded}
              disabled={!paired}
              onClick={(event) => {
                event.stopPropagation()
                expandSearch()
              }}
            >
              <span className={css.taskHomeSearchIcon} aria-hidden="true">
                <IconSearchOutline16 size={16} />
              </span>
            </button>
            <input
              ref={searchInput}
              className={css.taskHomeSearchInput}
              type="text"
              placeholder={mobileConversationT('taskHome.searchPlaceholder')}
              value={searchQuery}
              tabIndex={searchExpanded ? 0 : -1}
              aria-label={mobileConversationT('taskHome.search')}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => {
                onSearchQueryChange(sanitizeSearchQuery(event.target.value))
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return
                onSearchCollapse()
              }}
            />
            <button
              type="button"
              className={css.taskHomeSearchClear}
              aria-label={mobileConversationT('taskHome.clearSearch')}
              tabIndex={searchExpanded ? 0 : -1}
              onClick={(event) => {
                event.stopPropagation()
                onSearchCollapse()
              }}
            >
              <IconCloseFill14 size={14} />
            </button>
          </div>

          <button
            type="button"
            className={`${css.taskHomeAvatarButton}${visualSearchExpanded ? ` ${css.taskHomeAvatarHidden}` : ''}`}
            aria-label={connectionAriaLabel(paired, connected)}
            tabIndex={searchExpanded ? -1 : 0}
            onClick={onOpenConnection}
          >
            <span className={css.taskHomeAvatar}>
              <IconUserOutline16 size={16} />
              <span className={`${css.taskHomeStatusDot} ${statusClass}`} aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
