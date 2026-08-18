import { useEffect, useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { Button, ConnectionBanner, Input, MarkdownText, MessageText } from '@deepseek-ai/dsh-client-ui-primitives'
import { applyMuxEvent, rowsFromHistory, type ChatRow } from './chat-projection.ts'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import { mobileApi } from './mobile-api-client.ts'
import { sessionDisplayTitle } from './session-label.ts'
import { StatusPanel } from './StatusPanel.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link ChatPage}. */
export interface ChatPageProps {
  /** Active session id. */
  sessionId: SessionId
  /** Navigate back to the task list. */
  onBack: () => void
}

/**
 * Minimal mobile chat surface with history load, streaming updates, and prompt send.
 * @param props - session id and navigation.
 */
export function ChatPage({ sessionId, onBack }: ChatPageProps): JSX.Element {
  const { subscribeMux, connectionState, sessions } = useMobileConnection()
  const [rows, setRows] = useState<ChatRow[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const title = useMemo(() => {
    const summary = sessions.find(item => item.sessionId === sessionId)
    return summary === undefined ? sessionId.slice(0, 8) : sessionDisplayTitle(summary)
  }, [sessionId, sessions])

  const agentWorking = useMemo(
    () => rows.some(row => row.role === 'status' && row.text.includes('正在')),
    [rows],
  )

  useEffect(() => {
    let cancelled = false
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
        setRows(rowsFromHistory(response.result.value.events))
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
  }, [sessionId])

  useEffect(() => {
    return subscribeMux((frame) => {
      setRows(current => applyMuxEvent(current, sessionId, frame))
    })
  }, [sessionId, subscribeMux])

  const onSend = async (): Promise<void> => {
    const text = draft.trim()
    if (text === '' || sending) return
    setSending(true)
    setError(undefined)
    setDraft('')
    setRows(current => [...current, { id: `optimistic:${String(Date.now())}`, role: 'user', text }])
    try {
      const response = await mobileApi.sessions.prompt({
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      })
      if (!response.result.ok) {
        setError(response.result.error.message)
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError))
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
    <>
      <ConnectionBanner reconnecting={connectionState === 'reconnecting'} />
      <MobileShellLayout
        title={title}
        subtitle="Agent 会话"
        onBack={onBack}
        fab={(agentWorking || sending) && (
          <Button variant="outline" disabled={cancelling} onClick={() => { void onCancel() }}>
            停止
          </Button>
        )}
      >
        <div className={css.chatPage}>
          <div className={css.messageList}>
            {loading && <div className={css.emptyState}>正在加载历史消息…</div>}
            {!loading && rows.length === 0 && (
              <div className={css.emptyState}>还没有消息，发送第一条 prompt 吧</div>
            )}
            {rows.map((row) => {
              if (row.role === 'status') {
                return <div key={row.id} className={css.statusRow}>{row.text}</div>
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
                  <div className={css.assistantBody}>
                    <MarkdownText text={row.text} streaming={row.streaming === true} />
                  </div>
                </div>
              )
            })}
          </div>
          <StatusPanel error={error} />
          <div className={css.composer}>
            <div className={css.composerInput}>
              <Input
                value={draft}
                placeholder="输入消息…"
                disabled={sending}
                onChange={(event) => { setDraft(event.target.value) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void onSend()
                  }
                }}
              />
            </div>
            <Button variant="primary" disabled={sending || draft.trim() === ''} onClick={() => { void onSend() }}>
              发送
            </Button>
          </div>
        </div>
      </MobileShellLayout>
    </>
  )
}
