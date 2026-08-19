import { useMemo, useState } from 'react'

import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { useMobileConnection } from './MobileConnectionContext.tsx'

import { MobileFab } from './MobileFab.tsx'

import { MobileShellLayout } from './MobileShellLayout.tsx'

import { StatusPanel } from './StatusPanel.tsx'

import { TaskHomeHeader, type TaskHomeFilter } from './TaskHomeHeader.tsx'

import { TaskHomeRow } from './TaskHomeRow.tsx'

import { TaskHomeSearchOverlay } from './TaskHomeSearchOverlay.tsx'

import css from './mobile-shell.module.css'

/** Props for {@link HomePage}. */
export interface HomePageProps {
  /** Navigate to the pairing flow. */
  onPair: () => void
  /** Open one chat session. */
  onOpenChat: (sessionId: SessionId) => void
  /** Open connection management. */
  onOpenConnection: () => void
}

/**
 * Mobile task home: iOS-style all-tasks list with filter, search, and FAB.
 * @param props - navigation callbacks.
 */
export function HomePage({
  onPair,
  onOpenChat,
  onOpenConnection,
}: HomePageProps): JSX.Element {
  const {
    paired,
    hostDescription,
    connectionState,
    sessions,
    sessionsLoading,
    error,
    revoked,
    createSession,
  } = useMobileConnection()

  const [filter, setFilter] = useState<TaskHomeFilter>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const hostLabel = useMemo(() => {
    if (hostDescription?.model !== undefined) return hostDescription.model
    if (hostDescription?.provider !== undefined) return hostDescription.provider
    return undefined
  }, [hostDescription])

  const visibleSessions = useMemo(
    () => sessions.filter(item => filter !== 'running' || item.running),
    [filter, sessions],
  )

  const onFabClick = (): void => {
    if (!paired) {
      onPair()
      return
    }
    void (async () => {
      const sessionId = await createSession()
      if (sessionId !== undefined) onOpenChat(sessionId)
    })()
  }

  const closeSearch = (): void => {
    setSearchOpen(false)
    setSearchQuery('')
  }

  const reconnecting = connectionState === 'reconnecting'
  const reconnectFailed = !paired && !revoked && error !== undefined
  const unpairedCopy = revoked
    ? '设备已被桌面吊销，请重新扫码连接'
    : reconnectFailed
      ? '多次重连失败，请扫描电脑上的二维码重新连接'
      : '扫码连接同一局域网内的 DeepSeek Harness 电脑，即可查看并继续 Agent 任务。'

  if (searchOpen && paired) {
    return (
      <TaskHomeSearchOverlay
        query={searchQuery}
        sessions={sessions}
        onQueryChange={setSearchQuery}
        onClose={closeSearch}
        onOpenChat={onOpenChat}
      />
    )
  }

  return (
    <MobileShellLayout
      taskHomeContent
      headerSlot={(
        <TaskHomeHeader
          paired={paired}
          connected={connectionState === 'connected'}
          filter={filter}
          searchOpen={searchOpen}
          onFilterChange={setFilter}
          onSearchOpen={() => { setSearchOpen(true) }}
          onOpenConnection={onOpenConnection}
        />
      )}
      fab={(
        <MobileFab
          label={paired ? '新建任务' : '扫码连接电脑'}
          onClick={onFabClick}
        />
      )}
    >
      <StatusPanel error={paired && !reconnecting ? error : undefined} />

      {!paired && (
        <div className={css.taskHomeEmpty}>
          <p className={css.taskHomeEmptyCopy}>{unpairedCopy}</p>
          <Button variant="primary" onClick={onPair}>扫码连接电脑</Button>
        </div>
      )}

      {paired && reconnecting && visibleSessions.length === 0 && (
        <div className={css.taskHomeEmpty} role="status">正在重连…</div>
      )}

      {paired && !reconnecting && sessionsLoading && visibleSessions.length === 0 && (
        <div className={css.taskHomeEmpty}>正在加载任务…</div>
      )}

      {paired && !reconnecting && !sessionsLoading && visibleSessions.length === 0 && (
        <div className={css.taskHomeEmpty}>
          {filter === 'running'
            ? '没有匹配的任务'
            : '暂无任务，点击右下角按钮新建一个'}
        </div>
      )}

      {paired && visibleSessions.length > 0 && (
        <ul className={css.taskHomeList}>
          {visibleSessions.map(item => (
            <TaskHomeRow
              key={item.sessionId}
              item={item}
              hostLabel={hostLabel}
              onOpen={() => { onOpenChat(item.sessionId) }}
            />
          ))}
        </ul>
      )}
    </MobileShellLayout>
  )
}
