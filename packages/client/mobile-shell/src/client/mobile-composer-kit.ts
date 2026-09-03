/** Framework stubs for mounting desktop composer takeover components on mobile. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ApprovalComposerProps } from '@deepseek-ai/dsh-client-ui-approval/client'
import type { QuestionComposerProps } from '@deepseek-ai/dsh-client-ui-user-questions/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import { createQuestionDraftStore } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/draft-store.ts'
import type { MobileSessionView } from './useMobileSession.ts'
import { absentProjection, PassthroughSessionProvider, useMobileInputKit } from './mobile-framework-kit.ts'

const emptyList = { byId: {}, order: [], current: undefined }
const emptyConversation = { views: new Map() }
const emptyChat = { order: [], nodes: new Map() }
const emptyAttention = new Map<SessionId, unknown>()

const questionDraftStore = createQuestionDraftStore().create('mobile-shell-question-drafts')
const useQuestionDraftStore = bindSnapshotSelector(questionDraftStore)

/**
 * Build the shared runtime kit required by approval and question composer takeovers.
 * @param sessionId - active session.
 * @param useSession - bound session snapshot hook.
 */
export function useMobileComposerTakeoverKit(
  sessionId: SessionId,
  useSession: SnapshotSelectorHook<MobileSessionView>,
): Omit<ApprovalComposerProps, 'matched' | 't'> & Pick<QuestionComposerProps, 'useStore' | 'actions'> {
  const { useInput, inputActions } = useMobileInputKit()
  return {
    sessionId,
    session: undefined,
    pendingInteraction: undefined,
    useSession: selector => useSession(snapshot => selector(snapshot.session as never)),
    useSessions: selector => selector(emptyList as never),
    useSessionPendingInteraction: selector => selector(emptyAttention as never),
    useWorkspaces: selector => selector([] as never),
    useConversation: selector => selector(emptyConversation as never),
    useChat: selector => selector(emptyChat as never),
    useProjection: absentProjection,
    useInput: useInput as never,
    inputActions: inputActions as never,
    SessionProvider: PassthroughSessionProvider,
    renderSlot: () => null,
    useStore: useQuestionDraftStore,
    actions: questionDraftStore.actions,
  }
}
