/** Composer takeover for pending ask-user and approval waits on mobile. */

import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type {
  ConversationSnapshot,
  PendingInteraction,
  UseProjection,
} from '@deepseek-ai/dsh-client-runtime/client'
import { ApprovalPanel } from '@deepseek-ai/dsh-client-ui-conversation/src/client/skeleton/ApprovalPanel.tsx'
import type { ApprovalWait } from '@deepseek-ai/dsh-client-ui-conversation/src/client/contract/slots.ts'
import { QuestionComposer } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/QuestionComposer.tsx'
import type { QuestionWait } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/contract/slots.ts'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { mobileChatT } from './mobile-conversation-t.ts'
import { mobileQuestionT } from './mobile-question-t.ts'
import {
  PassthroughSessionProvider,
  useMobileInputKit,
} from './mobile-framework-kit.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileComposerTakeover}. */
export interface MobileComposerTakeoverProps {
  /** Active Host session id. */
  sessionId: SessionId
  /** Pending inbox waits from the conversation snapshot. */
  pending: readonly PendingInteraction[]
  /** uSES selector over the conversation snapshot. */
  useSession: SnapshotSelectorHook<ConversationSnapshot>
  /** Framework projection reader (absent on mobile). */
  useProjection: UseProjection
}

function isQuestionWait(item: PendingInteraction): item is QuestionWait {
  return item.kind === 'question'
}

function isApprovalWait(item: PendingInteraction): item is ApprovalWait {
  return item.kind === 'approval'
}

/**
 * Render the desktop question or approval composer when a pending wait is active.
 * @param props - session face and pending inbox snapshot.
 */
export function MobileComposerTakeover({
  sessionId,
  pending,
  useSession,
  useProjection,
}: MobileComposerTakeoverProps): JSX.Element | null {
  const { useInput, inputActions } = useMobileInputKit()
  const session = useSession(snapshot => snapshot)
  const question = pending.find(isQuestionWait)
  const approval = pending.find(isApprovalWait)
  if (question === undefined && approval === undefined) return null

  const runtime = {
    sessionId,
    useSession,
    useProjection,
    useInput: useInput as never,
    inputActions: inputActions as never,
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
    SessionProvider: PassthroughSessionProvider,
    interactions: pending,
    session,
  }

  return (
    <div className={css.composerTakeover}>
      {question !== undefined
        ? (
          <QuestionComposer
            {...runtime}
            matched={question}
            t={mobileQuestionT}
          />
        )
        : (
          <ApprovalPanel
            {...runtime}
            matched={approval as ApprovalWait}
            t={mobileChatT}
          />
        )}
    </div>
  )
}
