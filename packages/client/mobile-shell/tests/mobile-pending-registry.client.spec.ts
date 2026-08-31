import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { PendingApproval } from '@deepseek-ai/dsh-client-ui-approval/src/client/contract/slots.ts'
import { PendingQuestion } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/contract/slots.ts'
import {
  clearMobilePendingRegistry,
  getMobilePendingInteraction,
  publishMobilePendingInteraction,
} from '../src/client/mobile-pending-registry.ts'

const SID = 'session-1' as SessionId

describe('mobile pending registry', () => {
  it('prefers plan-review over approval for one session', () => {
    clearMobilePendingRegistry()
    const approval = new PendingApproval(SID, { toolName: 'bash' })
    const question = new PendingQuestion(SID, [{
      id: 'q1',
      question: 'Choose',
      options: [{ label: 'Approve' }, { label: 'Decline' }],
      intent: { kind: 'plan-review', approve: 'Approve' },
      detail: '# Plan',
    }])
    void approval.result.catch(() => {})
    void question.result.catch(() => {})
    const removeApproval = publishMobilePendingInteraction(approval, 'evt-approval', () => {})
    const removeQuestion = publishMobilePendingInteraction(question, 'evt-question', () => {})
    expect(getMobilePendingInteraction(SID)?.kind).toBe('plan-review')
    removeQuestion()
    expect(getMobilePendingInteraction(SID)?.kind).toBe('approval')
    removeApproval()
    expect(getMobilePendingInteraction(SID)).toBeUndefined()
  })
})
