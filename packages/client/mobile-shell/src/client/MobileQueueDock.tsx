/** Queue strip above the mobile composer while the agent is busy. */

import { useCallback } from 'react'
import type { Session } from '@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { MessageImageLoader } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { QueueDock } from '@deepseek-ai/dsh-client-ui-conversation/src/client/queue/QueueDock.tsx'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import { mobileConversationUiT } from './mobile-conversation-ui-t.ts'

/** Props for {@link MobileQueueDock}. */
export interface MobileQueueDockProps {
  /** Active Host session id. */
  sessionId: SessionId
  /** Open Session instance for queue mutations. */
  session: Session
  /** uSES selector over the session snapshot. */
  useSession: SnapshotSelectorHook<SessionSnapshot>
  /** Session-authorized durable image loader. */
  loadImage: MessageImageLoader
  /** Surface queue operation failures. */
  onError: (message: string) => void
}

/**
 * Render the shared QueueDock with mobile Session remotes.
 * @param props - session face and error reporter.
 */
export function MobileQueueDock({
  sessionId,
  session,
  useSession,
  loadImage,
  onError,
}: MobileQueueDockProps): JSX.Element | null {
  const updateQueue = useCallback(async (itemId: Parameters<Session['updateQueue']>[0], action: Parameters<Session['updateQueue']>[1]) => {
    const result = await session.updateQueue(itemId, action)
    if (!result.ok) throw new Error(result.error.message)
  }, [session])

  const notify = useCallback((_level: 'info' | 'error', text: string) => {
    onError(text)
  }, [onError])

  return (
    <QueueDock
      sessionId={sessionId}
      session={session.getSnapshot()}
      useSession={useSession}
      useSessions={(() => { throw new Error('MobileQueueDock: useSessions unused') }) as never}
      useSessionPendingInteraction={(() => { throw new Error('MobileQueueDock: useSessionPendingInteraction unused') }) as never}
      useWorkspaces={(() => { throw new Error('MobileQueueDock: useWorkspaces unused') }) as never}
      useProjection={(() => undefined) as never}
      useConversation={(() => { throw new Error('MobileQueueDock: useConversation unused') }) as never}
      useChat={(() => { throw new Error('MobileQueueDock: useChat unused') }) as never}
      useInput={(() => { throw new Error('MobileQueueDock: useInput unused') }) as never}
      inputActions={{ setDraft: () => {}, submit: () => {} } as never}
      input={{ draft: '', imageIds: [], draftRev: 0, phase: 'plain', occurrences: [], queue: [] }}
      updateQueue={updateQueue}
      notify={notify}
      loadImage={loadImage}
      t={mobileConversationUiT}
    />
  )
}
