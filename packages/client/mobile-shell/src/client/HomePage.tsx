import { useCallback, useEffect, useMemo, useState } from 'react'

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSearchItem } from '@deepseek-ai/dsh-api-session-controller/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { PendingInteractionStatus } from './mobile-session-pending-tracker.ts'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { useMobileConnection } from './MobileConnectionContext.tsx'
import { prefetchMobileConversationRuntime } from './mobile-conversation-runtime.ts'
import { mobileApi } from './mobile-api-client.ts'
import { MobileFab } from './MobileFab.tsx'
import { MobilePullToRefresh } from './MobilePullToRefresh.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import {
  archiveMobileSession,
  archiveMobileSessions,
  forkMobileSession,
  pinMobileSessions,
  renameMobileSession,
} from './mobile-session-actions.ts'
import {
  deleteMobileWorkspace,
  renameMobileWorkspace,
} from './mobile-workspace-actions.ts'
import {
  deriveMobileSearchResults,
  MOBILE_SEARCH_DEBOUNCE_MS,
  MOBILE_SEARCH_RESULT_LIMIT,
  type MobileRemoteSearchState,
} from './mobile-session-search.ts'
import {
  loadMobileGroupExpansion,
  mobileExpandedGroupKeys,
  pruneMobileGroupExpansion,
  saveMobileGroupExpansion,
} from './mobile-task-group-expansion.ts'
import {
  deriveMobileTaskGroups,
  groupDisplayLabel,
  MOBILE_COLLAPSED_SESSION_LIMIT,
} from './mobile-task-groups.ts'
import { mobileSessionIsActive } from './mobile-session-status.ts'
import { mobileConversationT, useMobileLanguage } from './mobile-locale.ts'
import { mobileWorkspaceT } from './mobile-workspace-t.ts'
import {
  SearchResultItem,
  SessionNodeItem,
} from '@deepseek-ai/dsh-client-ui-workspace/src/client/rows/Rows.tsx'
import { StatusPanel } from './StatusPanel.tsx'
import { MobileReconnectBanner } from './MobileReconnectBanner.tsx'
import { TaskHomeHeader, type TaskHomeFilter } from './TaskHomeHeader.tsx'
import { TaskHomeGroupHeader } from './TaskHomeGroupHeader.tsx'
import { TaskHomeRenameModal } from './TaskHomeRenameModal.tsx'
import { TaskHomeSelectDock } from './TaskHomeSelectDock.tsx'
import { TaskHomeWorkspaceDeleteModal } from './TaskHomeWorkspaceDeleteModal.tsx'
import { TASK_HOME_MOTION_MS } from './task-home-motion.ts'
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
  useMobileLanguage()
  const {
    paired,
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
    getSessionCompleted,
    markSessionViewed,
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
  const [workspaceRenameTarget, setWorkspaceRenameTarget] = useState<{
    workspaceId: WorkspaceId
    title: string
  } | null>(null)
  const [workspaceDeleteTarget, setWorkspaceDeleteTarget] = useState<{
    workspaceId: WorkspaceId
    title: string
  } | null>(null)
  const [groupExpansion, setGroupExpansion] = useState(loadMobileGroupExpansion)
  const [expandedSessionGroups, setExpandedSessionGroups] = useState<readonly string[]>([])

  const normalizedQuery = searchQuery.trim()
  const listNow = useMemo(() => Date.now(), [sessions, pendingRevision])

  const pendingBySession = useMemo(() => {
    void pendingRevision
    const map = new Map<SessionId, PendingInteractionStatus>()
    for (const item of sessions) {
      const pending = getPendingInteraction(item.sessionId)
      if (pending !== undefined) map.set(item.sessionId, pending)
    }
    return map
  }, [getPendingInteraction, pendingRevision, sessions])

  const completedBySession = useMemo(() => {
    void pendingRevision
    const map = new Map<SessionId, boolean>()
    for (const item of sessions) {
      if (getSessionCompleted(item.sessionId)) map.set(item.sessionId, true)
    }
    return map
  }, [getSessionCompleted, pendingRevision, sessions])

  const openChat = useCallback((sessionId: SessionId): void => {
    markSessionViewed(sessionId)
    onOpenChat(sessionId)
  }, [markSessionViewed, onOpenChat])

  useEffect(() => {
    if (paired && connectionState === 'connected') {
      prefetchMobileConversationRuntime()
    }
  }, [connectionState, paired])

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
          const items = response.result.value.items as readonly SessionSearchItem[]
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
      completedBySession,
    ),
    [archivedSessionIds, completedBySession, normalizedQuery, pendingBySession, remoteSearch, sessions, workspaces],
  )

  const searching = normalizedQuery !== ''
  const searchPending = searching && (
    remoteSearch.query !== normalizedQuery || remoteSearch.status === 'loading'
  )
  const searchFailed = searching
    && remoteSearch.query === normalizedQuery
    && remoteSearch.status === 'error'

  const expandedAllGroups = useMemo(
    () => deriveMobileTaskGroups(
      sessions,
      workspaces,
      archivedSessionIds,
      pendingBySession,
      undefined,
      completedBySession,
    ),
    [archivedSessionIds, completedBySession, pendingBySession, sessions, workspaces],
  )

  const groupKeys = useMemo(
    () => expandedAllGroups.map(group => group.key),
    [expandedAllGroups],
  )

  const allGroups = useMemo(
    () => deriveMobileTaskGroups(
      sessions,
      workspaces,
      archivedSessionIds,
      pendingBySession,
      mobileExpandedGroupKeys(groupKeys, groupExpansion),
      completedBySession,
    ),
    [archivedSessionIds, completedBySession, groupExpansion, groupKeys, pendingBySession, sessions, workspaces],
  )

  const visibleGroups = useMemo(() => {
    const allowed = new Set(
      expandedAllGroups
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
        .map(group => group.key),
    )
    return allGroups.filter(group => allowed.has(group.key))
  }, [allGroups, expandedAllGroups, filter])

  useEffect(() => {
    setGroupExpansion(current => pruneMobileGroupExpansion(current, groupKeys))
  }, [groupKeys])

  const toggleGroup = useCallback((key: string): void => {
    setGroupExpansion((current) => {
      const expanded = mobileExpandedGroupKeys(groupKeys, current).includes(key)
      if (expanded) {
        setExpandedSessionGroups(currentKeys => currentKeys.filter(groupKey => groupKey !== key))
      }
      return saveMobileGroupExpansion(current, key, !expanded)
    })
  }, [groupKeys])

  const toggleSessionGroup = useCallback((key: string): void => {
    setExpandedSessionGroups((current) => {
      if (current.includes(key)) return current.filter(groupKey => groupKey !== key)
      return [...current, key]
    })
  }, [])

  const visibleSessionCount = useMemo(
    () => expandedAllGroups
      .flatMap(group => group.sessions)
      .filter(session => filter !== 'running'
        || mobileSessionIsActive({
          running: session.running,
          ...(session.pendingInteraction !== undefined
            ? { pendingInteraction: session.pendingInteraction }
            : {}),
        }))
      .length,
    [expandedAllGroups, filter],
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
      openChat(childId)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setActionBusy(false)
    }
  }, [openChat, refreshSessions])

  const onFabClick = (): void => {
    if (!paired) {
      onPair()
      return
    }
    prefetchMobileConversationRuntime()
    void (async () => {
      const sessionId = await createSession()
      if (sessionId !== undefined) onOpenChat(sessionId)
    })()
  }

  const collapseSearch = useCallback((): void => {
    setSearchExpanded(false)
    window.setTimeout(() => {
      setSearchQuery('')
    }, TASK_HOME_MOTION_MS)
  }, [])

  const onPullRefresh = useCallback(async (): Promise<void> => {
    setActionError(undefined)
    await refreshSessions()
  }, [refreshSessions])

  const reconnecting = connectionState === 'connecting'
  const reconnectFailed = !paired && !revoked && error !== undefined
  const unpairedCopy = revoked
    ? mobileConversationT('connection.revokedMessage')
    : reconnectFailed
      ? mobileConversationT('connection.reconnectFailed')
      : mobileConversationT('connection.unpairedHint')

  return (
    <MobileShellLayout
      taskHomeNestedScroll
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
          label={paired ? mobileConversationT('taskHome.newTask') : mobileConversationT('connection.scan')}
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
      <MobilePullToRefresh
        onRefresh={onPullRefresh}
        disabled={!paired || searching || selecting}
        dock={selecting}
        scrollClassName={css.taskHomePullScroll}
        ariaLabel={mobileConversationT('taskHome.list')}
      >
        <MobileReconnectBanner />
        <StatusPanel error={paired && !reconnecting ? (actionError ?? error) : undefined} />

        {!paired && (
          <div className={css.taskHomeEmpty}>
            <p className={css.taskHomeEmptyCopy}>{unpairedCopy}</p>
            <Button variant="primary" onClick={onPair}>{mobileConversationT('connection.scan')}</Button>
          </div>
        )}

        {paired && searching && (
          <div className={css.taskHomeSearchBody} role="list" aria-label={mobileConversationT('taskHome.searchResults')}>
            <ul className={css.taskHomeSearchList}>
              {searchResults.items.map(result => (
                <li key={result.id}>
                  <SearchResultItem
                    result={result}
                    currentId={undefined}
                    surface="mobile"
                    onOpen={(id) => { openChat(id) }}
                    t={mobileWorkspaceT}
                  />
                </li>
              ))}
            </ul>
            {searchPending && (
              <div className={css.taskHomeSearchStatus} role="status">{mobileConversationT('taskHome.searching')}</div>
            )}
            {searchFailed && (
              <div className={css.taskHomeSearchWarning} role="status">
                {mobileConversationT('taskHome.searchFallback')}
              </div>
            )}
            {!searchPending && searchResults.items.length === 0 && (
              <div className={css.taskHomeEmpty}>{mobileConversationT('taskHome.noSearchResults')}</div>
            )}
            {searchResults.hasMore && (
              <div className={css.taskHomeSearchStatus}>
                {mobileConversationT('taskHome.searchLimit', { n: MOBILE_SEARCH_RESULT_LIMIT })}
              </div>
            )}
          </div>
        )}

        {paired && !searching && reconnecting && visibleSessionCount === 0 && (
          <div className={css.taskHomeEmpty} role="status">{mobileConversationT('taskHome.reconnecting')}</div>
        )}

        {paired && !searching && !reconnecting && sessionsLoading && visibleSessionCount === 0 && (
          <div className={css.taskHomeEmpty}>{mobileConversationT('taskHome.loading')}</div>
        )}

        {paired && !searching && !reconnecting && !sessionsLoading && visibleSessionCount === 0 && (
          <div className={css.taskHomeEmpty}>
            {filter === 'running'
              ? mobileConversationT('taskHome.noRunningTasks')
              : mobileConversationT('taskHome.empty')}
          </div>
        )}

        {paired && !searching && visibleSessionCount > 0 && (
          <div className={css.taskHomeGroups}>
            {visibleGroups.map(group => (
              <section key={group.key} className={css.taskHomeGroup} aria-label={groupDisplayLabel(group)}>
                <TaskHomeGroupHeader
                  group={group}
                  onToggle={() => { toggleGroup(group.key) }}
                  {...(group.workspaceId === undefined
                    ? {}
                    : {
                      onRename: (workspaceId, title) => {
                        setWorkspaceRenameTarget({ workspaceId, title })
                      },
                      onDelete: (workspaceId, title) => {
                        setWorkspaceDeleteTarget({ workspaceId, title })
                      },
                    })}
                />
                {group.expanded && (
                  <ul className={css.taskHomeList}>
                    {(expandedSessionGroups.includes(group.key)
                      ? group.sessions
                      : group.sessions.slice(0, MOBILE_COLLAPSED_SESSION_LIMIT)
                    ).map(session => (
                      <li key={session.id}>
                        <SessionNodeItem
                          node={session}
                          currentId={undefined}
                          now={listNow}
                          surface="mobile"
                          selecting={selecting}
                          selected={selectedIds.has(session.id)}
                          onToggleSelect={() => { toggleSelect(session.id) }}
                          onEnterSelect={() => { enterSelect(session.id) }}
                          onOpen={(id) => { openChat(id) }}
                          onRename={(id, title) => {
                            setRenameTarget({ sessionId: id, title })
                          }}
                          onFork={(id) => { void onForkOne(id) }}
                          onPin={(id) => { void onPinOne(id) }}
                          onArchive={(id) => { void onArchiveOne(id) }}
                          t={mobileWorkspaceT}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {group.expanded && group.sessions.length > MOBILE_COLLAPSED_SESSION_LIMIT && (
                  <button
                    type="button"
                    className={css.taskHomeSessionOverflow}
                    aria-expanded={expandedSessionGroups.includes(group.key)}
                    onClick={() => { toggleSessionGroup(group.key) }}
                  >
                    {expandedSessionGroups.includes(group.key)
                      ? mobileConversationT('taskHome.sessions.collapse')
                      : mobileConversationT('taskHome.sessions.expand', {
                        n: group.sessions.length - MOBILE_COLLAPSED_SESSION_LIMIT,
                      })}
                  </button>
                )}
              </section>
            ))}
          </div>
        )}
      </MobilePullToRefresh>

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

      {workspaceRenameTarget !== null && (
        <TaskHomeRenameModal
          open
          dialogTitle={mobileConversationT('workspace.renameGroup')}
          confirmLabel={mobileConversationT('common.save')}
          inputLabel={mobileConversationT('workspace.groupName')}
          initialTitle={workspaceRenameTarget.title}
          onClose={() => { setWorkspaceRenameTarget(null) }}
          onConfirm={async (title) => {
            await renameMobileWorkspace(workspaceRenameTarget.workspaceId, title)
            await refreshSessions()
          }}
        />
      )}

      {workspaceDeleteTarget !== null && (
        <TaskHomeWorkspaceDeleteModal
          open
          workspaceTitle={workspaceDeleteTarget.title}
          onClose={() => { setWorkspaceDeleteTarget(null) }}
          onConfirm={async () => {
            await deleteMobileWorkspace(workspaceDeleteTarget.workspaceId)
            await refreshSessions()
          }}
        />
      )}
    </MobileShellLayout>
  )
}
