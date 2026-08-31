import { useCallback, useRef, useState } from 'react'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { GroupNode } from '@deepseek-ai/dsh-client-ui-workspace/src/client/tree.ts'
import {
  IconChevronDownOutline14,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconFolderClose16,
  IconFolderOpen16,
  IconTrashOutline16,
  Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { groupDisplayLabel } from './mobile-task-groups.ts'
import css from './mobile-shell.module.css'

/** Props for {@link TaskHomeGroupHeader}. */
export interface TaskHomeGroupHeaderProps {
  /** Derived workspace section. */
  group: GroupNode
  /** Toggle expand/collapse for this group. */
  onToggle: () => void
  /** Open rename dialog for a real workspace group. */
  onRename?: ((workspaceId: WorkspaceId, title: string) => void) | undefined
  /** Open delete confirmation for a real workspace group. */
  onDelete?: ((workspaceId: WorkspaceId, title: string) => void) | undefined
}

/**
 * Collapsible workspace-group header with optional rename/delete actions.
 * @param props - group metadata and handlers.
 */
export function TaskHomeGroupHeader({
  group,
  onToggle,
  onRename,
  onDelete,
}: TaskHomeGroupHeaderProps): JSX.Element {
  const label = groupDisplayLabel(group)
  const actionsEnabled = group.workspaceId !== undefined
    && onRename !== undefined
    && onDelete !== undefined
  const [menuOpen, setMenuOpen] = useState(false)
  const menuAnchorRef = useRef<HTMLButtonElement>(null)

  const menuItems: MenuEntry[] = [
    { id: 'rename', label: '重命名分组', icon: <IconEditOutline16 size={16} /> },
    { id: 'delete', label: '删除分组', icon: <IconTrashOutline16 size={16} />, danger: true },
  ]

  const getAnchorRect = useCallback(
    () => menuAnchorRef.current?.getBoundingClientRect() ?? null,
    [],
  )

  return (
    <div className={css.taskHomeGroupHeader}>
      <button
        type="button"
        className={css.taskHomeGroupToggle}
        aria-expanded={group.expanded}
        onClick={onToggle}
      >
        <span
          className={css.taskHomeGroupChevron}
          data-expanded={group.expanded || undefined}
          aria-hidden
        >
          <IconChevronDownOutline14 size={14} />
        </span>
        <span className={css.taskHomeGroupFolder} aria-hidden>
          {group.expanded ? <IconFolderOpen16 size={16} /> : <IconFolderClose16 size={16} />}
        </span>
        <span className={css.taskHomeGroupTitle}>{label}</span>
      </button>
      {actionsEnabled && (
        <>
          <button
            ref={menuAnchorRef}
            type="button"
            className={css.taskHomeGroupMenuButton}
            aria-label={`分组操作：${label}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen(open => !open)
            }}
          >
            <IconEllipsisOutline16 size={16} />
          </button>
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
              if (group.workspaceId === undefined) return
              if (id === 'rename') onRename?.(group.workspaceId, label)
              if (id === 'delete') onDelete?.(group.workspaceId, label)
            }}
          />
        </>
      )}
    </div>
  )
}
