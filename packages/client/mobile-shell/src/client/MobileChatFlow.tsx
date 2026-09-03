/**
 * Mobile chat transcript: ordered Chat Nodes from the shared Session fold,
 * rendered with the desktop conversation node views.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { MessageImageLoader, RenderMessageImages } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import chatCss from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/ChatView.module.css'
import { formatRunDuration } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/message-chrome.ts'
import { createChatStore } from '@deepseek-ai/dsh-client-ui-chat/src/client/stores.ts'
import type { UseChatNode, UseChatNodeProcess } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/slots.ts'
import {
  PendingSteeringBubble,
  PendingSubmissionBubble,
} from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/MessageItem.tsx'
import { MobileChatNodeSeat } from './MobileChatNodeSeat.tsx'
import { MobileChatHero } from './MobileChatHero.tsx'
import { MobileMessageImages } from './MobileMessageImages.tsx'
import { latestOpenTurnStartTime } from './chat-projection.ts'
import { mobileChatT } from './mobile-conversation-t.ts'
import { mobileConversationT } from './mobile-locale.ts'
import { visibleMobileSubmissions } from './mobile-chat-pending.ts'
import { getMobileSessionChatStore } from './mobile-session-cache.ts'
import {
  isMobileMessageListAtBottom,
  scrollMobileMessageListToBottom,
} from './mobile-message-list-scroll.ts'
import css from './mobile-shell.module.css'
import type { MobileSessionView } from './useMobileSession.ts'

/** Props for {@link MobileChatFlow}. */
export interface MobileChatFlowProps {
  /** Active Host session. */
  sessionId: SessionId
  /** Shared Session face from {@link useMobileSession}. */
  useSession: SnapshotSelectorHook<MobileSessionView>
  /** Per-node keyed selector for ChatNodeSeat. */
  useChatNode: UseChatNode
  /** Per-node Turn-process presentation selector. */
  useChatNodeProcess: UseChatNodeProcess
  /** Framework projection reader (absent on mobile). */
  useProjection: UseProjection
  /** Whether Session.open has finished. */
  ready: boolean
  /** Session open / history error. */
  error: string | undefined
  /** Whether the blank-chat hero should show. */
  showHero: boolean
  /** Scrollport ref owned by the page (composer follow / stick-to-bottom). */
  listRef: RefObject<HTMLDivElement>
  /** Reader scroll handler for stick-to-bottom ownership. */
  onScroll: () => void
  /** Session-authorized image URL loader. */
  loadImage: MessageImageLoader
  /** Page older history into the Session window. */
  loadOlder: () => Promise<boolean>
}

/** Pin the scrollport to the latest transcript row after layout settles. */
function scrollListToBottom(list: HTMLDivElement): void {
  scrollMobileMessageListToBottom(list)
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
      {mobileChatT('chat.deepDiving')}
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
 * @param props - session face, hero chrome, and scroll ownership.
 */
export function MobileChatFlow({
  sessionId,
  useSession,
  useChatNode,
  useChatNodeProcess,
  useProjection,
  ready,
  error,
  showHero,
  listRef,
  onScroll,
  loadImage,
  loadOlder,
}: MobileChatFlowProps): JSX.Element {
  const order = useSession(s => s.chat.order)
  const timeline = useSession(s => s.chat.timeline)
  const historyIncomplete = useSession(s => s.session.hasMore)
  const loadingOlder = useSession(s => s.session.loadingOlder)
  const chatNodes = useSession(s => s.chat.nodes)
  const queue = useSession(s => s.session.queue)
  const pendingSubmissions = useSession(s => s.session.pendingSubmissions)
  const running = useSession(s => s.running)
  const chatStore = useMemo(
    () => getMobileSessionChatStore(sessionId) ?? createChatStore().create(sessionId),
    [sessionId],
  )
  const useStore = useMemo(() => bindSnapshotSelector(chatStore), [chatStore])
  const runningTurnStart = useMemo(() => latestOpenTurnStartTime(timeline), [timeline])
  const visibleSubmissions = useMemo(
    () => visibleMobileSubmissions(pendingSubmissions, order, chatNodes, queue),
    [chatNodes, order, pendingSubmissions, queue],
  )
  const pendingSteering = useMemo(
    () => queue.filter(item => item.placement === 'steering'),
    [queue],
  )
  const lastSubmissionId = visibleSubmissions.at(-1)?.requestId ?? ''
  const followSig = useSession(s => (
    `${s.openState}:${s.chat.order.length}:${s.chat.order.at(-1) ?? ''}:${latestOpenTurnStartTime(s.chat.timeline) === null ? 0 : 1}:${lastSubmissionId}`
  ))
  const stickRef = useRef(true)
  const openedRef = useRef(false)
  const followSigRef = useRef<string | null>(null)

  const renderMessageImages = useCallback<RenderMessageImages>(owner => (
    <MobileMessageImages {...owner} loadImage={loadImage} />
  ), [loadImage])

  const onLoadOlder = (): void => {
    void loadOlder()
  }

  useLayoutEffect(() => {
    const list = listRef.current
    if (list === null || !ready || showHero) return
    if (!openedRef.current) {
      scrollListToBottom(list)
      stickRef.current = true
      openedRef.current = true
      followSigRef.current = followSig
      return
    }
    if (followSigRef.current !== followSig && stickRef.current) {
      scrollListToBottom(list)
    }
    followSigRef.current = followSig
  }, [followSig, listRef, ready, showHero])

  useEffect(() => {
    const list = listRef.current
    if (list === null || !ready || showHero) return

    const onResize = (): void => {
      if (stickRef.current) scrollListToBottom(list)
    }

    const observer = new ResizeObserver(onResize)
    observer.observe(list)
    for (const node of list.children) observer.observe(node)

    return () => { observer.disconnect() }
  }, [listRef, ready, showHero, sessionId, followSig])

  const onListScroll = (): void => {
    const list = listRef.current
    if (list === null) return
    stickRef.current = isMobileMessageListAtBottom(list)
    onScroll()
  }

  if (!ready && !showHero) {
    return (
      <div ref={listRef} className={css.messageList} onScroll={onListScroll}>
        <div className={css.loadingState}>{mobileConversationT('chat.loadingHistory')}</div>
      </div>
    )
  }

  if (!ready && showHero) {
    return (
      <div ref={listRef} className={css.messageList} onScroll={onListScroll}>
        <MobileChatHero />
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
      {historyIncomplete && (
        <div className={chatCss.older}>
          <button type="button" disabled={loadingOlder} onClick={onLoadOlder}>
            {loadingOlder ? mobileChatT('loading') : mobileChatT('chat.loadOlder')}
          </button>
        </div>
      )}
      {order.map(nodeKey => (
        <MobileChatNodeSeat
          key={nodeKey}
          nodeKey={nodeKey}
          sessionId={sessionId}
          useSession={useSession}
          useChatNode={useChatNode}
          useChatNodeProcess={useChatNodeProcess}
          useProjection={useProjection}
          useStore={useStore}
          actions={chatStore.actions}
          historyIncomplete={historyIncomplete}
          loadImage={loadImage}
        />
      ))}
      {pendingSteering.map(item => (
        <PendingSteeringBubble
          key={item.id}
          content={item.content}
          renderMessageImages={renderMessageImages}
          t={mobileChatT}
        />
      ))}
      {visibleSubmissions.map(submission => (
        <PendingSubmissionBubble
          key={submission.requestId}
          submission={submission}
          renderMessageImages={renderMessageImages}
          t={mobileChatT}
        />
      ))}
      {running && <TurnStatus startTime={runningTurnStart} />}
    </div>
  )
}
