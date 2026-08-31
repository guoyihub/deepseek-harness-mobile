/**
 * Per-session Session + Conversation fold for mobile chat and trajectory.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConnectionState } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionSnapshot, UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import { Session } from '@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { EMPTY_CONVERSATION_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { EMPTY_CHAT_SNAPSHOT, type ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'
import type { HostObservable, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import { getMobileConversationRuntime } from './mobile-conversation-runtime.ts'
import { bindMobileConversation } from './mobile-conversation-binding.ts'
import { mobileSessionRemotes } from './mobile-stream-runtime.ts'
import { useMobileConnection } from './MobileConnectionContext.tsx'

const absentProjection: UseProjection = ((
  _key: string,
  selector?: (value: undefined) => unknown,
) => (selector === undefined ? undefined : selector(undefined))) as UseProjection

const sessionCache = new Map<SessionId, Session>()
const remotes = mobileSessionRemotes

/** Combined Session lifecycle and Chat target used by the mobile transcript. */
export interface MobileSessionView {
  readonly session: SessionSnapshot
  readonly conversation: ConversationSnapshot
  readonly chat: ChatSnapshot
  readonly running: boolean
  readonly blank: boolean
  readonly openState: SessionSnapshot['openState']
  readonly sessionId: SessionId
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

function combineView(session: SessionSnapshot, conversation: ConversationSnapshot): MobileSessionView {
  return {
    session,
    conversation,
    chat: conversation.views.get('chat') ?? EMPTY_CHAT_SNAPSHOT,
    running: session.running,
    blank: session.blank,
    openState: session.openState,
    sessionId: session.sessionId,
  }
}

function coldView(sessionId: SessionId, summary: SessionSummary | undefined): MobileSessionView {
  return combineView({
    sessionId,
    queue: [],
    pendingSubmissions: [],
    running: summary?.running ?? false,
    subagent: null,
    removed: false,
    openState: 'loading',
    openError: null,
    hasMore: false,
    loadingOlder: false,
    promptError: null,
    blank: summary?.blank ?? false,
    lastAgentError: null,
    awaitingFirstTurn: false,
  }, EMPTY_CONVERSATION_SNAPSHOT)
}

function coldObservable(
  sessionId: SessionId,
  summary: SessionSummary | undefined,
): HostObservable<MobileSessionView> {
  const snapshot = coldView(sessionId, summary)
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
  /** uSES selector over the combined session + chat view. */
  useSession: SnapshotSelectorHook<MobileSessionView>
  /** Framework seat required by ConvViewProps. */
  useProjection: UseProjection
  /** Page older history into the Session window. */
  loadOlder: () => Promise<boolean>
}

/**
 * Open a Session for Chat + Trajectory assembly.
 * @param sessionId - active Host session.
 */
export function useMobileSession(sessionId: SessionId): MobileSessionHandle {
  const { sessions, connectionState } = useMobileConnection()
  const summary = useMemo(
    () => sessions.find(item => item.sessionId === sessionId),
    [sessionId, sessions],
  )
  const [session, setSession] = useState<Session | undefined>(() => sessionCache.get(sessionId))
  const [conversation, setConversation] = useState<ConversationSnapshot>(EMPTY_CONVERSATION_SNAPSHOT)
  const [ready, setReady] = useState(() => sessionReadyInstant(sessionId, sessions))
  const [error, setError] = useState<string | undefined>(undefined)
  const sessionRef = useRef<Session | undefined>(undefined)
  const prevConnectionState = useRef<ConnectionState | null>(null)

  sessionRef.current = session

  useEffect(() => {
    let cancelled = false
    let disposeConversation: (() => void) | undefined
    const currentSummary = sessions.find(item => item.sessionId === sessionId)
    const cached = sessionCache.get(sessionId)
    if (cached?.getSnapshot().openState === 'open') {
      applySummaryHints(cached, currentSummary)
      setSession(cached)
      setReady(true)
      setError(undefined)
      return () => {}
    }

    const optimisticBlank = currentSummary?.blank === true
    if (!optimisticBlank) setReady(false)
    setError(undefined)

    void (async () => {
      try {
        const runtime = await getMobileConversationRuntime()
        if (cancelled) return
        let next = sessionCache.get(sessionId)
        if (next === undefined) {
          next = new Session(sessionId, remotes)
          sessionCache.set(sessionId, next)
        }
        applySummaryHints(next, currentSummary)
        setSession(next)
        const binding = bindMobileConversation(next.eventSource, runtime.events, runtime.views)
        disposeConversation = () => { binding.dispose() }
        const publishConversation = (): void => {
          if (!cancelled) setConversation(binding.snapshot.getSnapshot())
        }
        publishConversation()
        binding.snapshot.subscribe(publishConversation)

        if (optimisticBlank) {
          if (!cancelled) setReady(true)
          try {
            await next.open()
          } catch (openError) {
            if (!cancelled) {
              setError(openError instanceof Error ? openError.message : String(openError))
            }
          }
          return
        }

        await next.open()
        if (cancelled) return
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
      disposeConversation?.()
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionSummaryBlank(sessionId, sessions)) {
      setReady(current => current || true)
    }
  }, [sessionId, sessions])

  useEffect(() => {
    const prev = prevConnectionState.current
    prevConnectionState.current = connectionState
    if (connectionState !== 'connected' || prev !== 'connecting') return
    const active = sessionRef.current
    if (active === undefined || active.getSnapshot().openState !== 'open') return
    void active.resync()
  }, [connectionState])

  useEffect(() => {
    if (session === undefined) return
    applySummaryHints(session, summary)
  }, [session, summary])

  const liveObservable = useMemo((): HostObservable<MobileSessionView> => {
    if (session === undefined) return coldObservable(sessionId, summary)
    return {
      getSnapshot: () => combineView(session.getSnapshot(), conversation),
      subscribe: listener => session.subscribe(listener),
    }
  }, [conversation, session, sessionId, summary])

  const useSession = useMemo(
    () => bindSnapshotSelector(liveObservable),
    [liveObservable],
  )

  const loadOlder = useCallback(async (): Promise<boolean> => {
    if (session === undefined) return false
    const beforeHasMore = session.getSnapshot().hasMore
    await session.loadOlder()
    return session.getSnapshot().hasMore !== beforeHasMore
  }, [session])

  return {
    ready,
    error,
    useSession,
    useProjection: absentProjection,
    loadOlder,
  }
}
