/**
 * Per-session Session + Conversation fold for mobile chat.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionId, SessionSeq } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionSnapshot, UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import { Session } from '@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { EMPTY_CONVERSATION_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { EMPTY_CHAT_SNAPSHOT, type ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'
import type { HostObservable, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import {
  acquireMobileSession,
  getCachedMobileSession,
  releaseMobileSession,
  sessionReadyFromCache,
} from './mobile-session-cache.ts'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { bindMobileUseProjection } from './mobile-projection-bind.ts'
import { createMobileImageLoader } from './mobile-attachment.ts'
import { bindKeyedSnapshotSelector } from './mobile-keyed-selector.ts'
import type { MessageImageLoader } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { UseChatNode, UseChatNodeProcess } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/slots.ts'

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
  if (sessionReadyFromCache(sessionId)) return true
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
    promptAttempted: false,
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

/**
 * Session + conversation view with a stable {@link HostObservable.getSnapshot}
 * reference until either input snapshot changes.
 * @param session - open Session instance.
 * @param conversation - bound conversation fold snapshot.
 */
function createLiveSessionViewObservable(
  session: Pick<Session, 'getSnapshot' | 'subscribe'>,
  conversation: ConversationSnapshot,
): HostObservable<MobileSessionView> {
  let cachedView: MobileSessionView | undefined
  let cachedSessionSnap: SessionSnapshot | undefined
  let cachedConversation: ConversationSnapshot | undefined

  return {
    getSnapshot: () => {
      const sessionSnap = session.getSnapshot()
      if (
        cachedView !== undefined
        && cachedSessionSnap === sessionSnap
        && cachedConversation === conversation
      ) {
        return cachedView
      }
      cachedSessionSnap = sessionSnap
      cachedConversation = conversation
      cachedView = combineView(sessionSnap, conversation)
      return cachedView
    },
    subscribe: listener => session.subscribe(listener),
  }
}

/** @internal test-only export for snapshot stability coverage. */
export const createLiveSessionViewObservableForTest = createLiveSessionViewObservable

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
  /** Open Session instance; undefined while cold. */
  session: Session | undefined
  /** uSES selector over the combined session + chat view. */
  useSession: SnapshotSelectorHook<MobileSessionView>
  /** Framework seat required by ConvViewProps. */
  useProjection: UseProjection
  /** Per-node keyed selector for ChatNodeSeat. */
  useChatNode: UseChatNode
  /** Per-node Turn-process presentation selector. */
  useChatNodeProcess: UseChatNodeProcess
  /** Page older history into the Session window. */
  loadOlder: () => Promise<boolean>
  /** Jump loader: page backwards until the window covers seq. */
  loadThrough: (seq: SessionSeq) => Promise<void>
  /** Session-authorized durable image loader. */
  loadImage: MessageImageLoader
}

/**
 * Open a Session for Chat assembly.
 * @param sessionId - active Host session.
 */
export function useMobileSession(sessionId: SessionId): MobileSessionHandle {
  const { sessions } = useMobileConnection()
  const summary = useMemo(
    () => sessions.find(item => item.sessionId === sessionId),
    [sessionId, sessions],
  )
  const [session, setSession] = useState<Session | undefined>(() => getCachedMobileSession(sessionId))
  const [conversation, setConversation] = useState<ConversationSnapshot>(EMPTY_CONVERSATION_SNAPSHOT)
  const [ready, setReady] = useState(() => sessionReadyInstant(sessionId, sessions))
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let unsubscribeBinding: (() => void) | undefined
    const currentSummary = sessions.find(item => item.sessionId === sessionId)
    const optimisticBlank = currentSummary?.blank === true
    if (!optimisticBlank && !sessionReadyFromCache(sessionId)) setReady(false)
    setError(undefined)

    void (async () => {
      try {
        const acquired = await acquireMobileSession(sessionId)
        if (cancelled) {
          releaseMobileSession(sessionId)
          return
        }
        applySummaryHints(acquired.session, currentSummary)
        setSession(acquired.session)
        const publishConversation = (): void => {
          if (!cancelled) setConversation(acquired.binding.snapshot.getSnapshot())
        }
        publishConversation()
        unsubscribeBinding = acquired.binding.snapshot.subscribe(publishConversation)

        if (optimisticBlank) {
          if (!cancelled) setReady(true)
          try {
            await acquired.session.open()
          } catch (openError) {
            if (!cancelled) {
              setError(openError instanceof Error ? openError.message : String(openError))
            }
          }
          return
        }

        if (acquired.session.getSnapshot().openState === 'open') {
          if (!cancelled) setReady(true)
          return
        }

        await acquired.session.open()
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
      unsubscribeBinding?.()
      releaseMobileSession(sessionId)
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionSummaryBlank(sessionId, sessions)) {
      setReady(current => current || true)
    }
  }, [sessionId, sessions])

  useEffect(() => {
    if (session === undefined) return
    applySummaryHints(session, summary)
  }, [session, summary])

  const liveObservable = useMemo((): HostObservable<MobileSessionView> => {
    if (session === undefined) return coldObservable(sessionId, summary)
    return createLiveSessionViewObservable(session, conversation)
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

  const loadThrough = useCallback(async (seq: SessionSeq): Promise<void> => {
    if (session === undefined) return
    await session.loadThrough(seq)
  }, [session])

  const useProjection = useMemo(
    () => bindMobileUseProjection(session?.projections),
    [session],
  )
  const loadImage = useMemo(() => createMobileImageLoader(session), [session])

  const useChatNode = useMemo(
    () => bindKeyedSnapshotSelector(
      (key: string) => liveObservable.getSnapshot().chat.nodes.source(key),
    ) as UseChatNode,
    [liveObservable],
  )
  const useChatNodeProcess = useMemo(
    () => bindKeyedSnapshotSelector(
      (key: string) => liveObservable.getSnapshot().chat.nodes.processSource(key),
    ) as UseChatNodeProcess,
    [liveObservable],
  )

  return {
    ready,
    error,
    session,
    useSession,
    useProjection,
    useChatNode,
    useChatNodeProcess,
    loadOlder,
    loadThrough,
    loadImage,
  }
}
