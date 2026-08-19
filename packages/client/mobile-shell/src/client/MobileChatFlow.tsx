/**
 * Mobile chat transcript: ordered Chat Nodes from the shared Session fold,
 * rendered with the desktop conversation node views.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { ConversationSnapshot, ConversationTimelineSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { MessageText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import chatCss from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/ChatView.module.css'
import { formatRunDuration } from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/message-chrome.ts'
import { MobileChatNodeSeat } from './MobileChatNodeSeat.tsx'
import { MobileChatHero } from './MobileChatHero.tsx'
import { mobileChatT } from './mobile-conversation-t.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileChatFlow}. */
export interface MobileChatFlowProps {
  /** Active Host session. */
  sessionId: SessionId
  /** Shared Session face from {@link useMobileSession}. */
  useSession: SnapshotSelectorHook<ConversationSnapshot>
  /** Whether Session.open has finished. */
  ready: boolean
  /** Session open / history error. */
  error: string | undefined
  /** Optimistic user text while the matching mux user node is pending. */
  optimisticText: string | undefined
  /** Whether the blank-chat hero should show. */
  showHero: boolean
  /** Scrollport ref owned by the page (composer follow / stick-to-bottom). */
  listRef: RefObject<HTMLDivElement>
  /** Reader scroll handler for stick-to-bottom ownership. */
  onScroll: () => void
}

function runningTurnStartTime(timeline: ConversationTimelineSnapshot): number | null {
  let latest: number | null = null
  for (const turn of timeline.turns.values()) {
    if (turn.status === 'open' && turn.start !== undefined) latest = turn.start.time
  }
  return latest
}

/** Turn-level activity label matching the desktop ChatView status line. */
function TurnStatus({ startTime }: { startTime: number | null }): ReactNode {
  const [mountedAt] = useState(() => Date.now())
  const anchor = startTime ?? mountedAt
  const [elapsedMs, setElapsedMs] = useState(() => Math.max(0, Date.now() - anchor))
  useEffect(() => {
    const tick = (): void => {
      setElapsedMs(Math.max(0, Date.now() - anchor))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => { window.clearInterval(id) }
  }, [anchor])
  const showClock = elapsedMs >= 15_000
  return (
    <div className={chatCss.turnStatus} role="status" aria-live="polite">
      Deep diving...
      {showClock && (
        <span className={chatCss.turnStatusClock} aria-hidden>
          {formatRunDuration(elapsedMs, mobileChatT)}
        </span>
      )}
    </div>
  )
}

/**
 * Render the mobile conversation transcript from Chat Conversation Nodes.
 * @param props - session face, hero/optimistic chrome, and scroll ownership.
 */
export function MobileChatFlow({
  sessionId,
  useSession,
  ready,
  error,
  optimisticText,
  showHero,
  listRef,
  onScroll,
}: MobileChatFlowProps): JSX.Element {
  const order = useSession(s => s.chat.order)
  const running = useSession(s => s.running)
  const timeline = useSession(s => s.chat.timeline)
  const runningTurnStart = useMemo(() => runningTurnStartTime(timeline), [timeline])
  const followSig = useSession(s => (
    `${s.openState}:${s.chat.order.length}:${s.chat.order.at(-1) ?? ''}:${s.running ? 1 : 0}:${optimisticText ?? ''}`
  ))
  const stickRef = useRef(true)
  const openedRef = useRef(false)
  const followSigRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (list === null || !ready || showHero) return
    if (!openedRef.current) {
      list.scrollTop = list.scrollHeight
      stickRef.current = true
      openedRef.current = true
      followSigRef.current = followSig
      return
    }
    if (followSigRef.current !== followSig && stickRef.current) {
      list.scrollTop = list.scrollHeight
    }
    followSigRef.current = followSig
  }, [followSig, listRef, ready, showHero])

  useEffect(() => {
    openedRef.current = false
    followSigRef.current = null
    stickRef.current = true
  }, [sessionId])

  const onListScroll = (): void => {
    const list = listRef.current
    if (list === null) return
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight
    stickRef.current = distance <= 64
    onScroll()
  }

  if (!ready) {
    return (
      <div ref={listRef} className={css.messageList} onScroll={onListScroll}>
        <div className={css.loadingState}>正在加载历史消息…</div>
      </div>
    )
  }

  if (error !== undefined) {
    return (
      <div ref={listRef} className={css.messageList} onScroll={onListScroll}>
        <div className={css.loadingState} role="alert">{error}</div>
      </div>
    )
  }

  if (showHero) {
    return (
      <div ref={listRef} className={css.messageList} onScroll={onListScroll}>
        <MobileChatHero />
      </div>
    )
  }

  return (
    <div ref={listRef} className={css.messageList} onScroll={onListScroll}>
      {order.map(nodeKey => (
        <MobileChatNodeSeat
          key={nodeKey}
          nodeKey={nodeKey}
          sessionId={sessionId}
          useSession={useSession}
        />
      ))}
      {optimisticText !== undefined && (
        <div className={css.userRow} data-optimistic-user>
          <div className={css.userBubble}>
            <MessageText text={optimisticText} />
          </div>
        </div>
      )}
      {running && <TurnStatus startTime={runningTurnStart} />}
    </div>
  )
}
