import type {
  SessionId,
  SessionSummary as WireSessionSummary,
  WorkspaceView,
} from '@deepseek-ai/dsh-client-connection/client'
import type {
  PendingInteractionStatus,
  SessionListState,
  SessionSummary as RuntimeSessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  deriveGroups,
  UNGROUPED_KEY,
  type GroupNode,
} from '@deepseek-ai/dsh-client-ui-workspace/src/client/tree.ts'
import { sessionDisplayTitle } from './session-label.ts'

/** Default visible session rows per expanded workspace group (matches desktop sidebar). */
export const MOBILE_COLLAPSED_SESSION_LIMIT = 5

/** Mobile label for sessions outside every workspace (desktop `group.ungrouped`). */
export const MOBILE_UNGROUPED_LABEL = '未分组'

/** Map one wire session.list row into the runtime list shape used by {@link deriveGroups}. */
export function wireToRuntimeSummary(
  item: WireSessionSummary,
  pendingInteraction?: PendingInteractionStatus,
  completed?: boolean,
): RuntimeSessionSummary {
  return {
    id: item.sessionId,
    displayTitle: sessionDisplayTitle(item),
    blank: item.blank,
    running: item.running,
    updatedAt: item.updatedAt,
    ...(pendingInteraction !== undefined ? { pendingInteraction } : {}),
    ...(completed === true ? { completed: true } : {}),
    ...(item.cwd !== undefined ? { cwd: item.cwd } : {}),
    ...(item.agentPreset !== undefined ? { agentPreset: item.agentPreset } : {}),
    ...(item.origin !== undefined ? { origin: item.origin } : {}),
    ...(item.parentSessionId !== undefined ? { parentId: item.parentSessionId } : {}),
  }
}

/**
 * Build a runtime session list snapshot from mobile wire rows.
 * @param items - raw `session.list` rows.
 * @param pendingBySession - live pending-interaction status by session id.
 * @param completedBySession - local completion reminders by session id.
 */
export function toSessionListState(
  items: readonly WireSessionSummary[],
  pendingBySession?: ReadonlyMap<SessionId, PendingInteractionStatus>,
  completedBySession?: ReadonlyMap<SessionId, boolean>,
): SessionListState {
  const runtimeItems = items.map(item => wireToRuntimeSummary(
    item,
    pendingBySession?.get(item.sessionId),
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
 * @param archivedSessionIds - registry-global archive set from `workspace.list`.
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
  const list = toSessionListState(sessions, pendingBySession, completedBySession)
  const expanded = expandedGroups ?? [
    ...workspaces.map(workspace => workspace.workspaceId as string),
    UNGROUPED_KEY,
  ]
  return deriveGroups(list, workspaces, archivedSessionIds, { expandedGroups: expanded })
}

/**
 * Resolve the section title for one grouped bucket.
 * @param group - one derived workspace section.
 */
export function groupDisplayLabel(group: GroupNode): string {
  if (group.workspaceId === undefined) return MOBILE_UNGROUPED_LABEL
  return group.label
}

/**
 * List wire sessions visible in the mobile task home (archived and subagent rows excluded).
 * @param sessions - raw `session.list` rows.
 * @param workspaces - durable workspace registry order.
 * @param archivedSessionIds - registry-global archive set from `workspace.list`.
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
