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
  ConnectionController,
  clearPairingStorage,
  type ConnectionState,
  type HostDescription,
  type HostFrame,
  type MuxFrame,
  type RpcRequest,
  type SessionId,
  type SessionSummary,
  type WorkspaceId,
  type WorkspaceView,
} from '@deepseek-ai/dsh-client-connection/client'
import type { PendingInteractionStatus } from '@deepseek-ai/dsh-client-runtime/client'
import { mobileApi } from './mobile-api-client.ts'
import {
  applyMobilePendingMuxFrame,
  clearMobilePendingInteractions,
  mobilePendingInteraction,
} from './mobile-session-pending-tracker.ts'
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
  isMobileSessionRoutedFrame,
  routeMobileMuxEnvelope,
} from './mobile-session-mux-buffer.ts'

function frameSessionId(frame: MuxFrame): SessionId | undefined {
  if ('sessionId' in frame && typeof frame.sessionId === 'string') {
    return frame.sessionId as SessionId
  }
  return undefined
}

interface MobileConnectionContextValue {
  /** Whether pairing storage contains a live session token. */
  paired: boolean
  /** Stored Host base URL for display. */
  hostBase: string | undefined
  /** Latest host.describe snapshot after connect. */
  hostDescription: HostDescription | undefined
  /** Coarse connection state from the pump loop. */
  connectionState: ConnectionState | null
  /** Cached session.list rows. */
  sessions: readonly SessionSummary[]
  /** Cached workspace.list rows in Host registry order. */
  workspaces: readonly WorkspaceView[]
  /** Registry-global archived session ids from workspace.list. */
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
  /** Subscribe to mux frames for chat streaming. */
  subscribeMux: (listener: (frame: MuxFrame) => void) => () => void
  /** Subscribe to mux envelopes (rpcId + frame) for Session.handleMuxEnvelope. */
  subscribeMuxEnvelope: (listener: (envelope: RpcRequest<MuxFrame>) => void) => () => void
  /** Clear pairing storage and stop the connection loop. */
  disconnect: () => void
  /** Re-read pairing storage after a successful pair flow. */
  reloadPairing: () => void
  /** Refresh the cached host.describe snapshot. */
  refreshHostDescription: () => Promise<void>
}

/** Consecutive failed generations after which mobile pairing is dropped. */
const MOBILE_RECONNECT_MAX_ATTEMPTS = 3

const MobileConnectionContext = createContext<MobileConnectionContextValue | undefined>(undefined)

function isUnauthorizedError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('401') || lower.includes('unauthorized') || lower.includes('forbidden')
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
  const muxListeners = useRef(new Set<(frame: MuxFrame) => void>())
  const muxEnvelopeListeners = useRef(new Set<(envelope: RpcRequest<MuxFrame>) => void>())
  const controllerRef = useRef<ConnectionController | undefined>(undefined)

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
    const response = await mobileApi.host.describe({})
    if (response.result.ok) {
      setHostDescription(response.result.value)
    }
  }, [])

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
      setWorkspaces([])
      setArchivedSessionIds([])
      return
    }
    setSessionsLoading(true)
    setError(undefined)
    try {
      const [sessionResponse, workspaceResponse] = await Promise.all([
        mobileApi.sessions.list({}),
        mobileApi.workspace.list({}),
      ])
      if (!sessionResponse.result.ok) {
        handleAuthFailure(sessionResponse.result.error.message)
        if (!isUnauthorizedError(sessionResponse.result.error.message)) {
          setError(sessionResponse.result.error.message)
        }
        return
      }
      if (!workspaceResponse.result.ok) {
        handleAuthFailure(workspaceResponse.result.error.message)
        if (!isUnauthorizedError(workspaceResponse.result.error.message)) {
          setError(workspaceResponse.result.error.message)
        }
        return
      }
      setSessions(sessionResponse.result.value.items)
      setWorkspaces(workspaceResponse.result.value.items)
      setArchivedSessionIds(workspaceResponse.result.value.archivedSessionIds)
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

  const subscribeMux = useCallback((listener: (frame: MuxFrame) => void): (() => void) => {
    muxListeners.current.add(listener)
    return () => { muxListeners.current.delete(listener) }
  }, [])

  const subscribeMuxEnvelope = useCallback((
    listener: (envelope: RpcRequest<MuxFrame>) => void,
  ): (() => void) => {
    muxEnvelopeListeners.current.add(listener)
    return () => { muxEnvelopeListeners.current.delete(listener) }
  }, [])

  const disconnect = useCallback((): void => {
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

  const dropPairingAfterReconnect = useCallback((): void => {
    clearPairingStorage()
    disconnect()
    setError('多次重连失败，请重新扫码连接')
  }, [disconnect])

  useEffect(() => {
    if (!paired) {
      controllerRef.current?.stop()
      controllerRef.current = undefined
      return
    }
    const controller = new ConnectionController(mobileApi, {
      onMuxEnvelope: (envelope: RpcRequest<MuxFrame>) => {
        const frame = envelope.payload
        const sid = frameSessionId(frame)
        if (sid !== undefined && applyMobilePendingMuxFrame(sid, frame, envelope.rpcId)) {
          setPendingRevision(revision => revision + 1)
        }
        if (sid !== undefined && isMobileSessionRoutedFrame(frame)) {
          routeMobileMuxEnvelope(sid, envelope)
        }
        for (const listener of muxListeners.current) listener(envelope.payload)
        for (const listener of muxEnvelopeListeners.current) listener(envelope)
      },
      onHostEnvelope: (envelope: RpcRequest<HostFrame>) => {
        const frame = envelope.payload
        if (frame.type === 'host/session-status') {
          setSessions(current => current.map(item =>
            item.sessionId === frame.sessionId ? { ...item, running: frame.running } : item,
          ))
          return
        }
        if (frame.type === 'host/archived-sessions-changed') {
          setArchivedSessionIds(frame.archivedSessionIds)
        }
      },
      onConnected: (description: HostDescription) => {
        clearMobilePendingInteractions()
        clearMobileCompletedNotifications()
        setPendingRevision(revision => revision + 1)
        setHostDescription(description)
        const sessionToken = readSessionToken()
        const hostBase = readStoredHostBase()
        const fingerprint = readStoredFingerprint()
        const deviceId = readStoredDeviceId()
        if (
          sessionToken !== undefined
          && hostBase !== undefined
          && fingerprint !== undefined
          && deviceId !== undefined
        ) {
          rememberMobileConnection({
            fingerprint,
            hostBase,
            sessionToken,
            deviceId,
            hostDisplayName: description.provider ?? 'DSH Host',
          })
        }
        void refreshSessions()
        prefetchMobileConversationRuntime()
      },
      onStateChange: (state: ConnectionState) => { setConnectionState(state) },
      onGiveUp: dropPairingAfterReconnect,
    }, { maxAttempts: MOBILE_RECONNECT_MAX_ATTEMPTS })
    controllerRef.current = controller
    controller.start()
    return () => {
      controller.stop()
      if (controllerRef.current === controller) controllerRef.current = undefined
    }
  }, [dropPairingAfterReconnect, paired, refreshSessions])

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
    subscribeMux,
    subscribeMuxEnvelope,
    disconnect,
    reloadPairing,
    refreshHostDescription,
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
    subscribeMux,
    subscribeMuxEnvelope,
    disconnect,
    reloadPairing,
    refreshHostDescription,
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
