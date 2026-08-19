/**
 * Per-session {@link Session} for mobile chat and trajectory: opens history,
 * accepts mux frames for this session id, and exposes a uSES selector hook.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionId, MuxFrame, RpcRequest } from '@deepseek-ai/dsh-client-connection/client'
import {
  EMPTY_CHAT_SNAPSHOT,
  EMPTY_CONVERSATION_VIEWS,
  type ConversationSnapshot,
  type UseProjection,
} from '@deepseek-ai/dsh-client-runtime/client'
import { Session } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/session.ts'
import type { SessionRemotes } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/remotes.ts'
import type { HostObservable, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { getMobileConversationRuntime } from './mobile-conversation-runtime.ts'
import { mobileApi } from './mobile-api-client.ts'
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

function frameSessionId(frame: MuxFrame): SessionId | undefined {
  if ('sessionId' in frame && typeof frame.sessionId === 'string') {
    return frame.sessionId as SessionId
  }
  return undefined
}

function coldSnapshot(sessionId: SessionId): ConversationSnapshot {
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
    blank: true,
    lastAgentError: null,
  }
}

function coldObservable(sessionId: SessionId): HostObservable<ConversationSnapshot> {
  const snapshot = coldSnapshot(sessionId)
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
  }
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
  const { subscribeMuxEnvelope, sessions } = useMobileConnection()
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError(undefined)
    setSession(undefined)
    void (async () => {
      try {
        const conversation = await getMobileConversationRuntime()
        if (cancelled) return
        const next = new Session(sessionId, mobileApi, mobileSessionRemotes(), { conversation })
        setSession(next)
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
    }
  }, [sessionId])

  useEffect(() => {
    if (session === undefined) return
    return subscribeMuxEnvelope((envelope: RpcRequest<MuxFrame>) => {
      const frame = envelope.payload
      if (frameSessionId(frame) !== sessionId) return
      if (frame.type === 'session/projection') return
      session.handleMuxEnvelope(envelope.rpcId, frame)
    })
  }, [session, sessionId, subscribeMuxEnvelope])

  useEffect(() => {
    if (session === undefined) return
    const summary = sessions.find(item => item.sessionId === sessionId)
    if (summary === undefined) return
    session.handleRunning(summary.running)
    session.handleBlank(summary.blank)
  }, [session, sessionId, sessions])

  const useSession = useMemo(
    () => bindSnapshotSelector(session ?? coldObservable(sessionId)),
    [session, sessionId],
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
