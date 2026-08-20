import { useEffect, useRef, useState } from 'react'
import {
  IconChevronDownOutline14,
  IconCloseOutline16,
  IconSearchOutline16,
  IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
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
  /** Whether the search overlay is open. */
  searchOpen: boolean
  /** Multi-select mode: show selected count and exit control. */
  selecting?: boolean | undefined
  /** Selected session count while selecting. */
  selectedCount?: number | undefined
  /** Exit multi-select mode. */
  onExitSelect?: (() => void) | undefined
  /** Change the filter mode. */
  onFilterChange: (filter: TaskHomeFilter) => void
  /** Open the search overlay. */
  onSearchOpen: () => void
  /** Open connection management. */
  onOpenConnection: () => void
}

const FILTER_LABELS: Record<TaskHomeFilter, string> = {
  all: '全部任务',
  running: '进行中',
}

function connectionAriaLabel(paired: boolean, connected: boolean): string {
  if (!paired) return '连接管理'
  return connected ? '连接管理，已连接' : '连接管理，未连接'
}

/**
 * Large-title task home header with filter, search, and profile pill.
 * @param props - filter/search state and navigation callbacks.
 */
export function TaskHomeHeader({
  paired,
  connected,
  filter,
  searchOpen,
  selecting = false,
  selectedCount = 0,
  onExitSelect,
  onFilterChange,
  onSearchOpen,
  onOpenConnection,
}: TaskHomeHeaderProps): JSX.Element {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen || selecting) return
    const onPointerDown = (event: MouseEvent): void => {
      if (filterRef.current?.contains(event.target as Node) !== true) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, [filterOpen, selecting])

  const statusClass = !paired
    ? css.taskHomeStatusOffline
    : connected
      ? css.taskHomeStatusOnline
      : css.taskHomeStatusError

  if (selecting) {
    return (
      <header className={css.taskHomeHeader}>
        <div className={css.taskHomeHeaderRow}>
          <h1 className={css.taskHomeSelectTitle}>
            {selectedCount === 0 ? '选择会话' : `已选择 ${selectedCount} 个会话`}
          </h1>
          <button
            type="button"
            className={css.taskHomeSelectClose}
            aria-label="退出多选"
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
        <div className={css.taskHomeTitleWrap} ref={filterRef}>
          <button
            type="button"
            className={css.taskHomeTitleButton}
            aria-haspopup="listbox"
            aria-expanded={filterOpen}
            disabled={!paired}
            onClick={() => { setFilterOpen(open => !open) }}
          >
            <span>{FILTER_LABELS[filter]}</span>
            <IconChevronDownOutline14 size={14} />
          </button>
          {filterOpen && paired && (
            <div className={css.taskHomeFilterMenu} role="listbox">
              {(Object.keys(FILTER_LABELS) as TaskHomeFilter[]).map(option => (
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
                  {FILTER_LABELS[option]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={css.taskHomeActionPill}>
          <button
            type="button"
            className={css.taskHomePillButton}
            aria-label="搜索任务"
            disabled={!paired}
            aria-pressed={searchOpen}
            onClick={onSearchOpen}
          >
            <IconSearchOutline16 size={16} />
          </button>
          <button
            type="button"
            className={css.taskHomeAvatarButton}
            aria-label={connectionAriaLabel(paired, connected)}
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
