/** Workspace connect helpers aligned with desktop WorkspacesService.connectWorkspace. */

import type { SessionId, SessionSummary, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'

/**
 * Resolve the most recently active workspace (same tie-break as desktop).
 * @param workspaces - Host workspace registry rows.
 * @param sessions - cached session.list rows.
 */
export function resolveRecentWorkspaceId(
  workspaces: readonly WorkspaceView[],
  sessions: readonly SessionSummary[],
): WorkspaceId | undefined {
  const byId = new Map(sessions.map(item => [item.sessionId, item]))
  let selected: WorkspaceId | undefined
  let selectedTime = Number.NEGATIVE_INFINITY
  for (const workspace of workspaces) {
    let latest = Number.NEGATIVE_INFINITY
    for (const sessionId of workspace.sessionIds) {
      const session = byId.get(sessionId)
      if (session !== undefined) latest = Math.max(latest, session.updatedAt)
    }
    if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.createdAt)
    if (selected === undefined || latest > selectedTime) {
      selected = workspace.workspaceId
      selectedTime = latest
    }
  }
  return selected
}

/**
 * Find one reusable blank session already attached to a workspace.
 * @param workspace - target workspace row.
 * @param sessions - cached session.list rows.
 * @param archivedSessionIds - registry-global archive set.
 */
export function findReusableBlankSession(
  workspace: WorkspaceView,
  sessions: readonly SessionSummary[],
  archivedSessionIds: readonly SessionId[],
): SessionId | undefined {
  for (const sessionId of workspace.sessionIds) {
    if (archivedSessionIds.includes(sessionId)) continue
    const summary = sessions.find(item => item.sessionId === sessionId)
    if (summary?.blank === true && summary.cwd === workspace.path) return sessionId
  }
  return undefined
}

/**
 * Resolve the workspace that currently owns one session, if any.
 * @param sessionId - active session id.
 * @param workspaces - Host workspace registry rows.
 */
export function workspaceForSession(
  sessionId: SessionId,
  workspaces: readonly WorkspaceView[],
): WorkspaceView | undefined {
  return workspaces.find(item => item.sessionIds.includes(sessionId))
}

/**
 * Default workspace for a new mobile session: recent activity, else first registry row.
 * @param workspaces - Host workspace registry rows.
 * @param sessions - cached session.list rows.
 */
export function resolveDefaultWorkspaceId(
  workspaces: readonly WorkspaceView[],
  sessions: readonly SessionSummary[],
): WorkspaceId | undefined {
  return resolveRecentWorkspaceId(workspaces, sessions) ?? workspaces[0]?.workspaceId
}
