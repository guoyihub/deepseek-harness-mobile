import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ContentBlock, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/message.ts'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { PermissionSelect as PermissionSelectValue } from '@deepseek-ai/dsh-permission-presets/client'
import type { GoalProjection } from '@deepseek-ai/dsh-goal/client'
import type { PlanProjection } from '@deepseek-ai/dsh-plan-mode/client'
import { deriveAgentWorkingFromSnapshot } from './chat-projection.ts'
import { MobileChatFlow } from './MobileChatFlow.tsx'
import { MobileChatHeader } from './MobileChatHeader.tsx'
import { MobileComposer } from './MobileComposer.tsx'
import { MobileComposerTakeover } from './MobileComposerTakeover.tsx'
import { claimExecuteLine, type MobileComposerClaim } from './mobile-composer-claim.ts'
import { MobileSessionTabs, type MobileSessionViewId } from './MobileSessionTabs.tsx'
import { MobileStatsLine } from './MobileStatsLine.tsx'
import { MobileTrajectoryPane } from './MobileTrajectoryPane.tsx'
import { MobileWorkspaceSelect } from './MobileWorkspaceSelect.tsx'
import {
  applyProjectionFrame,
  createProjectionStore,
  projectionValues,
  seedProjectionStore,
} from './mobile-session-projections.ts'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import { mobileApi } from './mobile-api-client.ts'
import { sessionChatHeaderMeta, sessionDisplayTitle, NEW_SESSION_TITLE } from './session-label.ts'
import { mobileConversationT } from './mobile-locale.ts'
import { scrollMobileMessageListToBottom } from './mobile-message-list-scroll.ts'
import { bindMobileChatKeyboardLift } from './mobile-chat-keyboard-lift.ts'
import {
  burstSyncMobileViewportShellFrame,
  pinMobileLayoutViewportBurst,
} from './mobile-visual-viewport.ts'
import { StatusPanel } from './StatusPanel.tsx'
import { useMobileSession } from './useMobileSession.ts'
import css from './mobile-shell.module.css'

/** Props for {@link ChatPage}. */
export interface ChatPageProps {
  /** Active session id. */
  sessionId: SessionId
  /** Optional draft restored when switching blank sessions. */
  initialDraft?: string
  /** Navigate back to the task list. */
  onBack: () => void
  /** Switch to another session while preserving the composer draft. */
  onSessionChange: (sessionId: SessionId, draft: string) => void
}

function textFromUserContent(content: readonly ContentBlock[]): string {
  return content
    .filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()
}

/**
 * Minimal mobile chat surface with history load, streaming updates, and prompt send.
 * @param props - session id and navigation.
 */
export function ChatPage({
  sessionId,
  initialDraft = '',
  onBack,
  onSessionChange,
}: ChatPageProps): JSX.Element {
  const {
    subscribeMux,
    sessions,
    workspaces,
    refreshSessions,
    error: connectionError,
    markSessionViewed,
  } = useMobileConnection()
  const mobileSession = useMobileSession(sessionId)
  const { ready, error: sessionError, useSession, useProjection, loadOlder } = mobileSession
  const [draft, setDraft] = useState(initialDraft)
  const [claim, setClaim] = useState<MobileComposerClaim | undefined>(undefined)
  const [optimisticText, setOptimisticText] = useState<string | undefined>(undefined)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [sessionView, setSessionView] = useState<MobileSessionViewId>('chat')
  const [projections, setProjections] = useState(createProjectionStore)
  const wasAgentWorkingRef = useRef(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const chatSurfaceRef = useRef<HTMLDivElement>(null)
  const chatPageRef = useRef<HTMLDivElement>(null)
  const composerDockRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const keyboardLiftPxRef = useRef(0)
  const [activeSessionId, setActiveSessionId] = useState(sessionId)

  if (sessionId !== activeSessionId) {
    setActiveSessionId(sessionId)
    setProjections(createProjectionStore())
    setError(undefined)
    setDraft(initialDraft)
    setClaim(undefined)
    setOptimisticText(undefined)
    setSessionView('chat')
    stickToBottomRef.current = true
  }

  useEffect(() => {
    markSessionViewed(sessionId)
  }, [markSessionViewed, sessionId])

  useEffect(() => {
    const shell = chatSurfaceRef.current?.closest('[data-mobile-viewport-shell]') as HTMLElement | null
    pinMobileLayoutViewportBurst(shell)
    if (shell !== null) {
      burstSyncMobileViewportShellFrame(shell)
    }
  }, [])

  useEffect(() => () => { markSessionViewed(undefined) }, [markSessionViewed])

  useEffect(() => {
    setDraft(initialDraft)
    setClaim(undefined)
  }, [initialDraft, sessionId])

  const sessionSummary = useMemo(
    () => sessions.find(item => item.sessionId === sessionId),
    [sessionId, sessions],
  )

  const projectionMap = useMemo(() => projectionValues(projections), [projections])

  const pending = useSession(snapshot => snapshot.pending)
  const blank = useSession(snapshot => snapshot.blank)
  const chatOrder = useSession(snapshot => snapshot.chat.order)
  const chatNodes = useSession(snapshot => snapshot.chat.nodes)
  const agentSnapshot = useSession(snapshot => ({
    running: snapshot.running,
    partial: snapshot.partial,
    runningCalls: snapshot.runningCalls,
    chat: snapshot.chat,
  }))

  const title = useMemo(() => {
    const fromProjection = projectionMap.title
    if (typeof fromProjection === 'string' && fromProjection.trim() !== '') return fromProjection
    if (blank && optimisticText === undefined) return NEW_SESSION_TITLE
    if (sessionSummary !== undefined) return sessionDisplayTitle(sessionSummary)
    return sessionId.slice(0, 8)
  }, [blank, optimisticText, projectionMap.title, sessionId, sessionSummary])

  const headerMeta = useMemo(
    () => sessionChatHeaderMeta(sessionId, workspaces),
    [sessionId, workspaces],
  )

  const showHero = blank
    && chatOrder.length === 0
    && draft.trim() === ''
    && claim === undefined
    && optimisticText === undefined
  const switchableWorkspace = blank && optimisticText === undefined
  const newSessionHeader = switchableWorkspace

  const planProjection = projectionMap.plan as PlanProjection | undefined
  const planActive = planProjection !== undefined
    && (planProjection.pending ? !planProjection.active : planProjection.active)
  const goalProjection = projectionMap.goal as GoalProjection | null | undefined
  const goalActive = goalProjection !== undefined && goalProjection !== null

  const onMessageListScroll = (): void => {
    const list = messageListRef.current
    if (list === null) return
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight
    stickToBottomRef.current = distance <= 64
  }

  const followComposerLayout = useCallback((): void => {
    if (!stickToBottomRef.current) return
    const list = messageListRef.current
    if (list === null) return
    scrollMobileMessageListToBottom(list)
  }, [])

  useEffect(() => {
    const dock = composerDockRef.current
    const page = chatPageRef.current
    if (dock === null) return

    const publishHeight = (): void => {
      if (page !== null) {
        page.style.setProperty('--dsh-composer-height', `${dock.offsetHeight}px`)
      }
    }

    const observer = new ResizeObserver(() => {
      publishHeight()
      followComposerLayout()
    })
    observer.observe(dock)
    publishHeight()
    return () => { observer.disconnect() }
  }, [followComposerLayout, pending.length, sessionId, sessionView, showHero])

  useEffect(() => {
    const shell = chatSurfaceRef.current?.closest('[data-mobile-viewport-shell]') as HTMLElement | null
    pinMobileLayoutViewportBurst(shell)
    if (shell !== null) {
      burstSyncMobileViewportShellFrame(shell)
    }
  }, [sessionId])

  useEffect(() => {
    const onViewportChange = (): void => {
      if (keyboardLiftPxRef.current === 0) return
      followComposerLayout()
    }
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    return () => {
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
    }
  }, [followComposerLayout])

  useEffect(() => {
    const surface = chatSurfaceRef.current
    if (surface === null) return
    return bindMobileChatKeyboardLift(surface, {
      onLiftChange: (liftPx) => {
        keyboardLiftPxRef.current = liftPx
        if (liftPx > 0) {
          followComposerLayout()
        }
      },
    })
  }, [followComposerLayout])

  const agentWorking = useMemo(
    () => deriveAgentWorkingFromSnapshot(
      sessionSummary?.running === true,
      agentSnapshot,
      sending,
    ),
    [agentSnapshot, sending, sessionSummary?.running],
  )

  const tokenUsage = projectionMap.tokenUsage as TokenUsageProjection | undefined
  const permissions = projectionMap.permissions as PermissionSelectValue | undefined

  useEffect(() => {
    const summary = sessions.find(item => item.sessionId === sessionId)
    const block = summary?.projections
    if (block === undefined) return
    setProjections(current => seedProjectionStore(current, block))
  }, [sessionId, sessions])

  useEffect(() => {
    return subscribeMux((frame) => {
      if (frame.type === 'session/projection' && frame.sessionId === sessionId) {
        setProjections(current => applyProjectionFrame(current, frame.key, frame.value, frame.seq))
      }
    })
  }, [sessionId, subscribeMux])

  useEffect(() => {
    if (optimisticText === undefined) return
    for (const key of chatOrder) {
      const node = chatNodes.get(key) as ChatNode | undefined
      if (node?.kind !== 'user' && node?.kind !== 'steering') continue
      if (textFromUserContent(node.data.content) === optimisticText) {
        setOptimisticText(undefined)
        break
      }
    }
  }, [chatNodes, chatOrder, optimisticText])

  useEffect(() => {
    if (agentWorking || sending) {
      wasAgentWorkingRef.current = true
      return
    }
    if (!wasAgentWorkingRef.current) return
    wasAgentWorkingRef.current = false
    void refreshSessions()
    let cancelled = false
    void (async () => {
      const response = await mobileApi.sessions.history({ sessionId, maxMessages: 1 })
      if (cancelled || !response.result.ok) return
      const projections = response.result.value.projections
      if (projections === undefined) return
      setProjections(current => seedProjectionStore(current, projections))
    })()
    return () => { cancelled = true }
  }, [agentWorking, refreshSessions, sending, sessionId])

  const onSend = async (): Promise<void> => {
    if (sending) return

    if (claim !== undefined) {
      const line = claimExecuteLine(claim)
      setSending(true)
      setError(undefined)
      setClaim(undefined)
      stickToBottomRef.current = true
      try {
        const response = await mobileApi.commands.execute({ sessionId, line })
        if (!response.result.ok) {
          setError(response.result.error.message)
          setClaim(claim)
          return
        }
        if (!response.result.value.matched) {
          setError(mobileConversationT('command.unknown', { name: claim.name }))
          setClaim(claim)
        }
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : String(sendError))
        setClaim(claim)
      } finally {
        setSending(false)
      }
      return
    }

    const text = draft.trim()
    if (text === '') return
    setSending(true)
    setError(undefined)
    setDraft('')
    stickToBottomRef.current = true
    setOptimisticText(text)
    try {
      const response = await mobileApi.sessions.prompt({
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      })
      if (!response.result.ok) {
        setError(response.result.error.message)
        setOptimisticText(undefined)
        setDraft(text)
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError))
      setOptimisticText(undefined)
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  const onCancel = async (): Promise<void> => {
    if (cancelling) return
    setCancelling(true)
    setError(undefined)
    try {
      const response = await mobileApi.sessions.cancel({ sessionId })
      if (!response.result.ok) {
        setError(response.result.error.message)
      }
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : String(cancelError))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div ref={chatSurfaceRef} className={css.chatSurface}>
      <div className={css.chatSurfaceHeader}>
        <MobileChatHeader
          title={title}
          meta={headerMeta}
          metaSlot={newSessionHeader
            ? (
              <MobileWorkspaceSelect
                sessionId={sessionId}
                switchable={switchableWorkspace}
                locked={agentWorking || sending}
                draft={draft}
                variant="header"
                onSessionChange={onSessionChange}
                onError={setError}
              />
            )
            : undefined}
          onBack={onBack}
          tabs={(
            <MobileSessionTabs active={sessionView} onChange={setSessionView} />
          )}
        />
      </div>
      <MobileShellLayout chatContentLayout>
        <div className={css.chatKeyboardBody}>
          <div ref={chatPageRef} className={showHero ? css.chatPageBlank : css.chatPage}>
            {sessionView === 'trajectory' && !showHero
              ? (
                <MobileTrajectoryPane
                  sessionId={sessionId}
                  ready={ready}
                  error={sessionError}
                  useSession={useSession}
                  loadOlder={loadOlder}
                />
              )
              : (
                <MobileChatFlow
                  sessionId={sessionId}
                  useSession={useSession}
                  useProjection={useProjection}
                  ready={ready}
                  error={sessionError}
                  optimisticText={optimisticText}
                  showHero={showHero}
                  listRef={messageListRef}
                  onScroll={onMessageListScroll}
                />
              )}
            <div ref={composerDockRef} className={showHero ? css.composerDockBlank : css.composerDock}>
              <StatusPanel error={error ?? connectionError} />
              {pending.length > 0
                ? (
                  <MobileComposerTakeover
                    sessionId={sessionId}
                    pending={pending}
                    useSession={useSession}
                    useProjection={useProjection}
                  />
                )
                : (
                  <MobileComposer
                    sessionId={sessionId}
                    draft={draft}
                    sending={sending}
                    locked={agentWorking || sending}
                    agentWorking={agentWorking}
                    stopping={cancelling}
                    permissions={permissions}
                    claim={claim}
                    planActive={planActive}
                    goalActive={goalActive}
                    onDraftChange={setDraft}
                    onClaimChange={setClaim}
                    onSend={() => { void onSend() }}
                    onStop={() => { void onCancel() }}
                    onCommandSubmit={() => { stickToBottomRef.current = true }}
                    onCommandError={setError}
                    onLayoutChange={followComposerLayout}
                  />
                )}
              {pending.length === 0 && <MobileStatsLine tokenUsage={tokenUsage} />}
            </div>
          </div>
        </div>
      </MobileShellLayout>
    </div>
  )
}
