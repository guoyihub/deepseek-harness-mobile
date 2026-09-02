import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  clearPairingStorage,
  type ConnectionState,
} from '@deepseek-ai/dsh-client-connection/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { WorkspaceFollowFrame } from '@deepseek-ai/dsh-api-workspace-controller/types'
import { mobileApi } from './mobile-api-client.ts'
import type { HostDescription } from './mobile-host-description.ts'
import {
  clearMobilePendingInteractions,
  mobilePendingInteraction,
  type PendingInteractionStatus,
} from './mobile-session-pending-tracker.ts'
import { clearMobilePendingRegistry } from './mobile-pending-registry.ts'
import {
  clearMobileCompletedNotifications,
  mobileSessionCompleted,
  setMobileSelectedSession,
  syncMobileCompletedNotifications,
} from './mobile-session-completed-tracker.ts'
import {
  findReusableBlankSession,
  resolveDefaultWorkspaceId,
} from './mobile-workspace-connect.ts'
import { prefetchMobileConversationRuntime } from './mobile-conversation-runtime.ts'
import { readSessionToken, readStoredHostBase } from './mobile-session.ts'
import {
  readStoredDeviceId,
  readStoredFingerprint,
  rememberMobileConnection,
} from '@deepseek-ai/dsh-client-connection/client'
import {
  openMobileWorkspaceFollow,
  startMobileConnectionLoop,
} from './mobile-stream-runtime.ts'
import type { ConnectionController } from '@deepseek-ai/dsh-client-connection/client'

interface MobileConnectionContextValue {
  /** Whether pairing storage contains a live session token. */
  paired: boolean
  /** Stored Host base URL for display. */
  hostBase: string | undefined
  /** Latest Host facts after connect. */
  hostDescription: HostDescription | undefined
  /** Coarse connection state from the pump loop. */
  connectionState: ConnectionState | null
  /** Cached session.list rows. */
  sessions: readonly SessionSummary[]
  /** Cached workspace follow rows in Host registry order. */
  workspaces: readonly WorkspaceView[]
  /** Registry-global archived session ids from workspace follow. */
  archivedSessionIds: readonly SessionId[]
  /** Whether session.list is in flight. */
  sessionsLoading: boolean
  /** Last list/load error message. */
  error: string | undefined
  /** Whether the current device token was revoked by the desktop Host. */
  revoked: boolean
  /** Refresh session.list from Host. */
  refreshSessions: () => Promise<void>
  /** Live pending-interaction revision (sidebar status dots). */
  pendingRevision: number
  /** Read one session's pending-interaction status for list rows. */
  getPendingInteraction: (sessionId: SessionId) => PendingInteractionStatus | undefined
  /** Read one session's green completion reminder for list rows. */
  getSessionCompleted: (sessionId: SessionId) => boolean
  /** Mirror desktop select: opening a session clears its completion reminder. */
  markSessionViewed: (sessionId: SessionId | undefined) => void
  /** Create a new session and refresh the list. */
  createSession: (workspaceId?: WorkspaceId) => Promise<SessionId | undefined>
  /** Clear pairing storage and stop the connection loop. */
  disconnect: () => void
  /** Re-read pairing storage after a successful pair flow. */
  reloadPairing: () => void
  /** Refresh the cached Host model catalog snapshot. */
  refreshHostDescription: () => Promise<void>
  /** Interrupt backoff and retry the Host generation immediately. */
  reconnectNow: () => void
}

const MobileConnectionContext = createContext<MobileConnectionContextValue | undefined>(undefined)

function isUnauthorizedError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('401') || lower.includes('unauthorized') || lower.includes('forbidden')
}

function applyWorkspaceFrame(
  frame: WorkspaceFollowFrame,
  workspaces: readonly WorkspaceView[],
): { workspaces: readonly WorkspaceView[]; archivedSessionIds?: readonly SessionId[] } {
  switch (frame.type) {
    case 'baseline':
      return {
        workspaces: frame.value.items,
        archivedSessionIds: frame.value.archivedSessionIds,
      }
    case 'upsert': {
      const next = workspaces.filter(item => item.workspaceId !== frame.workspace.workspaceId)
      return { workspaces: [...next, frame.workspace] }
    }
    case 'remove':
      return { workspaces: workspaces.filter(item => item.workspaceId !== frame.workspaceId) }
    case 'order': {
      const byId = new Map(workspaces.map(item => [item.workspaceId, item]))
      return {
        workspaces: frame.workspaceIds.flatMap((id) => {
          const row = byId.get(id)
          return row === undefined ? [] : [row]
        }),
      }
    }
    case 'archived':
      return { workspaces, archivedSessionIds: frame.archivedSessionIds }
  }
}

/**
 * Provide mobile Host connection state to shell pages.
 * @param props.children - routed shell pages.
 */
export function MobileConnectionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [paired, setPaired] = useState(() => readSessionToken() !== undefined)
  const [hostBase, setHostBase] = useState(() => readStoredHostBase())
  const [hostDescription, setHostDescription] = useState<HostDescription | undefined>(undefined)
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null)
  const [sessions, setSessions] = useState<readonly SessionSummary[]>([])
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceView[]>([])
  const [archivedSessionIds, setArchivedSessionIds] = useState<readonly SessionId[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [revoked, setRevoked] = useState(false)
  const [pendingRevision, setPendingRevision] = useState(0)
  const controllerRef = useRef<ConnectionController | undefined>(undefined)
  const workspaceAbort = useRef<AbortController | undefined>(undefined)

  const handleAuthFailure = useCallback((message: string): void => {
    if (!isUnauthorizedError(message)) return
    clearPairingStorage()
    controllerRef.current?.stop()
    controllerRef.current = undefined
    setRevoked(true)
    setPaired(false)
    setHostBase(undefined)
    setHostDescription(undefined)
    setConnectionState(null)
    setSessions([])
    setWorkspaces([])
    setArchivedSessionIds([])
    setError('设备已被桌面吊销或会话已失效，请重新扫码连接')
  }, [])

  const reloadPairing = useCallback((): void => {
    const token = readSessionToken()
    setPaired(token !== undefined)
    setHostBase(readStoredHostBase())
    if (token !== undefined) {
      setRevoked(false)
      setError(undefined)
    }
  }, [])

  const refreshHostDescription = useCallback(async (): Promise<void> => {
    const home = hostDescription?.home ?? ''
    const response = await mobileApi.sessions.modelCatalog()
    if (!response.result.ok) return
    setHostDescription({
      home,
      provider: response.result.value.default.provider,
      model: response.result.value.default.model,
    })
  }, [hostDescription?.home])

  const getPendingInteraction = useCallback((
    sessionId: SessionId,
  ): PendingInteractionStatus | undefined => mobilePendingInteraction(sessionId), [])

  const getSessionCompleted = useCallback((
    sessionId: SessionId,
  ): boolean => mobileSessionCompleted(sessionId), [])

  const markSessionViewed = useCallback((sessionId: SessionId | undefined): void => {
    if (setMobileSelectedSession(sessionId)) {
      setPendingRevision(revision => revision + 1)
    }
  }, [])

  useEffect(() => {
    if (syncMobileCompletedNotifications(sessions)) {
      setPendingRevision(revision => revision + 1)
    }
  }, [sessions])

  const refreshSessions = useCallback(async (): Promise<void> => {
    if (readSessionToken() === undefined) {
      setSessions([])
      return
    }
    setSessionsLoading(true)
    setError(undefined)
    try {
      const sessionResponse = await mobileApi.sessions.list({})
      if (!sessionResponse.result.ok) {
        handleAuthFailure(sessionResponse.result.error.message)
        if (!isUnauthorizedError(sessionResponse.result.error.message)) {
          setError(sessionResponse.result.error.message)
        }
        return
      }
      setSessions(sessionResponse.result.value.items as readonly SessionSummary[])
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError)
      handleAuthFailure(message)
      if (!isUnauthorizedError(message)) setError(message)
    } finally {
      setSessionsLoading(false)
    }
  }, [handleAuthFailure])

  const prependBlankSession = useCallback((
    sessionId: SessionId,
    workspaceId: WorkspaceId | undefined,
  ): void => {
    const workspace = workspaceId === undefined
      ? undefined
      : workspaces.find(item => item.workspaceId === workspaceId)
    setSessions((current) => {
      if (current.some(item => item.sessionId === sessionId)) return current
      const row: SessionSummary = {
        sessionId,
        updatedAt: Date.now(),
        running: false,
        blank: true,
        ...(workspace?.path !== undefined ? { cwd: workspace.path } : {}),
      }
      return [row, ...current]
    })
  }, [workspaces])

  const createSession = useCallback(async (workspaceId?: WorkspaceId): Promise<SessionId | undefined> => {
    const targetWorkspaceId = workspaceId ?? (
      workspaces.length > 0 ? resolveDefaultWorkspaceId(workspaces, sessions) : undefined
    )
    if (targetWorkspaceId !== undefined) {
      const workspace = workspaces.find(item => item.workspaceId === targetWorkspaceId)
      if (workspace !== undefined) {
        const reusable = findReusableBlankSession(workspace, sessions, archivedSessionIds)
        if (reusable !== undefined) return reusable
      }
    }
    const response = await mobileApi.sessions.create(
      targetWorkspaceId === undefined ? {} : { workspaceId: targetWorkspaceId },
    )
    if (!response.result.ok) {
      handleAuthFailure(response.result.error.message)
      if (!isUnauthorizedError(response.result.error.message)) {
        setError(response.result.error.message)
      }
      return undefined
    }
    const sessionId = response.result.value.sessionId
    prependBlankSession(sessionId, targetWorkspaceId)
    void refreshSessions()
    return sessionId
  }, [archivedSessionIds, handleAuthFailure, prependBlankSession, refreshSessions, sessions, workspaces])

  const disconnect = useCallback((): void => {
    workspaceAbort.current?.abort()
    workspaceAbort.current = undefined
    controllerRef.current?.stop()
    controllerRef.current = undefined
    setPaired(false)
    setHostBase(undefined)
    setHostDescription(undefined)
    setConnectionState(null)
    setSessions([])
    setWorkspaces([])
    setArchivedSessionIds([])
    setRevoked(false)
    setError(undefined)
  }, [])

  const reconnectNow = useCallback((): void => {
    controllerRef.current?.reconnect()
  }, [])

  useEffect(() => {
    if (!paired) {
      workspaceAbort.current?.abort()
      workspaceAbort.current = undefined
      controllerRef.current?.stop()
      controllerRef.current = undefined
      return
    }
    const controller = startMobileConnectionLoop({
      onConnected: (host) => {
        clearMobilePendingInteractions()
        clearMobilePendingRegistry()
        clearMobileCompletedNotifications()
        setPendingRevision(revision => revision + 1)
        setHostDescription({ home: host.home })
        const sessionToken = readSessionToken()
        const storedHost = readStoredHostBase()
        const fingerprint = readStoredFingerprint()
        const deviceId = readStoredDeviceId()
        if (
          sessionToken !== undefined
          && storedHost !== undefined
          && fingerprint !== undefined
          && deviceId !== undefined
        ) {
          rememberMobileConnection({
            fingerprint,
            hostBase: storedHost,
            sessionToken,
            deviceId,
            hostDisplayName: 'DSH Host',
          })
        }
        void refreshSessions()
        void (async () => {
          const catalog = await mobileApi.sessions.modelCatalog()
          if (catalog.result.ok) {
            setHostDescription({
              home: host.home,
              provider: catalog.result.value.default.provider,
              model: catalog.result.value.default.model,
            })
          }
        })()
        prefetchMobileConversationRuntime()
        workspaceAbort.current?.abort()
        const follow = new AbortController()
        workspaceAbort.current = follow
        void (async () => {
          try {
            for await (const raw of openMobileWorkspaceFollow(follow.signal)) {
              const frame = raw as WorkspaceFollowFrame
              if (typeof frame !== 'object' || frame === null || !('type' in frame)) continue
              setWorkspaces((current) => {
                const next = applyWorkspaceFrame(frame, current)
                if (next.archivedSessionIds !== undefined) {
                  setArchivedSessionIds(next.archivedSessionIds)
                }
                return next.workspaces
              })
            }
          } catch {
            // Generation abort or carrier loss; Connection reconnects the mux.
          }
        })()
      },
      onStateChange: (state) => { setConnectionState(state) },
    })
    controllerRef.current = controller
    return () => {
      workspaceAbort.current?.abort()
      workspaceAbort.current = undefined
      controller.stop()
      if (controllerRef.current === controller) controllerRef.current = undefined
    }
  }, [paired, refreshSessions])

  const value = useMemo<MobileConnectionContextValue>(() => ({
    paired,
    hostBase,
    hostDescription,
    connectionState,
    sessions,
    workspaces,
    archivedSessionIds,
    sessionsLoading,
    error,
    revoked,
    refreshSessions,
    pendingRevision,
    getPendingInteraction,
    getSessionCompleted,
    markSessionViewed,
    createSession,
    disconnect,
    reloadPairing,
    refreshHostDescription,
    reconnectNow,
  }), [
    paired,
    hostBase,
    hostDescription,
    connectionState,
    sessions,
    workspaces,
    archivedSessionIds,
    sessionsLoading,
    error,
    revoked,
    refreshSessions,
    pendingRevision,
    getPendingInteraction,
    getSessionCompleted,
    markSessionViewed,
    createSession,
    disconnect,
    reloadPairing,
    refreshHostDescription,
    reconnectNow,
  ])

  return (
    <MobileConnectionContext.Provider value={value}>
      {children}
    </MobileConnectionContext.Provider>
  )
}

/**
 * Read the mobile connection context.
 * @returns provider value.
 */
export function useMobileConnection(): MobileConnectionContextValue {
  const value = useContext(MobileConnectionContext)
  if (value === undefined) throw new Error('useMobileConnection requires MobileConnectionProvider')
  return value
}
