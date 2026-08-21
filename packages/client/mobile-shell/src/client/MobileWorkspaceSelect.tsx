import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import { DirectoryBrowseError } from '@deepseek-ai/dsh-client-runtime/client'
import type { DirectoryListing } from '@deepseek-ai/dsh-client-runtime/client'
import { DirectoryBrowser } from '@deepseek-ai/dsh-client-ui-directory-picker-browse/src/client/DirectoryBrowser.tsx'
import {
  IconChevronDownOutline14, IconFolderClose16, IconFolderOpen16, IconPlusOutline16, Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { mobileApi } from './mobile-api-client.ts'
import { mobileConversationT } from './mobile-locale.ts'
import { workspaceDisplayLabel } from './session-label.ts'
import {
  findReusableBlankSession,
  resolveDefaultWorkspaceId,
  workspaceForSession,
} from './mobile-workspace-connect.ts'
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
  return workspaceDisplayLabel(view)
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
  const {
    sessions,
    workspaces,
    archivedSessionIds,
    refreshSessions,
    createSession,
  } = useMobileConnection()
  const [listReady, setListReady] = useState(workspaces.length > 0)
  const [open, setOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pickingFolder, setPickingFolder] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const autoConnectedRef = useRef<SessionId | undefined>(undefined)
  const flowBusy = browseOpen || pickingFolder || loading

  useEffect(() => {
    if (workspaces.length > 0) setListReady(true)
  }, [workspaces.length])

  const assigned = useMemo(
    () => workspaceForSession(sessionId, workspaces),
    [sessionId, workspaces],
  )

  const label = assigned === undefined
    ? mobileConversationT('workspace.choose')
    : workspaceLabel(assigned)

  const connectToWorkspace = useCallback(async (workspaceId: WorkspaceId): Promise<void> => {
    const workspace = workspaces.find(item => item.workspaceId === workspaceId)
    if (workspace === undefined) {
      throw new Error(`unknown workspace ${workspaceId}`)
    }
    const reusable = findReusableBlankSession(workspace, sessions, archivedSessionIds)
    if (reusable !== undefined) {
      onSessionChange(reusable, draft)
      return
    }
    const sessionId = await createSession(workspaceId)
    if (sessionId === undefined) {
      throw new Error('session create failed')
    }
    onSessionChange(sessionId, draft)
  }, [archivedSessionIds, createSession, draft, onSessionChange, sessions, workspaces])

  const onSelectWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    if (!switchable || locked || workspaceId === assigned?.workspaceId) {
      setOpen(false)
      return
    }
    setLoading(true)
    setOpen(false)
    try {
      await connectToWorkspace(workspaceId as WorkspaceId)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }, [assigned?.workspaceId, connectToWorkspace, locked, onError, switchable])

  useEffect(() => {
    if (!switchable || locked || loading || !listReady || workspaces.length === 0) return
    if (assigned !== undefined) return
    if (autoConnectedRef.current === sessionId) return
    const targetId = resolveDefaultWorkspaceId(workspaces, sessions)
    if (targetId === undefined) return
    autoConnectedRef.current = sessionId
    setLoading(true)
    void connectToWorkspace(targetId)
      .catch((error: unknown) => {
        autoConnectedRef.current = undefined
        onError?.(error instanceof Error ? error.message : String(error))
      })
      .finally(() => { setLoading(false) })
  }, [
    assigned,
    connectToWorkspace,
    listReady,
    loading,
    locked,
    onError,
    sessionId,
    sessions,
    switchable,
    workspaces,
  ])

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
        setBrowseOpen(false)
        await refreshSessions()
        await connectToWorkspace(workspaceId)
      } catch (error) {
        onError?.(error instanceof Error ? error.message : String(error))
        setBrowseOpen(false)
      } finally {
        setPickingFolder(false)
      }
    })()
  }, [connectToWorkspace, onError, refreshSessions])

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

  const showClosedFolder = assigned === undefined

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
            if (next && workspaces.length === 0) void refreshSessions().then(() => { setListReady(true) })
            return next
          })
        }}
      >
        {showClosedFolder
          ? <IconFolderClose16 size={14} aria-hidden />
          : <IconFolderOpen16 size={14} aria-hidden />}
        <span className={variant === 'toolbar' ? css.composerTriggerLabel : css.composerChipLabel}>{label}</span>
        <IconChevronDownOutline14 size={12} aria-hidden />
      </button>
      <Menu
        open={open && !addIsTheOnlyEntry}
        anchor={null}
        items={items}
        {...pinAdd ? { footer: addEntries } : {}}
        selectedId={assigned?.workspaceId}
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
