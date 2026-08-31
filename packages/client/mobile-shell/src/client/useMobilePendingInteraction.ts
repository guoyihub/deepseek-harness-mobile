/** Subscribe to the mobile pending-interaction registry for one session. */

import { useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  getMobilePendingInteraction,
  subscribeMobilePendingRegistry,
  type MobilePendingInteraction,
} from './mobile-pending-registry.ts'

/**
 * Read the effective pending interaction for the active chat session.
 * @param sessionId - open session id.
 */
export function useMobilePendingInteraction(
  sessionId: SessionId,
): MobilePendingInteraction | undefined {
  return useSyncExternalStore(
    subscribeMobilePendingRegistry,
    () => getMobilePendingInteraction(sessionId),
    () => undefined,
  )
}
