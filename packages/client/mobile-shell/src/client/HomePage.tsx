import { useMemo, useState } from 'react'

import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { useMobileConnection } from './MobileConnectionContext.tsx'

import { MobileFab } from './MobileFab.tsx'

import { MobileShellLayout } from './MobileShellLayout.tsx'

import {
  deriveMobileTaskGroups,
  groupDisplayLabel,
  visibleWireSessions,
} from './mobile-task-groups.ts'

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
    workspaces,
    archivedSessionIds,
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

  const sessionById = useMemo(
    () => new Map(sessions.map(item => [item.sessionId, item])),
    [sessions],
  )

  const searchableSessions = useMemo(
    () => visibleWireSessions(sessions, workspaces, archivedSessionIds),
    [archivedSessionIds, sessions, workspaces],
  )

  const visibleGroups = useMemo(() => {
    const groups = deriveMobileTaskGroups(sessions, workspaces, archivedSessionIds)
    return groups
      .map(group => ({
        ...group,
        sessions: group.sessions.filter(session => filter !== 'running' || session.running),
      }))
      .filter(group => group.sessions.length > 0)
  }, [archivedSessionIds, filter, sessions, workspaces])

  const visibleSessionCount = useMemo(
    () => visibleGroups.reduce((count, group) => count + group.sessions.length, 0),
    [visibleGroups],
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
        sessions={searchableSessions}
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

      {paired && reconnecting && visibleSessionCount === 0 && (
        <div className={css.taskHomeEmpty} role="status">正在重连…</div>
      )}

      {paired && !reconnecting && sessionsLoading && visibleSessionCount === 0 && (
        <div className={css.taskHomeEmpty}>正在加载任务…</div>
      )}

      {paired && !reconnecting && !sessionsLoading && visibleSessionCount === 0 && (
        <div className={css.taskHomeEmpty}>
          {filter === 'running'
            ? '没有匹配的任务'
            : '暂无任务，点击右下角按钮新建一个'}
        </div>
      )}

      {paired && visibleSessionCount > 0 && (
        <div className={css.taskHomeGroups}>
          {visibleGroups.map(group => (
            <section key={group.key} className={css.taskHomeGroup} aria-label={groupDisplayLabel(group)}>
              <h2 className={css.taskHomeGroupLabel}>{groupDisplayLabel(group)}</h2>
              <ul className={css.taskHomeList}>
                {group.sessions.map((session) => {
                  const item = sessionById.get(session.id)
                  if (item === undefined) return null
                  return (
                    <TaskHomeRow
                      key={session.id}
                      item={item}
                      hostLabel={hostLabel}
                      onOpen={() => { onOpenChat(session.id) }}
                    />
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </MobileShellLayout>
  )
}
