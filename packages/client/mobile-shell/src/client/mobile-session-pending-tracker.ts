/**
 * Track session-list pending-interaction status from mux frames on mobile.
 * Mirrors {@link SessionManager}'s manager-owned sidebar state for sessions
 * that may never instantiate a runtime {@link Session}.
 */
import type { MuxFrame, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { PendingInteractionStatus } from '@deepseek-ai/dsh-client-runtime/client'

const bySession = new Map<SessionId, Map<string, PendingInteractionStatus>>()

/** Match ui-user-questions plan-review routing at the wire boundary. */
function questionInteractionStatus(
  questions: Extract<MuxFrame, { type: 'question/requested' }>['questions'],
): PendingInteractionStatus {
  if (questions.length !== 1) return 'question'
  const question = questions[0] as typeof questions[number]
  const intent = question.intent
  if (intent?.kind !== 'plan-review' || question.detail === undefined) return 'question'
  if (question.multiSelect === true) return 'question'
  const options = question.options ?? []
  if (options.length > 2) return 'question'
  return options.some(option => option.label === intent.approve) ? 'plan-review' : 'question'
}

function track(sessionId: SessionId, key: string, status: PendingInteractionStatus): void {
  let interactions = bySession.get(sessionId)
  if (interactions === undefined) {
    interactions = new Map()
    bySession.set(sessionId, interactions)
  }
  if (interactions.get(key) === status) return
  interactions.set(key, status)
}

function resolve(sessionId: SessionId, key: string): void {
  const interactions = bySession.get(sessionId)
  if (interactions === undefined || !interactions.delete(key)) return
  if (interactions.size === 0) bySession.delete(sessionId)
}

/**
 * Apply one mux frame to the mobile pending-interaction tracker.
 * @param sessionId - owning session id.
 * @param frame - mux payload.
 * @param rpcId - envelope rpc id for question requests.
 * @returns whether the tracker mutated.
 */
export function applyMobilePendingMuxFrame(
  sessionId: SessionId,
  frame: MuxFrame,
  rpcId: string,
): boolean {
  const before = bySession.get(sessionId)?.size ?? 0
  switch (frame.type) {
    case 'approval/requested':
      track(sessionId, `a:${frame.approvalId}`, 'approval')
      break
    case 'approval/resolved':
      resolve(sessionId, `a:${frame.approvalId}`)
      break
    case 'question/requested':
      track(sessionId, `q:${rpcId}`, questionInteractionStatus(frame.questions))
      break
    case 'question/resolved':
      resolve(sessionId, `q:${frame.questionRpcId}`)
      break
    default:
      return false
  }
  return (bySession.get(sessionId)?.size ?? 0) !== before
}

/** Drop every tracked pending interaction (mux generation reset). */
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
