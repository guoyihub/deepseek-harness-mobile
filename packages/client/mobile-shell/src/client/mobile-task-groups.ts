import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary as WireSessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type {
  SessionListState,
  SessionSummary as RuntimeSessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionPendingInteractionBase } from '@deepseek-ai/dsh-client-ui-session/client'
import {
  deriveGroups,
  UNGROUPED_KEY,
  type GroupNode,
} from '@deepseek-ai/dsh-client-ui-workspace/src/client/tree.ts'
import { sessionDisplayTitle } from './session-label.ts'
import { mobileConversationT } from './mobile-locale.ts'
import type { PendingInteractionStatus } from './mobile-session-pending-tracker.ts'

/** Default visible session rows per expanded workspace group on mobile task home. */
export const MOBILE_COLLAPSED_SESSION_LIMIT = 8

/** Mobile label for sessions outside every workspace (desktop `group.ungrouped`). */
export function mobileUngroupedLabel(): string {
  return mobileConversationT('workspace.ungrouped')
}

/**
 * Convert pending-status bits into the Workspace-tree interaction map.
 * @param pendingBySession - live pending-interaction status by session id.
 */
export function pendingToInteractions(
  pendingBySession?: ReadonlyMap<SessionId, PendingInteractionStatus>,
): Map<SessionId, SessionPendingInteractionBase> {
  const map = new Map<SessionId, SessionPendingInteractionBase>()
  if (pendingBySession === undefined) return map
  for (const [sessionId, kind] of pendingBySession) {
    map.set(sessionId, { key: kind, kind, sessionId })
  }
  return map
}

/** Map one wire session.list row into the runtime list shape used by {@link deriveGroups}. */
export function wireToRuntimeSummary(
  item: WireSessionSummary,
  completed?: boolean,
): RuntimeSessionSummary {
  return {
    id: item.sessionId,
    displayTitle: sessionDisplayTitle(item),
    blank: item.blank,
    running: item.running,
    updatedAt: item.updatedAt,
    ...(completed === true ? { completed: true } : {}),
    ...(item.cwd !== undefined ? { cwd: item.cwd } : {}),
    ...(item.origin !== undefined ? { origin: item.origin } : {}),
    ...(item.parentSessionId !== undefined ? { parentId: item.parentSessionId } : {}),
    ...(item.projections?.values !== undefined
      ? { projectionValues: item.projections.values }
      : {}),
  }
}

/**
 * Build a runtime session list snapshot from mobile wire rows.
 * @param items - raw `session.list` rows.
 * @param completedBySession - local completion reminders by session id.
 */
export function toSessionListState(
  items: readonly WireSessionSummary[],
  completedBySession?: ReadonlyMap<SessionId, boolean>,
): SessionListState {
  const runtimeItems = items.map(item => wireToRuntimeSummary(
    item,
    completedBySession?.get(item.sessionId),
  ))
  return {
    ids: runtimeItems.map(item => item.id),
    byId: Object.fromEntries(runtimeItems.map(item => [item.id, item])),
    current: undefined,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

/**
 * Derive workspace-grouped task rows using the desktop sidebar tree rules.
 * @param sessions - raw `session.list` rows.
 * @param workspaces - durable workspace registry order.
 * @param archivedSessionIds - registry-global archive set from workspace follow.
 * @param pendingBySession - live pending-interaction status by session id.
 * @param expandedGroups - group keys that should render open; omit to expand every group.
 * @param completedBySession - local completion reminders by session id.
 */
export function deriveMobileTaskGroups(
  sessions: readonly WireSessionSummary[],
  workspaces: readonly WorkspaceView[],
  archivedSessionIds: readonly SessionId[],
  pendingBySession?: ReadonlyMap<SessionId, PendingInteractionStatus>,
  expandedGroups?: readonly string[],
  completedBySession?: ReadonlyMap<SessionId, boolean>,
): GroupNode[] {
  const list = toSessionListState(sessions, completedBySession)
  const expanded = expandedGroups ?? [
    ...workspaces.map(workspace => workspace.workspaceId as string),
    UNGROUPED_KEY,
  ]
  return deriveGroups(
    list,
    workspaces,
    archivedSessionIds,
    pendingToInteractions(pendingBySession),
    { expandedGroups: expanded },
  )
}

/**
 * Resolve the section title for one grouped bucket.
 * @param group - one derived workspace section.
 */
export function groupDisplayLabel(group: GroupNode): string {
  if (group.workspaceId === undefined) return mobileUngroupedLabel()
  return group.label
}

/**
 * List wire sessions visible in the mobile task home (archived and subagent rows excluded).
 * @param sessions - raw `session.list` rows.
 * @param workspaces - durable workspace registry order.
 * @param archivedSessionIds - registry-global archive set from workspace follow.
 * @param pendingBySession - live pending-interaction status by session id.
 * @param completedBySession - local completion reminders by session id.
 */
export function visibleWireSessions(
  sessions: readonly WireSessionSummary[],
  workspaces: readonly WorkspaceView[],
  archivedSessionIds: readonly SessionId[],
  pendingBySession?: ReadonlyMap<SessionId, PendingInteractionStatus>,
  completedBySession?: ReadonlyMap<SessionId, boolean>,
): WireSessionSummary[] {
  const byId = new Map(sessions.map(item => [item.sessionId, item]))
  const groups = deriveMobileTaskGroups(
    sessions,
    workspaces,
    archivedSessionIds,
    pendingBySession,
    undefined,
    completedBySession,
  )
  const ids = groups.flatMap(group => group.sessions.map(session => session.id))
  return ids
    .map(id => byId.get(id))
    .filter((item): item is WireSessionSummary => item !== undefined)
}
