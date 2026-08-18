import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import { DirectoryBrowseError } from '@deepseek-ai/dsh-client-runtime/client'
import type { DirectoryListing } from '@deepseek-ai/dsh-client-runtime/client'
import { DirectoryBrowser } from '@deepseek-ai/dsh-client-ui-directory-picker-browse/src/client/DirectoryBrowser.tsx'
import {
  IconChevronDownOutline14, IconFolderClose16, IconFolderOpen16, IconPlusOutline16, Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { mobileConversationT } from './mobile-locale.ts'
import { sessionWorkspaceLabel } from './session-label.ts'
import css from './mobile-shell.module.css'

/** Synthetic menu id for the pinned Add Workspace footer row. */
const ADD_WORKSPACE = '::add-workspace'

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
  /** Surface workspace.create / sessions.create failures outside the browse dialog. */
  onError?: ((message: string) => void) | undefined
  /** Inline chip, composer foot, toolbar trigger, or header chip beside the back button. */
  variant?: 'chip' | 'foot' | 'toolbar' | 'header' | undefined
}

function workspaceLabel(view: WorkspaceView): string {
  const leaf = view.title.trim()
  return leaf !== '' ? leaf : view.path.split(/[/\\]/).filter(Boolean).pop() ?? view.path
}

/**
 * Mobile workspace picker: list Host workspaces, switch via sessions.create, and
 * add one through the shared in-app DirectoryBrowser (host.listDirectory /
 * host.createDirectory / workspace.create).
 * @param props - session context and switch handler.
 */
export function MobileWorkspaceSelect({
  sessionId,
  switchable,
  locked,
  draft,
  onSessionChange,
  onError,
  variant = 'chip',
}: MobileWorkspaceSelectProps): JSX.Element {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceView[]>([])
  const [listReady, setListReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pickingFolder, setPickingFolder] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const flowBusy = browseOpen || pickingFolder || loading

  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    const response = await mobileApi.workspace.list({})
    if (!response.result.ok) return
    setWorkspaces(response.result.value.items)
    setListReady(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const response = await mobileApi.workspace.list({})
      if (cancelled) return
      if (response.result.ok) setWorkspaces(response.result.value.items)
      setListReady(true)
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

  const addEntries: MenuEntry[] = useMemo(() => [{
    id: ADD_WORKSPACE,
    label: mobileConversationT('workspace.add'),
    icon: <IconPlusOutline16 size={16} />,
    disabled: flowBusy || !switchable || locked,
  }], [flowBusy, locked, switchable])

  const pinAdd = workspaces.length > 0
  const items = useMemo((): MenuEntry[] => {
    if (!pinAdd) return addEntries
    return workspaces.map(item => ({
      id: item.workspaceId,
      label: workspaceLabel(item),
      icon: <IconFolderClose16 size={16} />,
      disabled: flowBusy,
    }))
  }, [addEntries, flowBusy, pinAdd, workspaces])

  const openBrowse = useCallback((): void => {
    setOpen(false)
    setBrowseOpen(true)
  }, [])

  // Empty Host list: the chip gesture is Add Workspace (same as desktop pick flow).
  const addIsTheOnlyEntry = listReady && !pinAdd && switchable && !locked
  useEffect(() => {
    if (open && addIsTheOnlyEntry && !flowBusy) openBrowse()
  }, [addIsTheOnlyEntry, flowBusy, open, openBrowse])

  const getAnchorRect = useCallback(
    () => anchorRef.current?.getBoundingClientRect() ?? null,
    [],
  )

  const listDirectory = useCallback(async (
    path?: string,
    signal?: AbortSignal,
  ): Promise<DirectoryListing> => {
    const response = await mobileApi.host.listDirectory(
      path === undefined ? {} : { path },
      signal,
    )
    if (!response.result.ok) throw new DirectoryBrowseError(response.result.error)
    return response.result.value
  }, [])

  const createDirectory = useCallback(async (path: string, name: string): Promise<string> => {
    const response = await mobileApi.host.createDirectory({ path, name })
    if (!response.result.ok) throw new DirectoryBrowseError(response.result.error)
    return response.result.value.path
  }, [])

  const onSelectWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
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
        return
      }
      onError?.(response.result.error.message)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }, [draft, locked, onError, onSessionChange, selected?.workspaceId, switchable])

  const onOpenDirectory = useCallback((path: string): void => {
    setPickingFolder(true)
    void (async () => {
      try {
        const created = await mobileApi.workspace.create({ path })
        if (!created.result.ok) {
          onError?.(created.result.error.message)
          setBrowseOpen(false)
          return
        }
        const workspaceId = created.result.value.workspace.workspaceId
        const session = await mobileApi.sessions.create({ workspaceId })
        if (!session.result.ok) {
          onError?.(session.result.error.message)
          setBrowseOpen(false)
          return
        }
        setBrowseOpen(false)
        await refreshWorkspaces()
        onSessionChange(session.result.value.sessionId, draft)
      } catch (error) {
        onError?.(error instanceof Error ? error.message : String(error))
        setBrowseOpen(false)
      } finally {
        setPickingFolder(false)
      }
    })()
  }, [draft, onError, onSessionChange, refreshWorkspaces])

  const handleSelect = useCallback((id: string): void => {
    if (id === ADD_WORKSPACE) {
      openBrowse()
      return
    }
    void onSelectWorkspace(id)
  }, [onSelectWorkspace, openBrowse])

  const buttonClass = variant === 'foot'
    ? css.composerWorkspaceFootButton
    : variant === 'toolbar'
      ? `${css.composerTrigger} ${css.composerTriggerToolbar}`
      : variant === 'header'
        ? css.headerWorkspaceChip
        : css.composerChip

  const browseT = useCallback(
    (key: string, params?: Record<string, unknown>): string =>
      mobileConversationT(
        key,
        params as Record<string, string | number> | undefined,
      ),
    [],
  )

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
        onClick={() => {
          setOpen((value) => {
            const next = !value
            if (next) void refreshWorkspaces()
            return next
          })
        }}
      >
        <IconFolderOpen16 size={14} aria-hidden />
        <span className={variant === 'toolbar' ? css.composerTriggerLabel : css.composerChipLabel}>{label}</span>
        <IconChevronDownOutline14 size={12} aria-hidden />
      </button>
      <Menu
        open={open && !addIsTheOnlyEntry}
        anchor={null}
        items={items}
        {...pinAdd ? { footer: addEntries } : {}}
        selectedId={selected?.workspaceId}
        side={variant === 'header' ? 'bottom' : 'top'}
        portal
        getAnchorRect={getAnchorRect}
        onSelect={handleSelect}
        onClose={() => { setOpen(false) }}
      />
      <DirectoryBrowser
        open={browseOpen}
        listDirectory={listDirectory}
        createDirectory={createDirectory}
        onOpen={onOpenDirectory}
        onClose={() => { setBrowseOpen(false) }}
        busy={pickingFolder}
        t={browseT}
      />
    </>
  )
}
