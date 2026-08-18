/** Display labels for session list rows. */

import type { SessionSummary } from '@deepseek-ai/dsh-client-connection/client'

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
 * Resolve chat header metadata: host label and workspace leaf.
 * @param summary - one session.list row.
 * @param hostLabel - optional Host provider label.
 */
export function sessionChatHeaderMeta(summary: SessionSummary, hostLabel?: string): string {
  const workspace = sessionWorkspaceLabel(summary)
  const host = hostLabel ?? summary.agentPreset ?? 'DSH'
  return `${host} · ${workspace}`
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
 * Format a search-result timestamp: `昨天 HH:mm` for the previous calendar day.
 * @param updatedAt - unix ms from session.list.
 * @param now - clock used for the calendar-day comparison.
 */
export function formatSessionSearchTime(updatedAt: number, now: number = Date.now()): string {
  const date = new Date(updatedAt)
  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const today = new Date(now)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const dayDiff = Math.round((startOfToday - startOfThat) / 86_400_000)
  if (dayDiff === 1) return `昨天 ${time}`
  if (dayDiff === 0) return time
  return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) + ` ${time}`
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
