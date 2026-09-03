// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'
import { EMPTY_CONVERSATION_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import { createChatStore } from '@deepseek-ai/dsh-client-ui-chat/src/client/stores.ts'
import { bindKeyedSnapshotSelector } from '../src/client/mobile-keyed-selector.ts'
import { MobileChatNodeSeat } from '../src/client/MobileChatNodeSeat.tsx'
import type { MobileSessionView } from '../src/client/useMobileSession.ts'

vi.mock('../src/client/MobileConnectionContext.tsx', () => ({
  useMobileConnection: () => ({ hostDescription: undefined }),
}))

const SID = 'session-1' as SessionId
const KEY = 'request-prompt:1'

const node: ChatNode<'system-prompt'> = {
  key: KEY,
  kind: 'system-prompt',
  id: '1',
  target: 'chat',
  anchorSeq: 1,
  location: { kind: 'unresolved' },
  visibility: 'visible',
  data: { text: '# Agent rules' },
}

function view(): MobileSessionView {
  return {
    sessionId: SID,
    session: {
      sessionId: SID,
      queue: [],
      pendingSubmissions: [],
      running: false,
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
    chat: {
      ...EMPTY_CHAT_SNAPSHOT,
      order: [KEY],
      nodes: {
        get: (key: string) => key === KEY ? node : undefined,
        source: (key: string) => ({
          getSnapshot: () => key === KEY ? node : undefined,
          subscribe: () => () => {},
        }),
        processSource: () => ({
          getSnapshot: () => undefined,
          subscribe: () => () => {},
        }),
        values: () => [node],
      },
    },
    running: false,
    blank: false,
    openState: 'open',
  }
}

describe('MobileChatNodeSeat system-prompt', () => {
  it('renders the system-prompt disclosure instead of a JSON dump', () => {
    const snapshot = view()
    const useSession = bindSnapshotSelector({
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    })
    const useChatNode = bindKeyedSnapshotSelector((key: string) => snapshot.chat.nodes.source(key))
    const useChatNodeProcess = bindKeyedSnapshotSelector((key: string) => snapshot.chat.nodes.processSource(key))
    const chatStore = createChatStore().create()
    const loadImage = Object.assign(async () => '', { peek: () => undefined })
    render((
      <MobileChatNodeSeat
        nodeKey={KEY}
        sessionId={SID}
        useSession={useSession}
        useChatNode={useChatNode}
        useChatNodeProcess={useChatNodeProcess}
        useProjection={vi.fn() as never}
        useStore={bindSnapshotSelector(chatStore)}
        actions={chatStore.actions}
        historyIncomplete={false}
        loadImage={loadImage}
      />
    ))
    expect(screen.getByRole('button', { name: '系统提示词' })).toBeTruthy()
    expect(screen.queryByText(/"text"/)).toBeNull()
  })
})
