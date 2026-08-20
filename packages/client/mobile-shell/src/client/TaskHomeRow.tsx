import { useCallback, useRef, useState } from 'react'
import type { SessionSummary } from '@deepseek-ai/dsh-client-connection/client'
import type { PendingInteractionStatus } from '@deepseek-ai/dsh-client-runtime/client'
import {
  IconArchiveOutline20,
  IconBranchOutline16,
  IconBrowseOutline16,
  IconCheckOutline14,
  IconChecklistOutline14,
  IconChevronUpOutline14,
  IconEditOutline16,
  IconEllipsisOutline16,
  Menu,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  formatSessionRelativeTime,
  mobileSessionStatuses,
} from './mobile-session-status.ts'
import {
  sessionDisplayMeta,
  sessionDisplayTitle,
  sessionSearchMeta,
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
  /** Search-result workspace label (Host registry title). */
  workspaceLabel?: string | undefined
  /** Optional Host content-match excerpt. */
  snippet?: string | undefined
  /** Whether the home list is in multi-select mode. */
  selecting?: boolean | undefined
  /** Whether this row is selected while selecting. */
  selected?: boolean | undefined
  /** Open the chat session (ignored while selecting). */
  onOpen: () => void
  /** Toggle selection while selecting. */
  onToggleSelect?: (() => void) | undefined
  /** Enter multi-select with this row pre-selected. */
  onEnterSelect?: (() => void) | undefined
  /** Open the rename dialog. */
  onRename?: (() => void) | undefined
  /** Fork at the last completed turn. */
  onFork?: (() => void) | undefined
  /** Pin this session to the top of its workspace. */
  onPin?: (() => void) | undefined
  /** Archive this session. */
  onArchive?: (() => void) | undefined
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
  workspaceLabel,
  snippet,
  selecting = false,
  selected = false,
  onOpen,
  onToggleSelect,
  onEnterSelect,
  onRename,
  onFork,
  onPin,
  onArchive,
}: TaskHomeRowProps): JSX.Element {
  const search = variant === 'search'
  const statuses = mobileSessionStatuses({
    running: item.running,
    ...(pendingInteraction !== undefined ? { pendingInteraction } : {}),
  })
  const primaryStatus = statuses[0]
  const showStatus = primaryStatus !== undefined
  const [menuOpen, setMenuOpen] = useState(false)
  const menuAnchorRef = useRef<HTMLButtonElement>(null)
  const actionsEnabled = !search && !item.blank && !selecting
    && onRename !== undefined && onFork !== undefined && onArchive !== undefined

  const menuItems: MenuEntry[] = [
    { id: 'rename', label: '重命名', icon: <IconEditOutline16 size={16} /> },
    { id: 'fork', label: '分叉会话', icon: <IconBranchOutline16 size={16} /> },
    ...(onPin !== undefined
      ? [{ id: 'pin', label: '置顶', icon: <IconChevronUpOutline14 size={14} /> } satisfies MenuEntry]
      : []),
    { id: 'select', label: '多选', icon: <IconChecklistOutline14 size={14} /> },
    { id: 'archive', label: '归档会话', icon: <IconArchiveOutline20 size={16} /> },
  ]

  const getAnchorRect = useCallback(
    () => menuAnchorRef.current?.getBoundingClientRect() ?? null,
    [],
  )

  const onRowActivate = (): void => {
    if (selecting) {
      onToggleSelect?.()
      return
    }
    onOpen()
  }

  return (
    <li>
      <div
        className={search ? css.taskHomeSearchRowItem : css.taskHomeRow}
        data-selected={selected || undefined}
        data-selecting={selecting || undefined}
      >
        <button
          type="button"
          className={css.taskHomeRowMain}
          onClick={onRowActivate}
        >
          {selecting ? (
            <span
              className={css.taskHomeCheck}
              data-checked={selected || undefined}
              aria-hidden="true"
            >
              {selected ? <IconCheckOutline14 size={14} /> : null}
            </span>
          ) : (
            <span
              className={showStatus ? css.taskHomeStatusSlot : (search ? css.taskHomeSearchIconBox : css.taskHomeIconBox)}
              aria-hidden={showStatus ? undefined : true}
            >
              {showStatus
                ? <StateDot state={primaryStatus.state} size={10} />
                : <IconBrowseOutline16 size={search ? 16 : 18} />}
            </span>
          )}
          <span className={css.taskHomeRowBody}>
            <span className={css.taskHomeRowTop}>
              <span className={css.taskHomeTitle}>{sessionDisplayTitle(item)}</span>
              {!search && !item.blank && !selecting && (
                <span className={css.taskHomeTime}>{formatSessionRelativeTime(item.updatedAt)}</span>
              )}
            </span>
            {search ? (
              <span className={css.taskHomeSearchMeta}>
                <span className={css.taskHomeSearchMetaLead}>
                  <span>{workspaceLabel ?? sessionSearchMeta(item)}</span>
                </span>
                {snippet !== undefined && snippet !== '' && (
                  <span className={css.taskHomeSearchSnippet}>{snippet}</span>
                )}
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
        {actionsEnabled && (
          <button
            ref={menuAnchorRef}
            type="button"
            className={css.taskHomeRowMenuButton}
            aria-label={`会话操作：${sessionDisplayTitle(item)}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen(open => !open)
            }}
          >
            <IconEllipsisOutline16 size={16} />
          </button>
        )}
      </div>
      {actionsEnabled && (
        <Menu
          open={menuOpen}
          anchor={null}
          items={menuItems}
          portal
          side="bottom"
          getAnchorRect={getAnchorRect}
          onClose={() => { setMenuOpen(false) }}
          onSelect={(id) => {
            setMenuOpen(false)
            if (id === 'rename') onRename?.()
            if (id === 'fork') onFork?.()
            if (id === 'pin') onPin?.()
            if (id === 'select') onEnterSelect?.()
            if (id === 'archive') onArchive?.()
          }}
        />
      )}
    </li>
  )
}
