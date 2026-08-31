/**
 * Track session-list completion reminders from wire running transitions.
 * Mirrors {@link SessionManager}'s manager-owned sidebar state on mobile.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'

const completedNotifications = new Set<SessionId>()
/** Last-observed running bits per session; the true→false edge arms reminders. */
const prevRunning = new Map<SessionId, boolean>()
let selectedSessionId: SessionId | undefined

/** Drop every tracked completion reminder (mux generation reset). */
export function clearMobileCompletedNotifications(): void {
  completedNotifications.clear()
  prevRunning.clear()
  selectedSessionId = undefined
}

/**
 * Mirror desktop selection: opening a session consumes its completion reminder.
 * @param sessionId - active chat session id, or undefined when leaving chat.
 * @returns whether the reminder set changed.
 */
export function setMobileSelectedSession(sessionId: SessionId | undefined): boolean {
  selectedSessionId = sessionId
  if (sessionId === undefined) return false
  return completedNotifications.delete(sessionId)
}

/**
 * Reconcile completion reminders against the latest wire session.list rows.
 * @param sessions - cached `session.list` rows.
 * @returns whether the reminder set changed.
 */
export function syncMobileCompletedNotifications(
  sessions: readonly SessionSummary[],
): boolean {
  const seen = new Set<SessionId>()
  let changed = false
  for (const summary of sessions) {
    seen.add(summary.sessionId)
    const prev = prevRunning.get(summary.sessionId)
    if (prev === undefined) {
      prevRunning.set(summary.sessionId, summary.running)
      continue
    }
    if (prev && !summary.running) {
      if (summary.sessionId !== selectedSessionId) {
        const sizeBefore = completedNotifications.size
        completedNotifications.add(summary.sessionId)
        if (completedNotifications.size !== sizeBefore) changed = true
      }
    } else if (summary.running) {
      if (completedNotifications.delete(summary.sessionId)) changed = true
    }
    prevRunning.set(summary.sessionId, summary.running)
  }
  for (const id of prevRunning.keys()) {
    if (!seen.has(id)) prevRunning.delete(id)
  }
  for (const id of completedNotifications) {
    if (!seen.has(id)) {
      completedNotifications.delete(id)
      changed = true
    }
  }
  return changed
}

/**
 * Read whether one session should show the green completion reminder dot.
 * @param sessionId - session list row id.
 */
export function mobileSessionCompleted(sessionId: SessionId): boolean {
  return completedNotifications.has(sessionId)
}
