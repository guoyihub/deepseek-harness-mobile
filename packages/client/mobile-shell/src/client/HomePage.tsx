import { useCallback, useEffect, useMemo, useState } from 'react'

import type { SessionId, SessionSearchItem } from '@deepseek-ai/dsh-client-connection/client'
import type { PendingInteractionStatus } from '@deepseek-ai/dsh-client-runtime/client'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { useMobileConnection } from './MobileConnectionContext.tsx'
import { mobileApi } from './mobile-api-client.ts'
import { MobileFab } from './MobileFab.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import {
  archiveMobileSession,
  archiveMobileSessions,
  forkMobileSession,
  pinMobileSessions,
  renameMobileSession,
} from './mobile-session-actions.ts'
import {
  deriveMobileSearchResults,
  MOBILE_SEARCH_DEBOUNCE_MS,
  MOBILE_SEARCH_RESULT_LIMIT,
  type MobileRemoteSearchState,
} from './mobile-session-search.ts'
import {
  deriveMobileTaskGroups,
  groupDisplayLabel,
} from './mobile-task-groups.ts'
import { mobileSessionIsActive } from './mobile-session-status.ts'
import { sessionDisplayTitle } from './session-label.ts'
import { StatusPanel } from './StatusPanel.tsx'
import { TaskHomeHeader, type TaskHomeFilter } from './TaskHomeHeader.tsx'
import { TaskHomeRenameModal } from './TaskHomeRenameModal.tsx'
import { TaskHomeRow } from './TaskHomeRow.tsx'
import { TaskHomeSelectDock } from './TaskHomeSelectDock.tsx'
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
    refreshSessions,
    pendingRevision,
    getPendingInteraction,
  } = useMobileConnection()

  const [filter, setFilter] = useState<TaskHomeFilter>('all')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [remoteSearch, setRemoteSearch] = useState<MobileRemoteSearchState>({
    query: '',
    status: 'idle',
    items: [],
    hasMore: false,
  })
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<SessionId>>(() => new Set())
  const [actionError, setActionError] = useState<string | undefined>(undefined)
  const [actionBusy, setActionBusy] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{
    sessionId: SessionId
    title: string
  } | null>(null)

  const normalizedQuery = searchQuery.trim()

  const hostLabel = useMemo(() => {
    if (hostDescription?.model !== undefined) return hostDescription.model
    if (hostDescription?.provider !== undefined) return hostDescription.provider
    return undefined
  }, [hostDescription])

  const sessionById = useMemo(
    () => new Map(sessions.map(item => [item.sessionId, item])),
    [sessions],
  )

  const pendingBySession = useMemo(() => {
    void pendingRevision
    const map = new Map<SessionId, PendingInteractionStatus>()
    for (const item of sessions) {
      const pending = getPendingInteraction(item.sessionId)
      if (pending !== undefined) map.set(item.sessionId, pending)
    }
    return map
  }, [getPendingInteraction, pendingRevision, sessions])

  useEffect(() => {
    if (normalizedQuery === '') {
      setRemoteSearch({ query: '', status: 'idle', items: [], hasMore: false })
      return
    }
    const controller = new AbortController()
    setRemoteSearch({
      query: normalizedQuery,
      status: 'loading',
      items: [],
      hasMore: false,
    })
    const timer = window.setTimeout(() => {
      void mobileApi.sessions.search({ query: normalizedQuery }, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) return
          if (!response.result.ok) {
            setRemoteSearch({
              query: normalizedQuery,
              status: 'error',
              items: [],
              hasMore: false,
            })
            return
          }
          const items: readonly SessionSearchItem[] = response.result.value.items
          setRemoteSearch({
            query: normalizedQuery,
            status: 'ready',
            items,
            hasMore: response.result.value.hasMore,
          })
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setRemoteSearch({
            query: normalizedQuery,
            status: 'error',
            items: [],
            hasMore: false,
          })
        })
    }, MOBILE_SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [normalizedQuery])

  const searchResults = useMemo(
    () => deriveMobileSearchResults(
      sessions,
      workspaces,
      archivedSessionIds,
      normalizedQuery,
      remoteSearch,
      pendingBySession,
    ),
    [archivedSessionIds, normalizedQuery, pendingBySession, remoteSearch, sessions, workspaces],
  )

  const searching = normalizedQuery !== ''
  const searchPending = searching && (
    remoteSearch.query !== normalizedQuery || remoteSearch.status === 'loading'
  )
  const searchFailed = searching
    && remoteSearch.query === normalizedQuery
    && remoteSearch.status === 'error'

  const visibleGroups = useMemo(() => {
    const groups = deriveMobileTaskGroups(sessions, workspaces, archivedSessionIds, pendingBySession)
    return groups
      .map(group => ({
        ...group,
        sessions: group.sessions.filter(session => filter !== 'running'
          || mobileSessionIsActive({
            running: session.running,
            ...(session.pendingInteraction !== undefined
              ? { pendingInteraction: session.pendingInteraction }
              : {}),
          })),
      }))
      .filter(group => group.sessions.length > 0)
  }, [archivedSessionIds, filter, pendingBySession, sessions, workspaces])

  const visibleSessionCount = useMemo(
    () => visibleGroups.reduce((count, group) => count + group.sessions.length, 0),
    [visibleGroups],
  )

  const exitSelect = useCallback((): void => {
    setSelecting(false)
    setSelectedIds(new Set())
  }, [])

  const enterSelect = useCallback((sessionId: SessionId): void => {
    setSelecting(true)
    setSelectedIds(new Set([sessionId]))
    setActionError(undefined)
  }, [])

  const toggleSelect = useCallback((sessionId: SessionId): void => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }, [])

  const onArchiveOne = useCallback(async (sessionId: SessionId): Promise<void> => {
    setActionBusy(true)
    setActionError(undefined)
    try {
      await archiveMobileSession(sessionId)
      await refreshSessions()
      setSelectedIds((current) => {
        if (!current.has(sessionId)) return current
        const next = new Set(current)
        next.delete(sessionId)
        return next
      })
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setActionBusy(false)
    }
  }, [refreshSessions])

  const onPinSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0 || actionBusy) return
    setActionBusy(true)
    setActionError(undefined)
    try {
      await pinMobileSessions([...selectedIds], workspaces)
      await refreshSessions()
      exitSelect()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setActionBusy(false)
    }
  }, [actionBusy, exitSelect, refreshSessions, selectedIds, workspaces])

  const onPinOne = useCallback(async (sessionId: SessionId): Promise<void> => {
    setActionBusy(true)
    setActionError(undefined)
    try {
      await pinMobileSessions([sessionId], workspaces)
      await refreshSessions()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setActionBusy(false)
    }
  }, [refreshSessions, workspaces])

  const onArchiveSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0 || actionBusy) return
    setActionBusy(true)
    setActionError(undefined)
    try {
      await archiveMobileSessions([...selectedIds])
      await refreshSessions()
      exitSelect()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setActionBusy(false)
    }
  }, [actionBusy, exitSelect, refreshSessions, selectedIds])

  const onForkOne = useCallback(async (sessionId: SessionId): Promise<void> => {
    setActionBusy(true)
    setActionError(undefined)
    try {
      const childId = await forkMobileSession(sessionId)
      await refreshSessions()
      onOpenChat(childId)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setActionBusy(false)
    }
  }, [onOpenChat, refreshSessions])

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

  const collapseSearch = useCallback((): void => {
    setSearchExpanded(false)
    setSearchQuery('')
  }, [])

  const reconnecting = connectionState === 'reconnecting'
  const reconnectFailed = !paired && !revoked && error !== undefined
  const unpairedCopy = revoked
    ? '设备已被桌面吊销，请重新扫码连接'
    : reconnectFailed
      ? '多次重连失败，请扫描电脑上的二维码重新连接'
      : '扫码连接同一局域网内的 DeepSeek Harness 电脑，即可查看并继续 Agent 任务。'

  return (
    <MobileShellLayout
      taskHomeContent
      headerSlot={(
        <TaskHomeHeader
          paired={paired}
          connected={connectionState === 'connected'}
          filter={filter}
          searchExpanded={searchExpanded}
          searchQuery={searchQuery}
          selecting={selecting}
          selectedCount={selectedIds.size}
          onExitSelect={exitSelect}
          onFilterChange={setFilter}
          onSearchExpand={() => { setSearchExpanded(true) }}
          onSearchQueryChange={setSearchQuery}
          onSearchCollapse={collapseSearch}
          onOpenConnection={onOpenConnection}
        />
      )}
      fab={selecting || searching ? undefined : (
        <MobileFab
          label={paired ? '新建任务' : '扫码连接电脑'}
          onClick={onFabClick}
        />
      )}
      dock={selecting ? (
        <TaskHomeSelectDock
          disabled={selectedIds.size === 0 || actionBusy}
          onPin={() => { void onPinSelected() }}
          onArchive={() => { void onArchiveSelected() }}
        />
      ) : undefined}
    >
      <StatusPanel error={paired && !reconnecting ? (actionError ?? error) : undefined} />

      {!paired && (
        <div className={css.taskHomeEmpty}>
          <p className={css.taskHomeEmptyCopy}>{unpairedCopy}</p>
          <Button variant="primary" onClick={onPair}>扫码连接电脑</Button>
        </div>
      )}

      {paired && searching && (
        <div className={css.taskHomeSearchBody} role="list" aria-label="搜索结果">
          <ul className={css.taskHomeSearchList}>
            {searchResults.items.map((result) => {
              const item = sessionById.get(result.id)
              if (item === undefined) return null
              return (
                <TaskHomeRow
                  key={result.id}
                  item={item}
                  {...(result.pendingInteraction !== undefined
                    ? { pendingInteraction: result.pendingInteraction }
                    : {})}
                  variant="search"
                  workspaceLabel={result.workspace}
                  {...(result.snippet !== undefined ? { snippet: result.snippet } : {})}
                  onOpen={() => { onOpenChat(result.id) }}
                />
              )
            })}
          </ul>
          {searchPending && (
            <div className={css.taskHomeSearchStatus} role="status">正在搜索会话历史…</div>
          )}
          {searchFailed && (
            <div className={css.taskHomeSearchWarning} role="status">
              内容搜索暂不可用，仅显示名称匹配。
            </div>
          )}
          {!searchPending && searchResults.items.length === 0 && (
            <div className={css.taskHomeEmpty}>无匹配会话</div>
          )}
          {searchResults.hasMore && (
            <div className={css.taskHomeSearchStatus}>
              {`仅显示前 ${MOBILE_SEARCH_RESULT_LIMIT} 条结果，请缩小搜索范围。`}
            </div>
          )}
        </div>
      )}

      {paired && !searching && reconnecting && visibleSessionCount === 0 && (
        <div className={css.taskHomeEmpty} role="status">正在重连…</div>
      )}

      {paired && !searching && !reconnecting && sessionsLoading && visibleSessionCount === 0 && (
        <div className={css.taskHomeEmpty}>正在加载任务…</div>
      )}

      {paired && !searching && !reconnecting && !sessionsLoading && visibleSessionCount === 0 && (
        <div className={css.taskHomeEmpty}>
          {filter === 'running'
            ? '没有匹配的任务'
            : '暂无任务，点击右下角按钮新建一个'}
        </div>
      )}

      {paired && !searching && visibleSessionCount > 0 && (
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
                      {...(session.pendingInteraction !== undefined
                        ? { pendingInteraction: session.pendingInteraction }
                        : {})}
                      hostLabel={hostLabel}
                      selecting={selecting}
                      selected={selectedIds.has(session.id)}
                      onOpen={() => { onOpenChat(session.id) }}
                      onToggleSelect={() => { toggleSelect(session.id) }}
                      onEnterSelect={() => { enterSelect(session.id) }}
                      onRename={() => {
                        setRenameTarget({
                          sessionId: session.id,
                          title: sessionDisplayTitle(item),
                        })
                      }}
                      onFork={() => { void onForkOne(session.id) }}
                      onPin={() => { void onPinOne(session.id) }}
                      onArchive={() => { void onArchiveOne(session.id) }}
                    />
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {renameTarget !== null && (
        <TaskHomeRenameModal
          open
          initialTitle={renameTarget.title}
          onClose={() => { setRenameTarget(null) }}
          onConfirm={async (title) => {
            await renameMobileSession(renameTarget.sessionId, title)
            await refreshSessions()
          }}
        />
      )}
    </MobileShellLayout>
  )
}
