import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { PermissionSelect as PermissionSelectValue } from '@deepseek-ai/dsh-permission-presets/client'
import type { GoalProjection } from '@deepseek-ai/dsh-goal/client'
import type { PlanProjection } from '@deepseek-ai/dsh-plan-mode/client'
import type { EncodedImageAttachment } from '@deepseek-ai/dsh-attachment/types'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {} from '@deepseek-ai/dsh-schedule/client'
import { deriveAgentWorkingFromSnapshot } from './chat-projection.ts'
import { MobileChatFlow } from './MobileChatFlow.tsx'
import { MobileChatHeader } from './MobileChatHeader.tsx'
import { MobileComposer } from './MobileComposer.tsx'
import { MobileComposerTakeover } from './MobileComposerTakeover.tsx'
import { claimExecuteLine, type MobileComposerClaim } from './mobile-composer-claim.ts'
import { MobileStatsLine } from './MobileStatsLine.tsx'
import { MobileWorkspaceSelect } from './MobileWorkspaceSelect.tsx'
import { encodeMobileImageFile } from './mobile-attachment.ts'
import { MobileReconnectBanner } from './MobileReconnectBanner.tsx'
import { MobileScheduleSheet } from './MobileScheduleSheet.tsx'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import { mobileApi } from './mobile-api-client.ts'
import { sessionChatHeaderMeta, sessionDisplayTitle, newSessionTitle } from './session-label.ts'
import { mobileConversationT, useMobileLanguage } from './mobile-locale.ts'
import { MobileScrollToBottomButton } from './MobileScrollToBottomButton.tsx'
import { MobileTurnNavigator } from './MobileTurnNavigator.tsx'
import { useMobileActiveTurn } from './useMobileActiveTurn.ts'
import {
  isMobileMessageListAtBottom,
  scrollMobileMessageListToBottom,
} from './mobile-message-list-scroll.ts'
import { bindMobileChatKeyboardLift } from './mobile-chat-keyboard-lift.ts'
import {
  burstSyncMobileViewportShellFrame,
  pinMobileLayoutViewportBurst,
} from './mobile-visual-viewport.ts'
import { StatusPanel } from './StatusPanel.tsx'
import { useMobileSession } from './useMobileSession.ts'
import { useMobilePendingInteraction } from './useMobilePendingInteraction.ts'
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
  useMobileLanguage()
  const {
    sessions,
    workspaces,
    refreshSessions,
    error: connectionError,
    markSessionViewed,
  } = useMobileConnection()
  const mobileSession = useMobileSession(sessionId)
  const { ready, error: sessionError, useSession, useProjection, loadImage } = mobileSession
  const [draft, setDraft] = useState(initialDraft)
  const [claim, setClaim] = useState<MobileComposerClaim | undefined>(undefined)
  const [optimisticText, setOptimisticText] = useState<string | undefined>(undefined)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [pendingImages, setPendingImages] = useState<readonly EncodedImageAttachment[]>([])
  const [pendingImageUrls, setPendingImageUrls] = useState<readonly string[]>([])
  const wasAgentWorkingRef = useRef(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const chatSurfaceRef = useRef<HTMLDivElement>(null)
  const chatPageRef = useRef<HTMLDivElement>(null)
  const composerDockRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)
  const keyboardLiftPxRef = useRef(0)
  const [activeSessionId, setActiveSessionId] = useState(sessionId)

  if (sessionId !== activeSessionId) {
    setActiveSessionId(sessionId)
    setError(undefined)
    setDraft(initialDraft)
    setClaim(undefined)
    setOptimisticText(undefined)
    setPendingImages([])
    setPendingImageUrls((urls) => {
      for (const url of urls) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      }
      return []
    })
    stickToBottomRef.current = true
    setAtBottom(true)
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

  const projectionTitle = useProjection('title')
  const planProjection = useProjection('plan') as PlanProjection | undefined
  const goalProjection = useProjection('goal') as GoalProjection | null | undefined
  const tokenUsage = useProjection('tokenUsage') as TokenUsageProjection | undefined
  const sessionStats = useProjection('sessionStats')
  const permissions = useProjection('permissions') as PermissionSelectValue | undefined
  const scheduleRecords = useProjection('schedule')
  const turnItems = useSession(snapshot => snapshot.chat.navigation.items())
  const chatOrderLength = useSession(snapshot => snapshot.chat.order.length)
  const chatRunning = useSession(snapshot => snapshot.running)
  const turnContentRevision = `${sessionId}:${chatOrderLength}:${chatRunning ? 1 : 0}:${optimisticText ?? ''}`
  const { activeTurn, setActiveTurn, scheduleActiveTurn } = useMobileActiveTurn(
    messageListRef,
    turnItems,
    sessionId,
    turnContentRevision,
  )

  const pendingInteraction = useMobilePendingInteraction(sessionId)
  const blank = useSession(snapshot => snapshot.blank)
  const chatOrder = useSession(snapshot => snapshot.chat.order)
  const chatNodes = useSession(snapshot => snapshot.chat.nodes)
  const agentSnapshot = useSession(snapshot => ({
    running: snapshot.running,
    chat: snapshot.chat,
  }))

  const title = useMemo(() => {
    if (typeof projectionTitle === 'string' && projectionTitle.trim() !== '') return projectionTitle
    if (blank && optimisticText === undefined) return newSessionTitle()
    if (sessionSummary !== undefined) return sessionDisplayTitle(sessionSummary)
    return sessionId.slice(0, 8)
  }, [blank, optimisticText, projectionTitle, sessionId, sessionSummary])

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

  const planActive = planProjection !== undefined
    && (planProjection.pending ? !planProjection.active : planProjection.active)
  const goalActive = goalProjection !== undefined && goalProjection !== null

  const onMessageListScroll = (): void => {
    const list = messageListRef.current
    if (list === null) return
    const nextAtBottom = isMobileMessageListAtBottom(list)
    stickToBottomRef.current = nextAtBottom
    setAtBottom(prev => (prev === nextAtBottom ? prev : nextAtBottom))
    scheduleActiveTurn()
  }

  const onScrollToBottom = (): void => {
    const list = messageListRef.current
    if (list === null) return
    stickToBottomRef.current = true
    setAtBottom(true)
    scrollMobileMessageListToBottom(list)
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
  }, [followComposerLayout, pendingInteraction !== undefined, sessionId, showHero])

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
        followComposerLayout()
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

  useEffect(() => {
    if (optimisticText === undefined) return
    for (const key of chatOrder) {
      const node = chatNodes.get(key) as ChatNode | undefined
      if (node?.kind !== 'user' && node?.kind !== 'steering') continue
      const content = 'content' in node.data ? node.data.content : undefined
      if (!Array.isArray(content)) continue
      if (textFromUserContent(content as readonly ContentBlock[]) === optimisticText) {
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
    if (text === '' && pendingImages.length === 0) return
    const images = pendingImages
    setSending(true)
    setError(undefined)
    setDraft('')
    setPendingImages([])
    setPendingImageUrls((urls) => {
      for (const url of urls) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      }
      return []
    })
    stickToBottomRef.current = true
    if (text !== '') setOptimisticText(text)
    try {
      const content = [
        ...images.map(image => ({ type: 'image' as const, ...image })),
        ...text === '' ? [] : [{ type: 'text' as const, text }],
      ]
      const response = await mobileApi.sessions.prompt({
        sessionId,
        mode: 'queue',
        content,
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
      <MobileReconnectBanner />
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
          actions={(
            <div className={css.chatHeaderActions}>
              <MobileScheduleSheet records={scheduleRecords} />
            </div>
          )}
        />
      </div>
      <MobileShellLayout chatContentLayout>
        <div className={css.chatKeyboardBody}>
          <div ref={chatPageRef} className={showHero ? css.chatPageBlank : css.chatPage}>
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
              loadImage={loadImage}
            />
            {!showHero && (
              <MobileTurnNavigator
                items={turnItems}
                activeTurn={activeTurn}
                listRef={messageListRef}
                onActiveTurnChange={setActiveTurn}
              />
            )}
            <MobileScrollToBottomButton
              visible={!showHero && !atBottom}
              onClick={onScrollToBottom}
            />
            <div ref={composerDockRef} className={showHero ? css.composerDockBlank : css.composerDock}>
              <StatusPanel error={error ?? connectionError} />
              {pendingInteraction !== undefined
                ? (
                  <MobileComposerTakeover
                    sessionId={sessionId}
                    pendingInteraction={pendingInteraction}
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
                    pendingImageUrls={pendingImageUrls}
                    onRemoveImage={(index) => {
                      setPendingImages(current => current.filter((_, i) => i !== index))
                      setPendingImageUrls((urls) => {
                        const next = urls.filter((_, i) => i !== index)
                        const removed = urls[index]
                        if (removed?.startsWith('blob:')) URL.revokeObjectURL(removed)
                        return next
                      })
                    }}
                    onAttachImage={(file) => {
                      void encodeMobileImageFile(file).then((encoded) => {
                        if (encoded === undefined) {
                          setError(mobileConversationT('input.unsupportedImage'))
                          return
                        }
                        setPendingImages(current => [...current, encoded])
                        setPendingImageUrls(current => [...current, URL.createObjectURL(file)])
                      })
                    }}
                  />
                )}
              {pendingInteraction === undefined && (
                <MobileStatsLine tokenUsage={tokenUsage} sessionStats={sessionStats} />
              )}
            </div>
          </div>
        </div>
      </MobileShellLayout>
    </div>
  )
}
