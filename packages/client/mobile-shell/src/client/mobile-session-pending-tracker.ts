/**
 * Track session-list pending-interaction status. Live Host mux frames no longer
 * exist; queue/approval waits arrive through Session control and chat assembly.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionPendingInteractionStatus } from '@deepseek-ai/dsh-client-ui-workspace/src/client/tree.ts'

/** Sidebar pending-interaction kinds shown on mobile task-home rows. */
export type PendingInteractionStatus = SessionPendingInteractionStatus

const bySession = new Map<SessionId, Map<string, PendingInteractionStatus>>()

function track(sessionId: SessionId, key: string, status: PendingInteractionStatus): void {
  let interactions = bySession.get(sessionId)
  if (interactions === undefined) {
    interactions = new Map()
    bySession.set(sessionId, interactions)
  }
  interactions.set(key, status)
}

function resolve(sessionId: SessionId, key: string): void {
  const interactions = bySession.get(sessionId)
  if (interactions === undefined || !interactions.delete(key)) return
  if (interactions.size === 0) bySession.delete(sessionId)
}

/**
 * Record or clear one pending interaction without a mux frame.
 * @param sessionId - owning session.
 * @param key - interaction identity.
 * @param status - status to store; omit to clear.
 */
export function setMobilePendingInteraction(
  sessionId: SessionId,
  key: string,
  status: PendingInteractionStatus | undefined,
): void {
  if (status === undefined) resolve(sessionId, key)
  else track(sessionId, key, status)
}

/** Drop every tracked pending interaction (connection generation reset). */
export function clearMobilePendingInteractions(): void {
  bySession.clear()
}

/**
 * Read the sidebar pending-interaction label for one session.
 * @param sessionId - session list row id.
 */
export function mobilePendingInteraction(
  sessionId: SessionId,
): PendingInteractionStatus | undefined {
  const interactions = bySession.get(sessionId)
  if (interactions === undefined || interactions.size === 0) return undefined
  const statuses = [...interactions.values()]
  return statuses.find(candidate => candidate !== 'approval') ?? statuses[0]
}
