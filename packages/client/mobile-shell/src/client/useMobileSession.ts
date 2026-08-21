/**
 * Per-session {@link Session} for mobile chat and trajectory: opens history,
 * accepts mux frames for this session id, and exposes a uSES selector hook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConnectionState, SessionId, MuxFrame, RpcRequest, SessionSummary } from '@deepseek-ai/dsh-client-connection/client'
import {
  EMPTY_CHAT_SNAPSHOT,
  EMPTY_CONVERSATION_VIEWS,
  type ConversationSnapshot,
  type UseProjection,
} from '@deepseek-ai/dsh-client-runtime/client'
import { Session } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/session.ts'
import type { SessionRemotes } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/remotes.ts'
import type { HostObservable, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import { getMobileConversationRuntime } from './mobile-conversation-runtime.ts'
import { mobileApi } from './mobile-api-client.ts'
import {
  isMobileSessionRoutedFrame,
  registerMobileSession,
  unregisterMobileSession,
} from './mobile-session-mux-buffer.ts'
import { useMobileConnection } from './MobileConnectionContext.tsx'

/** SessionRemotes stub: Trajectory viewing does not execute commands through Session. */
function mobileSessionRemotes(): SessionRemotes {
  return {
    commands: {
      list: () => Promise.resolve({ ok: true, value: [] }),
      execute: () => Promise.resolve({ ok: true, value: undefined }),
    },
  }
}

const absentProjection: UseProjection = ((
  _key: string,
  selector?: (value: undefined) => unknown,
) => (selector === undefined ? undefined : selector(undefined))) as UseProjection

const sessionCache = new Map<SessionId, Session>()

function frameSessionId(frame: MuxFrame): SessionId | undefined {
  if ('sessionId' in frame && typeof frame.sessionId === 'string') {
    return frame.sessionId as SessionId
  }
  return undefined
}

function sessionSummaryBlank(
  sessionId: SessionId,
  sessions: readonly SessionSummary[],
): boolean {
  return sessions.find(item => item.sessionId === sessionId)?.blank === true
}

function sessionReadyInstant(
  sessionId: SessionId,
  sessions: readonly SessionSummary[],
): boolean {
  const cached = sessionCache.get(sessionId)
  if (cached?.getSnapshot().openState === 'open') return true
  return sessionSummaryBlank(sessionId, sessions)
}

function coldSnapshot(sessionId: SessionId, summary: SessionSummary | undefined): ConversationSnapshot {
  return {
    sessionId,
    views: EMPTY_CONVERSATION_VIEWS,
    chat: EMPTY_CHAT_SNAPSHOT,
    nodes: [],
    turnTimings: new Map(),
    turnEnds: new Map(),
    partial: null,
    runningCalls: [],
    pending: [],
    queue: [],
    running: false,
    subagent: null,
    composerPhase: 'active',
    removed: false,
    openState: 'loading',
    openError: null,
    hasMore: false,
    loadingOlder: false,
    promptError: null,
    blank: summary?.blank ?? false,
    lastAgentError: null,
  }
}

function coldObservable(
  sessionId: SessionId,
  summary: SessionSummary | undefined,
): HostObservable<ConversationSnapshot> {
  const snapshot = coldSnapshot(sessionId, summary)
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
  }
}

function applySummaryHints(session: Session, summary: SessionSummary | undefined): void {
  if (summary === undefined) return
  session.handleRunning(summary.running)
  session.handleBlank(summary.blank)
}

/** Bound Session face for one mobile chat session. */
export interface MobileSessionHandle {
  /** Whether Session.open has finished (success or failure). */
  ready: boolean
  /** Open / history error message. */
  error: string | undefined
  /** uSES selector over the conversation snapshot. */
  useSession: SnapshotSelectorHook<ConversationSnapshot>
  /** Framework seat required by ConvViewProps (unused by TrajectoryView). */
  useProjection: UseProjection
  /** Page older history into the Session window. */
  loadOlder: () => Promise<boolean>
}

/**
 * Open a runtime Session for Chat + Trajectory assembly.
 * @param sessionId - active Host session.
 */
export function useMobileSession(sessionId: SessionId): MobileSessionHandle {
  const { subscribeMuxEnvelope, sessions, connectionState } = useMobileConnection()
  const summary = useMemo(
    () => sessions.find(item => item.sessionId === sessionId),
    [sessionId, sessions],
  )
  const [session, setSession] = useState<Session | undefined>(() => sessionCache.get(sessionId))
  const [ready, setReady] = useState(() => sessionReadyInstant(sessionId, sessions))
  const [error, setError] = useState<string | undefined>(undefined)
  const sessionRef = useRef<Session | undefined>(undefined)
  const prevConnectionState = useRef<ConnectionState | null>(null)

  sessionRef.current = session

  useEffect(() => {
    let cancelled = false
    const currentSummary = sessions.find(item => item.sessionId === sessionId)
    const cached = sessionCache.get(sessionId)
    if (cached?.getSnapshot().openState === 'open') {
      applySummaryHints(cached, currentSummary)
      setSession(cached)
      setReady(true)
      setError(undefined)
      registerMobileSession(sessionId, cached)
      return () => { unregisterMobileSession(sessionId) }
    }

    const optimisticBlank = currentSummary?.blank === true
    if (!optimisticBlank) {
      setReady(false)
    }
    setError(undefined)

    void (async () => {
      try {
        const conversation = await getMobileConversationRuntime()
        if (cancelled) return
        let next = sessionCache.get(sessionId)
        if (next === undefined) {
          next = new Session(sessionId, mobileApi, mobileSessionRemotes(), { conversation })
          sessionCache.set(sessionId, next)
        }
        applySummaryHints(next, currentSummary)
        setSession(next)

        if (optimisticBlank) {
          registerMobileSession(sessionId, next)
          if (!cancelled) setReady(true)
          try {
            await next.open()
            if (!cancelled) registerMobileSession(sessionId, next)
          } catch (openError) {
            if (!cancelled) {
              setError(openError instanceof Error ? openError.message : String(openError))
            }
          }
          return
        }

        await next.open()
        if (cancelled) return
        registerMobileSession(sessionId, next)
        setReady(true)
      } catch (openError) {
        if (!cancelled) {
          setError(openError instanceof Error ? openError.message : String(openError))
          setReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
      unregisterMobileSession(sessionId)
    }
    // sessions is read once at open time; summary hints sync in the effect below.
  }, [sessionId])

  useEffect(() => {
    if (sessionSummaryBlank(sessionId, sessions)) {
      setReady(current => current || true)
    }
  }, [sessionId, sessions])

  useEffect(() => {
    if (session === undefined) return
    return subscribeMuxEnvelope((envelope: RpcRequest<MuxFrame>) => {
      const frame = envelope.payload
      if (frameSessionId(frame) !== sessionId) return
      if (frame.type === 'session/projection') return
      if (isMobileSessionRoutedFrame(frame)) return
      session.handleMuxEnvelope(envelope.rpcId, frame)
    })
  }, [session, sessionId, subscribeMuxEnvelope])

  useEffect(() => {
    const prev = prevConnectionState.current
    prevConnectionState.current = connectionState
    if (connectionState !== 'connected' || prev !== 'reconnecting') return
    const active = sessionRef.current
    if (active === undefined || active.getSnapshot().openState !== 'open') return
    void active.resync()
  }, [connectionState])

  useEffect(() => {
    if (session === undefined) return
    applySummaryHints(session, summary)
  }, [session, summary])

  const useSession = useMemo(
    () => bindSnapshotSelector(session ?? coldObservable(sessionId, summary)),
    [session, sessionId, summary],
  )

  const loadOlder = useCallback(async (): Promise<boolean> => {
    if (session === undefined) return false
    const before = session.getSnapshot().views.get('trajectory')
    await session.loadOlder()
    return session.getSnapshot().views.get('trajectory') !== before
  }, [session])

  return {
    ready,
    error,
    useSession,
    useProjection: absentProjection,
    loadOlder,
  }
}
