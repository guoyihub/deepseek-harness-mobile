/** Pending submission visibility helpers for the mobile transcript. */

import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { PendingSubmission } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'

/**
 * Prompt-RPC identities already rendered by durable material.
 * @param order - chat node order.
 * @param nodes - keyed chat nodes.
 * @param queue - session queue rows.
 */
export function observedSubmissionRpcIds(
  order: readonly string[],
  nodes: ChatSnapshot['nodes'],
  queue: SessionSnapshot['queue'],
): ReadonlySet<string> {
  const observed = new Set<string>()
  for (const key of order) {
    const node = nodes.get(key)
    if (node === undefined || (node.kind !== 'user' && node.kind !== 'steering')) continue
    const source = (node.data as { readonly source?: unknown }).source as
      | { readonly kind?: unknown; readonly rpcId?: unknown }
      | undefined
    if (source?.kind === 'user' && typeof source.rpcId === 'string') observed.add(source.rpcId)
  }
  for (const item of queue) {
    if (item.rpcId !== undefined) observed.add(item.rpcId)
  }
  return observed
}

/**
 * Filter submission echoes that still need a local bubble.
 * @param pendingSubmissions - session snapshot echoes.
 * @param order - chat node order trigger.
 * @param nodes - keyed chat nodes.
 * @param queue - session queue rows.
 */
export function visibleMobileSubmissions(
  pendingSubmissions: readonly PendingSubmission[],
  order: readonly string[],
  nodes: ChatSnapshot['nodes'],
  queue: SessionSnapshot['queue'],
): readonly PendingSubmission[] {
  if (pendingSubmissions.length === 0) return pendingSubmissions
  const observed = observedSubmissionRpcIds(order, nodes, queue)
  return pendingSubmissions.filter(submission => (
    submission.placement !== 'queued' && !observed.has(submission.requestId)
  ))
}
