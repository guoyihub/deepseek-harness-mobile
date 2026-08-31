/** Composer takeover for pending ask-user and approval waits on mobile. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { ApprovalPanel } from '@deepseek-ai/dsh-client-ui-approval/src/client/ApprovalPanel.tsx'
import { QuestionComposer } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/QuestionComposer.tsx'
import type { MobileSessionView } from './useMobileSession.ts'
import type { MobilePendingInteraction } from './mobile-pending-registry.ts'
import { useMobileComposerTakeoverKit } from './mobile-composer-kit.ts'
import { mobileApprovalT } from './mobile-approval-t.ts'
import { mobileQuestionT } from './mobile-question-t.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileComposerTakeover}. */
export interface MobileComposerTakeoverProps {
  sessionId: SessionId
  pendingInteraction: MobilePendingInteraction
  useSession: SnapshotSelectorHook<MobileSessionView>
  useProjection: UseProjection
}

/**
 * Render the desktop question or approval composer when a pending wait is active.
 * @param props - session face and the effective pending interaction.
 */
export function MobileComposerTakeover({
  sessionId,
  pendingInteraction,
  useSession,
}: MobileComposerTakeoverProps): JSX.Element {
  const kit = useMobileComposerTakeoverKit(sessionId, useSession)

  if (pendingInteraction.kind === 'approval') {
    return (
      <div className={css.composerTakeover}>
        <ApprovalPanel matched={pendingInteraction} t={mobileApprovalT} {...kit} />
      </div>
    )
  }

  return (
    <div className={css.composerTakeover}>
      <QuestionComposer matched={pendingInteraction} t={mobileQuestionT} {...kit} />
    </div>
  )
}
