// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import { EMPTY_CONVERSATION_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  createLiveSessionViewObservableForTest,
  type MobileSessionView,
} from '../src/client/useMobileSession.ts'

function sessionSnap(sessionId: string, running = false): SessionSnapshot {
  return {
    sessionId: sessionId as SessionSnapshot['sessionId'],
    queue: [],
    pendingSubmissions: [],
    running,
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
  }
}

function Harness({ source, probe }: {
  source: HostObservable<MobileSessionView>
  probe: { renders: number; running: boolean | undefined }
}): null {
  const useSession = bindSnapshotSelector(source)
  probe.renders += 1
  probe.running = useSession(snapshot => snapshot.running)
  return null
}

describe('createLiveSessionViewObservable', () => {
  it('returns a stable getSnapshot reference until the Session snapshot changes', () => {
    let snap = sessionSnap('sess-1', false)
    const listeners = new Set<() => void>()
    const session = {
      getSnapshot: () => snap,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    }
    const source = createLiveSessionViewObservableForTest(
      session,
      EMPTY_CONVERSATION_SNAPSHOT,
    )

    const first = source.getSnapshot()
    const second = source.getSnapshot()
    expect(second).toBe(first)

    snap = sessionSnap('sess-1', true)
    for (const listener of [...listeners]) listener()
    const third = source.getSnapshot()
    expect(third).not.toBe(first)
    expect(third.running).toBe(true)
  })

  it('does not loop renders when bound through bindSnapshotSelector', () => {
    const snap = sessionSnap('sess-2', false)
    const listeners = new Set<() => void>()
    const session = {
      getSnapshot: () => snap,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    }
    const source = createLiveSessionViewObservableForTest(
      session,
      EMPTY_CONVERSATION_SNAPSHOT,
    )
    const probe = { renders: 0, running: undefined as boolean | undefined }
    render(
      <StrictMode>
        <Harness source={source} probe={probe} />
      </StrictMode>,
    )
    const afterMount = probe.renders
    act(() => {
      for (const listener of [...listeners]) listener()
    })
    expect(probe.renders).toBe(afterMount)
  })
})
