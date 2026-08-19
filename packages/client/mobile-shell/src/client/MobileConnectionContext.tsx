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
} from '@deepseek-ai/dsh-client-connection/client'
import { mobileApi } from './mobile-api-client.ts'
import { readSessionToken, readStoredHostBase } from './mobile-session.ts'

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
  /** Whether session.list is in flight. */
  sessionsLoading: boolean
  /** Last list/load error message. */
  error: string | undefined
  /** Whether the current device token was revoked by the desktop Host. */
  revoked: boolean
  /** Refresh session.list from Host. */
  refreshSessions: () => Promise<void>
  /** Create a new session and refresh the list. */
  createSession: () => Promise<SessionId | undefined>
  /** Subscribe to mux frames for chat streaming. */
  subscribeMux: (listener: (frame: MuxFrame) => void) => () => void
  /** Subscribe to mux envelopes (rpcId + frame) for Session.handleMuxEnvelope. */
  subscribeMuxEnvelope: (listener: (envelope: RpcRequest<MuxFrame>) => void) => () => void
  /** Clear pairing storage and stop the connection loop. */
  disconnect: () => void
  /** Re-read pairing storage after a successful pair flow. */
  reloadPairing: () => void
}

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
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [revoked, setRevoked] = useState(false)
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
    setError('设备已被桌面吊销或会话已失效，请重新扫码连接')
  }, [])

  const reloadPairing = useCallback((): void => {
    setPaired(readSessionToken() !== undefined)
    setHostBase(readStoredHostBase())
    if (readSessionToken() !== undefined) setRevoked(false)
  }, [])

  const refreshSessions = useCallback(async (): Promise<void> => {
    if (readSessionToken() === undefined) {
      setSessions([])
      return
    }
    setSessionsLoading(true)
    setError(undefined)
    try {
      const response = await mobileApi.sessions.list({})
      if (!response.result.ok) {
        handleAuthFailure(response.result.error.message)
        if (!isUnauthorizedError(response.result.error.message)) {
          setError(response.result.error.message)
        }
        return
      }
      setSessions(response.result.value.items.filter((item: SessionSummary) => !item.blank))
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError)
      handleAuthFailure(message)
      if (!isUnauthorizedError(message)) setError(message)
    } finally {
      setSessionsLoading(false)
    }
  }, [handleAuthFailure])

  const createSession = useCallback(async (): Promise<SessionId | undefined> => {
    const response = await mobileApi.sessions.create({})
    if (!response.result.ok) {
      handleAuthFailure(response.result.error.message)
      if (!isUnauthorizedError(response.result.error.message)) {
        setError(response.result.error.message)
      }
      return undefined
    }
    await refreshSessions()
    return response.result.value.sessionId
  }, [handleAuthFailure, refreshSessions])

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
    setRevoked(false)
  }, [])

  useEffect(() => {
    if (!paired) {
      controllerRef.current?.stop()
      controllerRef.current = undefined
      return
    }
    const controller = new ConnectionController(mobileApi, {
      onMuxEnvelope: (envelope: RpcRequest<MuxFrame>) => {
        for (const listener of muxListeners.current) listener(envelope.payload)
        for (const listener of muxEnvelopeListeners.current) listener(envelope)
      },
      onHostEnvelope: (envelope: RpcRequest<HostFrame>) => {
        const frame = envelope.payload
        if (frame.type !== 'host/session-status') return
        setSessions(current => current.map(item =>
          item.sessionId === frame.sessionId ? { ...item, running: frame.running } : item,
        ))
      },
      onConnected: (description: HostDescription) => {
        setHostDescription(description)
        void refreshSessions()
      },
      onStateChange: (state: ConnectionState) => { setConnectionState(state) },
    })
    controllerRef.current = controller
    controller.start()
    return () => {
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
    sessionsLoading,
    error,
    revoked,
    refreshSessions,
    createSession,
    subscribeMux,
    subscribeMuxEnvelope,
    disconnect,
    reloadPairing,
  }), [
    paired,
    hostBase,
    hostDescription,
    connectionState,
    sessions,
    sessionsLoading,
    error,
    revoked,
    refreshSessions,
    createSession,
    subscribeMux,
    subscribeMuxEnvelope,
    disconnect,
    reloadPairing,
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
