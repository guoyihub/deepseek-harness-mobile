import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import { IconChevronDownOutline14, IconFolderOpen16, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { sessionWorkspaceLabel } from './session-label.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileWorkspaceSelect}. */
export interface MobileWorkspaceSelectProps {
  sessionId: SessionId
  /** Whether switching workspaces is allowed for the current session. */
  switchable: boolean
  /** Whether controls are temporarily locked while the agent runs. */
  locked: boolean
  /** Current composer draft preserved across workspace switches. */
  draft: string
  /** Navigate to the blank session created for the chosen workspace. */
  onSessionChange: (sessionId: SessionId, draft: string) => void
  /** Inline chip, composer foot, toolbar trigger, or header chip beside the back button. */
  variant?: 'chip' | 'foot' | 'toolbar' | 'header' | undefined
}

function workspaceLabel(view: WorkspaceView): string {
  const leaf = view.title.trim()
  return leaf !== '' ? leaf : view.path.split(/[/\\]/).filter(Boolean).pop() ?? view.path
}

/**
 * Mobile workspace picker backed by workspace.list and sessions.create.
 * @param props - session context and switch handler.
 */
export function MobileWorkspaceSelect({
  sessionId,
  switchable,
  locked,
  draft,
  onSessionChange,
  variant = 'chip',
}: MobileWorkspaceSelectProps): JSX.Element {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceView[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const response = await mobileApi.workspace.list({})
      if (cancelled || !response.result.ok) return
      setWorkspaces(response.result.value.items)
    })()
    return () => { cancelled = true }
  }, [])

  const selected = useMemo(() => {
    const bySession = workspaces.find(item => item.sessionIds.includes(sessionId))
    if (bySession !== undefined) return bySession
    return workspaces[0]
  }, [sessionId, workspaces])

  const label = selected === undefined
    ? sessionWorkspaceLabel({ sessionId, updatedAt: 0, running: false, blank: true })
    : workspaceLabel(selected)

  const items = useMemo((): MenuEntry[] => workspaces.map(item => ({
    id: item.workspaceId,
    label: workspaceLabel(item),
  })), [workspaces])

  const getAnchorRect = useCallback(
    () => anchorRef.current?.getBoundingClientRect() ?? null,
    [],
  )

  const onSelect = useCallback(async (workspaceId: string): Promise<void> => {
    if (!switchable || locked || workspaceId === selected?.workspaceId) {
      setOpen(false)
      return
    }
    setLoading(true)
    setOpen(false)
    try {
      const response = await mobileApi.sessions.create({ workspaceId: workspaceId as WorkspaceId })
      if (response.result.ok) {
        onSessionChange(response.result.value.sessionId, draft)
      }
    } finally {
      setLoading(false)
    }
  }, [draft, locked, onSessionChange, selected?.workspaceId, switchable])

  const buttonClass = variant === 'foot'
    ? css.composerWorkspaceFootButton
    : variant === 'toolbar'
      ? `${css.composerTrigger} ${css.composerTriggerToolbar}`
      : variant === 'header'
        ? css.headerWorkspaceChip
        : css.composerChip

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={buttonClass}
        disabled={!switchable || locked || loading}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => { setOpen(value => !value) }}
      >
        <IconFolderOpen16 size={14} aria-hidden />
        <span className={variant === 'toolbar' ? css.composerTriggerLabel : css.composerChipLabel}>{label}</span>
        <IconChevronDownOutline14 size={12} aria-hidden />
      </button>
      <Menu
        open={open}
        anchor={null}
        items={items}
        selectedId={selected?.workspaceId}
        side={variant === 'header' ? 'bottom' : 'top'}
        portal
        getAnchorRect={getAnchorRect}
        onSelect={(id) => { void onSelect(id) }}
        onClose={() => { setOpen(false) }}
      />
    </>
  )
}
