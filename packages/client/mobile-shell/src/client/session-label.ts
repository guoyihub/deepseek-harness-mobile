/** Display labels for session list rows. */

import type { SessionSummary } from '@deepseek-ai/dsh-client-connection/client'

/**
 * Resolve a human-readable session title for list surfaces.
 * @param summary - one session.list row.
 */
export function sessionDisplayTitle(summary: SessionSummary): string {
  const projections = summary.projections?.values as { title?: unknown } | undefined
  const title = projections?.title
  if (typeof title === 'string' && title.trim() !== '') return title
  if (summary.cwd !== undefined && summary.cwd !== '') {
    const parts = summary.cwd.split(/[/\\]/).filter(part => part !== '')
    const leaf = parts[parts.length - 1]
    if (leaf !== undefined && leaf !== '') return leaf
  }
  return summary.sessionId.slice(0, 8)
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
