import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { PermissionSelect as PermissionSelectValue } from '@deepseek-ai/dsh-permission-presets/client'
import type { GoalProjection } from '@deepseek-ai/dsh-goal/client'
import type { PlanProjection } from '@deepseek-ai/dsh-plan-mode/client'
import { ConnectionBanner, MessageText } from '@deepseek-ai/dsh-client-ui-primitives'
import { applyMuxEvent, deriveAgentWorking, OPTIMISTIC_USER_PREFIX, rowsFromHistory, type ChatRow } from './chat-projection.ts'
import { MobileAssistantBody } from './MobileAssistantBody.tsx'
import { MobileBackButton } from './MobileBackButton.tsx'
import { MobileChatHero } from './MobileChatHero.tsx'
import { MobileChatHeader } from './MobileChatHeader.tsx'
import { MobileCommandRow } from './MobileCommandRow.tsx'
import { MobileComposer } from './MobileComposer.tsx'
import { claimExecuteLine, type MobileComposerClaim } from './mobile-composer-claim.ts'
import { MobileContextRow } from './MobileContextRow.tsx'
import { MobileStatsLine } from './MobileStatsLine.tsx'
import { MobileToolRow } from './MobileToolRow.tsx'
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
import { sessionChatHeaderMeta, sessionDisplayTitle } from './session-label.ts'
import { mobileConversationT } from './mobile-locale.ts'
import { StatusPanel } from './StatusPanel.tsx'
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

function hasConversationContent(rows: readonly ChatRow[]): boolean {
  return rows.some(row => row.role === 'user' || row.role === 'assistant')
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
  const { subscribeMux, connectionState, sessions, hostDescription, refreshSessions } = useMobileConnection()
  const [rows, setRows] = useState<ChatRow[]>([])
  const [draft, setDraft] = useState(initialDraft)
  const [claim, setClaim] = useState<MobileComposerClaim | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [projections, setProjections] = useState(createProjectionStore)
  const wasAgentWorkingRef = useRef(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  /** Session id whose history has already been scrolled to the floor. */
  const scrolledSessionRef = useRef<SessionId | null>(null)
  /** Keep the floor in view while the reader has not scrolled away. */
  const stickToBottomRef = useRef(true)
  const [historySessionId, setHistorySessionId] = useState(sessionId)

  // Reset chat chrome when the active session changes (before paint).
  if (sessionId !== historySessionId) {
    setHistorySessionId(sessionId)
    setLoading(true)
    setRows([])
    setProjections(createProjectionStore())
    setError(undefined)
    setDraft(initialDraft)
    setClaim(undefined)
    scrolledSessionRef.current = null
    stickToBottomRef.current = true
  }

  useEffect(() => {
    setDraft(initialDraft)
    setClaim(undefined)
  }, [initialDraft, sessionId])

  const sessionSummary = useMemo(
    () => sessions.find(item => item.sessionId === sessionId),
    [sessionId, sessions],
  )

  const hostLabel = useMemo(() => {
    if (hostDescription?.provider !== undefined) return hostDescription.provider
    if (hostDescription?.model !== undefined) return hostDescription.model
    return 'DSH'
  }, [hostDescription])

  const projectionMap = useMemo(() => projectionValues(projections), [projections])

  const title = useMemo(() => {
    const fromProjection = projectionMap.title
    if (typeof fromProjection === 'string' && fromProjection.trim() !== '') return fromProjection
    if (sessionSummary !== undefined) return sessionDisplayTitle(sessionSummary)
    return sessionId.slice(0, 8)
  }, [projectionMap.title, sessionId, sessionSummary])

  const headerMeta = useMemo(() => {
    if (sessionSummary !== undefined) return sessionChatHeaderMeta(sessionSummary, hostLabel)
    return `${hostLabel} · Work`
  }, [hostLabel, sessionSummary])

  const showHero = !loading && !hasConversationContent(rows) && draft.trim() === '' && claim === undefined
  const switchableWorkspace = !hasConversationContent(rows)

  const planProjection = projectionMap.plan as PlanProjection | undefined
  const planActive = planProjection !== undefined
    && (planProjection.pending ? !planProjection.active : planProjection.active)
  const goalProjection = projectionMap.goal as GoalProjection | null | undefined
  const goalActive = goalProjection !== undefined && goalProjection !== null

  const scrollMessageListToBottom = (): void => {
    const list = messageListRef.current
    if (list === null) return
    list.scrollTop = list.scrollHeight
  }

  useLayoutEffect(() => {
    if (loading || showHero) return
    const list = messageListRef.current
    if (list === null) return
    if (scrolledSessionRef.current !== sessionId) {
      scrollMessageListToBottom()
      scrolledSessionRef.current = sessionId
      stickToBottomRef.current = true
      return
    }
    if (stickToBottomRef.current) scrollMessageListToBottom()
  }, [loading, rows, sessionId, showHero])

  const onMessageListScroll = (): void => {
    const list = messageListRef.current
    if (list === null) return
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight
    stickToBottomRef.current = distance <= 64
  }

  const agentWorking = useMemo(
    () => deriveAgentWorking(sessionSummary?.running === true, rows, sending),
    [rows, sending, sessionSummary?.running],
  )

  const tokenUsage = projectionMap.tokenUsage as TokenUsageProjection | undefined
  const permissions = projectionMap.permissions as PermissionSelectValue | undefined

  useEffect(() => {
    let cancelled = false
    const summary = sessions.find(item => item.sessionId === sessionId)
    const load = async (): Promise<void> => {
      setLoading(true)
      setError(undefined)
      try {
        const response = await mobileApi.sessions.history({ sessionId, maxMessages: 50 })
        if (cancelled) return
        if (!response.result.ok) {
          setError(response.result.error.message)
          setRows([])
          return
        }
        const history = response.result.value
        setRows(rowsFromHistory(history.events))
        setProjections(() => {
          let store = createProjectionStore()
          if (summary?.projections !== undefined) {
            store = seedProjectionStore(store, summary.projections)
          }
          if (history.projections !== undefined) {
            store = seedProjectionStore(store, history.projections)
          }
          return store
        })
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
    // History is per-session; session.list refreshes must not reload the transcript.
  }, [sessionId])

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
        return
      }
      setRows(current => applyMuxEvent(current, sessionId, frame))
    })
  }, [sessionId, subscribeMux])

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
    const optimisticId = `${OPTIMISTIC_USER_PREFIX}${String(Date.now())}`
    setRows(current => [...current, { id: optimisticId, role: 'user', text }])
    try {
      const response = await mobileApi.sessions.prompt({
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      })
      if (!response.result.ok) {
        setError(response.result.error.message)
        setRows(current => current.filter(row => row.id !== optimisticId))
        setDraft(text)
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError))
      setRows(current => current.filter(row => row.id !== optimisticId))
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
    <div className={css.chatSurface}>
      <ConnectionBanner reconnecting={connectionState === 'reconnecting'} />
      <MobileShellLayout
        blankChat={showHero}
        headerSlot={showHero
          ? (
            <header className={css.shellHeaderMinimal}>
              <MobileBackButton onClick={onBack} />
              <MobileWorkspaceSelect
                sessionId={sessionId}
                switchable={switchableWorkspace}
                locked={agentWorking || sending}
                draft={draft}
                variant="header"
                onSessionChange={onSessionChange}
                onError={setError}
              />
            </header>
          )
          : <MobileChatHeader title={title} meta={headerMeta} onBack={onBack} />}
      >
        <div className={showHero ? css.chatPageBlank : css.chatPage}>
          <div
            ref={messageListRef}
            className={css.messageList}
            onScroll={onMessageListScroll}
          >
            {loading && <div className={css.loadingState}>正在加载历史消息…</div>}
            {!loading && showHero && <MobileChatHero />}
            {!loading && !showHero && rows.map((row) => {
              if (row.role === 'status') {
                return <div key={row.id} className={css.statusRow}>{row.text}</div>
              }
              if (row.role === 'context') {
                return (
                  <div key={row.id} className={css.contextRow}>
                    <MobileContextRow
                      content={row.content}
                      provenance={row.provenance}
                      form={row.form}
                    />
                  </div>
                )
              }
              if (row.role === 'tool') {
                return (
                  <div key={row.id} className={css.toolRowWrap}>
                    <MobileToolRow toolName={row.name} block={row.block} />
                  </div>
                )
              }
              if (row.role === 'command') {
                return (
                  <div key={row.id} className={css.toolRowWrap}>
                    <MobileCommandRow row={row} />
                  </div>
                )
              }
              if (row.role === 'user') {
                return (
                  <div key={row.id} className={css.userRow}>
                    <div className={css.userBubble}>
                      <MessageText text={row.text} />
                    </div>
                  </div>
                )
              }
              return (
                <div key={row.id} className={css.assistantRow}>
                  <MobileAssistantBody blocks={row.blocks} streaming={row.streaming === true} />
                </div>
              )
            })}
          </div>
          <div className={showHero ? css.composerDockBlank : css.composerDock}>
            <StatusPanel error={error} />
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
            />
            <MobileStatsLine tokenUsage={tokenUsage} />
          </div>
        </div>
      </MobileShellLayout>
    </div>
  )
}
