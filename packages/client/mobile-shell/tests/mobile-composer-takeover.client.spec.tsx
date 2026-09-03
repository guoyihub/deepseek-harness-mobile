// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { PendingApproval } from '@deepseek-ai/dsh-client-ui-approval/src/client/contract/slots.ts'
import { PendingQuestion } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/contract/slots.ts'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import { MobileComposerTakeover } from '../src/client/MobileComposerTakeover.tsx'
import type { MobileSessionView } from '../src/client/useMobileSession.ts'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'
import { EMPTY_CONVERSATION_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-conversation/client'

const SID = 'session-1' as SessionId

const stableSessionView = sessionView()

afterEach(cleanup)

function sessionView(): MobileSessionView {
  return {
    sessionId: SID,
    session: {
      sessionId: SID,
      queue: [],
      pendingSubmissions: [],
      running: true,
      subagent: null,
      removed: false,
      openState: 'open',
      openError: null,
      hasMore: false,
      loadingOlder: false,
      promptError: null,
      blank: false,
      lastAgentError: null,
      awaitingFirstTurn: false,
      promptAttempted: false,
    },
    conversation: EMPTY_CONVERSATION_SNAPSHOT,
    chat: EMPTY_CHAT_SNAPSHOT,
    running: true,
    blank: false,
    openState: 'open',
  }
}

describe('MobileComposerTakeover', () => {
  it('renders the approval panel for a pending approval wait', () => {
    const pending = new PendingApproval(SID, {
      toolName: 'bash',
      reason: 'fixture approval',
    })
    void pending.result.catch(() => {})
    const useSession = bindSnapshotSelector({
      getSnapshot: () => stableSessionView,
      subscribe: () => () => {},
    })
    render((
      <MobileComposerTakeover
        sessionId={SID}
        pendingInteraction={pending}
        useSession={useSession}
        useProjection={vi.fn() as never}
      />
    ))
    expect(screen.getByText('fixture approval')).toBeTruthy()
    expect(screen.getByRole('button', { name: '允许一次' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '拒绝' })).toBeTruthy()
  })

  it('enables submit after selecting a question option', () => {
    const pending = new PendingQuestion(SID, [{
      id: 'scope',
      question: 'Which scope should I inspect?',
      options: [{ label: 'Capabilities' }, { label: 'Project code' }],
    }])
    void pending.result.catch(() => {})
    const useSession = bindSnapshotSelector({
      getSnapshot: () => stableSessionView,
      subscribe: () => () => {},
    })
    render((
      <MobileComposerTakeover
        sessionId={SID}
        pendingInteraction={pending}
        useSession={useSession}
        useProjection={vi.fn() as never}
      />
    ))

    const submit = screen.getByRole('button', { name: '提交' })
    expect(submit.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Project code' }))
    expect(submit.hasAttribute('disabled')).toBe(false)
  })
})
