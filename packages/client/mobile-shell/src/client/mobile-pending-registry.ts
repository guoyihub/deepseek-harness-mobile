/**
 * Process-local pending interaction registry for the mobile PWA.
 * Mirrors {@link UiSession} pending-interaction projection without Cordis.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PendingApproval } from '@deepseek-ai/dsh-client-ui-approval/src/client/contract/slots.ts'
import type { PendingQuestion } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/contract/slots.ts'
import { notifySubscribers } from '@deepseek-ai/dsh-client-store'
import {
  setMobilePendingInteraction,
  type PendingInteractionStatus,
} from './mobile-session-pending-tracker.ts'

/** One answerable approval or question wait shown in the mobile composer. */
export type MobilePendingInteraction = PendingApproval | PendingQuestion

interface ActiveEntry {
  readonly interaction: MobilePendingInteraction
  readonly precedence: number
  readonly eventId: string
  readonly dispose: () => void
}

const byEventId = new Map<string, ActiveEntry>()
const listeners = new Set<() => void>()

function interactionStatus(interaction: MobilePendingInteraction): PendingInteractionStatus {
  if (interaction.kind === 'approval') return 'approval'
  if (interaction.kind === 'plan-review') return 'plan-review'
  return 'question'
}

function interactionPrecedence(interaction: MobilePendingInteraction): number {
  if (interaction.kind === 'plan-review') return 2
  if (interaction.kind === 'question') return 1
  return 0
}

function syncSidebar(interaction: MobilePendingInteraction, status: PendingInteractionStatus | undefined): void {
  setMobilePendingInteraction(interaction.sessionId, interaction.key, status)
}

function publish(): void {
  notifySubscribers(listeners, '[mobile-shell] pending interactions')
}

/**
 * Register one pending interaction answered through the mobile composer.
 * @param interaction - approval or question carrier.
 * @param eventId - Remote Event correlation id.
 * @param dispose - teardown invoked when the Host cancels or the generation ends.
 * @returns disposer for a settled interaction.
 */
export function publishMobilePendingInteraction(
  interaction: MobilePendingInteraction,
  eventId: string,
  dispose: () => void,
): () => void {
  const entry: ActiveEntry = {
    interaction,
    precedence: interactionPrecedence(interaction),
    eventId,
    dispose,
  }
  byEventId.set(eventId, entry)
  syncSidebar(interaction, interactionStatus(interaction))
  publish()
  let active = true
  return () => {
    if (!active) return
    active = false
    if (byEventId.get(eventId) !== entry) return
    byEventId.delete(eventId)
    syncSidebar(interaction, undefined)
    publish()
  }
}

/**
 * Read the effective pending interaction for one session.
 * @param sessionId - active chat session.
 */
export function getMobilePendingInteraction(sessionId: SessionId): MobilePendingInteraction | undefined {
  let winner: ActiveEntry | undefined
  for (const entry of byEventId.values()) {
    if (entry.interaction.sessionId !== sessionId) continue
    if (winner === undefined || entry.precedence >= winner.precedence) winner = entry
  }
  return winner?.interaction
}

/** Subscribe to pending-interaction revision changes. */
export function subscribeMobilePendingRegistry(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Drop every tracked pending interaction (connection generation reset). */
export function clearMobilePendingRegistry(): void {
  const entries = [...byEventId.values()]
  byEventId.clear()
  for (const entry of entries) {
    syncSidebar(entry.interaction, undefined)
    entry.dispose()
  }
  if (entries.length > 0) publish()
}
