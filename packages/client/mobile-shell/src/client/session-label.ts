/** Display labels for session list rows. */

import type { SessionId, SessionSummary, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'

/** Label when a session belongs to no registered workspace. */
const UNGROUPED_WORKSPACE_LABEL = '未分组'

/**
 * Resolve the Host workspace display title (registry `title`, then path leaf).
 * @param view - one workspace.list row.
 */
export function workspaceDisplayLabel(view: WorkspaceView): string {
  const title = view.title.trim()
  if (title !== '') return title
  const parts = view.path.split(/[/\\]/).filter(part => part !== '')
  const leaf = parts[parts.length - 1]
  if (leaf !== undefined && leaf !== '') return leaf
  return view.path
}

/**
 * Resolve the workspace title for one session from the Host registry.
 * @param sessionId - active session id.
 * @param workspaces - cached workspace.list rows.
 */
export function sessionWorkspaceTitle(
  sessionId: SessionId,
  workspaces: readonly WorkspaceView[],
): string {
  const workspace = workspaces.find(item => item.sessionIds.includes(sessionId))
  if (workspace !== undefined) return workspaceDisplayLabel(workspace)
  return UNGROUPED_WORKSPACE_LABEL
}

/**
 * Resolve the workspace leaf directory name from one session row.
 * @param summary - one session.list row.
 */
export function sessionWorkspaceLabel(summary: SessionSummary): string {
  if (summary.cwd !== undefined && summary.cwd !== '') {
    const parts = summary.cwd.split(/[/\\]/).filter(part => part !== '')
    const leaf = parts[parts.length - 1]
    if (leaf !== undefined && leaf !== '') return leaf
  }
  return 'Work'
}

/**
 * Resolve a human-readable session title for list surfaces.
 * @param summary - one session.list row.
 */
export function sessionDisplayTitle(summary: SessionSummary): string {
  const projections = summary.projections?.values as { title?: unknown } | undefined
  const title = projections?.title
  if (typeof title === 'string' && title.trim() !== '') return title
  const workspace = sessionWorkspaceLabel(summary)
  if (summary.cwd !== undefined && summary.cwd !== '') return workspace
  return summary.sessionId.slice(0, 8)
}

/**
 * Resolve chat header workspace title (Host registry name, not cwd leaf).
 * @param sessionId - active session id.
 * @param workspaces - cached workspace.list rows.
 */
export function sessionChatHeaderMeta(
  sessionId: SessionId,
  workspaces: readonly WorkspaceView[],
): string {
  return sessionWorkspaceTitle(sessionId, workspaces)
}

/**
 * Format one session row subtitle: workspace and preset labels.
 * @param summary - one session.list row.
 * @param hostLabel - optional Host provider or model label.
 */
export function sessionDisplayMeta(summary: SessionSummary, hostLabel?: string): string {
  const workspace = sessionWorkspaceLabel(summary)
  const preset = summary.agentPreset ?? hostLabel ?? 'DSH'
  return `· ${workspace} · ${preset}`
}

/**
 * Format one search-result subtitle: `Work · <workspace leaf>`.
 * @param summary - one session.list row.
 */
export function sessionSearchMeta(summary: SessionSummary): string {
  const workspace = sessionWorkspaceLabel(summary)
  if (summary.cwd === undefined || summary.cwd === '' || workspace === 'Work') return 'Work'
  return `Work · ${workspace}`
}

/**
 * Format a session list timestamp for mobile task rows (HH:mm).
 * @param updatedAt - unix ms from session.list.
 */
export function formatSessionListTime(updatedAt: number): string {
  return new Date(updatedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a session list timestamp for mobile surfaces.
 * @param updatedAt - unix ms from session.list.
 */
export function formatSessionUpdatedAt(updatedAt: number): string {
  return new Date(updatedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
