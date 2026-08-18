import { Button, ConnectionBanner } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import { formatSessionUpdatedAt, sessionDisplayTitle } from './session-label.ts'
import css from './mobile-shell.module.css'

/** Props for {@link TaskListPage}. */
export interface TaskListPageProps {
  /** Navigate back to home. */
  onBack: () => void
  /** Open one chat session. */
  onOpenChat: (sessionId: SessionId) => void
}

/**
 * Full task list with FAB-style create action.
 * @param props - navigation callbacks.
 */
export function TaskListPage({ onBack, onOpenChat }: TaskListPageProps): JSX.Element {
  const {
    sessions,
    sessionsLoading,
    error,
    createSession,
    refreshSessions,
    connectionState,
  } = useMobileConnection()

  const onCreate = async (): Promise<void> => {
    const sessionId = await createSession()
    if (sessionId !== undefined) onOpenChat(sessionId)
  }

  return (
    <>
      <ConnectionBanner reconnecting={connectionState === 'reconnecting'} />
      <MobileShellLayout
        title="全部任务"
        onBack={onBack}
        fab={<Button variant="primary" onClick={() => { void onCreate() }}>新建</Button>}
      >
        {error !== undefined && <p className={`${css.statusText} ${css.statusTextError}`}>{error}</p>}
        {sessionsLoading && sessions.length === 0 && (
          <div className={css.emptyState}>正在加载任务…</div>
        )}
        {!sessionsLoading && sessions.length === 0 && (
          <div className={css.emptyState}>暂无任务，点击右下角「新建」开始</div>
        )}
        {sessions.length > 0 && (
          <ul className={css.taskList}>
            {sessions.map(item => (
              <li key={item.sessionId}>
                <button type="button" className={css.taskItem} onClick={() => { onOpenChat(item.sessionId) }}>
                  <span className={css.taskTitle}>{sessionDisplayTitle(item)}</span>
                  <span className={css.taskMeta}>
                    {formatSessionUpdatedAt(item.updatedAt)}
                    {item.running ? ' · 运行中' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={css.actionRow} style={{ marginTop: 16 }}>
          <Button variant="ghost" onClick={() => { void refreshSessions() }}>刷新列表</Button>
        </div>
      </MobileShellLayout>
    </>
  )
}
