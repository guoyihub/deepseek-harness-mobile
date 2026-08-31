/** Composer takeover for pending ask-user and approval waits on mobile. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { MobileSessionView } from './useMobileSession.ts'

/** Props for {@link MobileComposerTakeover}. */
export interface MobileComposerTakeoverProps {
  sessionId: SessionId
  pending: readonly unknown[]
  useSession: SnapshotSelectorHook<MobileSessionView>
  useProjection: UseProjection
}

/**
 * Render the desktop question or approval composer when a pending wait is active.
 * Inbox waits now arrive through Session follow; this shell has no mux waits yet.
 */
export function MobileComposerTakeover(_props: MobileComposerTakeoverProps): JSX.Element | null {
  return null
}
