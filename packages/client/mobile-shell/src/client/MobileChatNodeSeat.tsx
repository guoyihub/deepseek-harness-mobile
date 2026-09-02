/**
 * One Chat Node seat: compact Turn-process folding plus the same
 * desktop node views the PC conversation tab uses.
 */
import { memo, useCallback, useMemo, type ComponentProps, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { RemoteHostFacts } from '@deepseek-ai/dsh-api-remotes/client'
import type { MessageImageLoader, RenderMessageImages } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { JsonBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type {
  ChatNodeOwnerProps, ChatNodeViewProps, ChatViewSlotProps, UseChatNodeTurnData,
} from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/slots.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/assistant.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/command.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/compaction.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/fallback.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/message.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/request-prompt.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/retry.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/tool.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/turn-error.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/turn-max-tokens.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/turn-process.ts'
import type {} from '@deepseek-ai/dsh-client-ui-chat/src/client/conversation-nodes/turn-tail.ts'
import { AssistantNodeView } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/AssistantNodeView.tsx'
import { CompactionCommandCard } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/CompactionCommandCard.tsx'
import { GenericCommandCard } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/GenericCommandCard.tsx'
import { ChatNodeSeat } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/ChatNodeSeat.tsx'
import {
  CompactionNodeView,
  ContextMessageNodeView,
  RetryNodeView,
  TurnErrorNodeView,
  TurnMaxTokensNodeView,
  UnknownNodeView,
  UserMessageNodeView,
} from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/MessageItem.tsx'
import { SystemPromptNodeView } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/SystemPromptRow.tsx'
import { TurnProcessNodeView } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/TurnProcessNodeView.tsx'
import { TurnTailNodeView } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/TurnTailNodeView.tsx'
import chatCss from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/ChatView.module.css'
import { ToolCallTree } from '@deepseek-ai/dsh-client-ui-tool/src/client/tool/ToolCallTree.tsx'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/src/client/contract/slots.ts'
import { GenericToolCard } from '@deepseek-ai/dsh-client-ui-tool/src/client/tool/toolviews/GenericToolCard.tsx'
import { AskQuestionRow } from '@deepseek-ai/dsh-client-ui-tool/src/client/tool/toolviews/ask-question-row.tsx'
import {
  PassthroughSessionProvider,
  useMobileInputKit,
} from './mobile-framework-kit.ts'
import { localizeCommandNode } from './mobile-command-outcome.ts'
import { mobileChatT } from './mobile-conversation-t.ts'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { MobileMessageImages } from './MobileMessageImages.tsx'
import type { MobileSessionView } from './useMobileSession.ts'

type RoutedChatNodeOwner = ChatNodeOwnerProps & { readonly node: ChatNode }

/** Props for {@link MobileChatNodeSeat}. */
export interface MobileChatNodeSeatProps {
  /** Stable Context key from `snapshot.chat.order`. */
  nodeKey: string
  /** Active Host session id. */
  sessionId: SessionId
  /** uSES selector over the conversation snapshot. */
  useSession: SnapshotSelectorHook<MobileSessionView>
  /** Framework projection reader. */
  useProjection: UseProjection
  /** Compact-transcript Turn-process store. */
  useStore: ChatViewSlotProps['useStore']
  /** Compact-transcript Turn-process actions. */
  actions: ChatViewSlotProps['actions']
  /** Whether older history is still unloaded. */
  historyIncomplete: boolean
  /** Session-authorized image URL loader. */
  loadImage: MessageImageLoader
}

const noopOpenFile: ChatNodeOwnerProps['openFile'] = () => {}
const noopInspect: ChatNodeOwnerProps['inspectCall'] = () => {}
const noopFork: ChatNodeOwnerProps['forkAt'] = () => {}
const noopFileMentions: ChatNodeOwnerProps['fileMentions'] = () => undefined
const noopRenderSlot = (): null => null
const noopRenderSlotChain = (): null => null
const emptyPendingInteraction = new Map()

/**
 * Subscribe and dispatch one Chat Node without observing sibling Nodes.
 * @param props - node key, compact store, and session face.
 */
export const MobileChatNodeSeat = memo(function MobileChatNodeSeat({
  nodeKey,
  sessionId,
  useSession,
  useProjection,
  useStore,
  actions,
  historyIncomplete,
  loadImage,
}: MobileChatNodeSeatProps): ReactNode {
  const { useInput, inputActions } = useMobileInputKit()
  const { hostDescription } = useMobileConnection()
  const useHostInfo = useMemo(
    () => bindSnapshotSelector<RemoteHostFacts>({
      getSnapshot: () => ({ home: hostDescription?.home, isLoopback: false }),
      subscribe: () => () => {},
    }),
    [hostDescription],
  )

  const useChat: ChatViewSlotProps['useChat'] = useCallback((
    selector: (snapshot: MobileSessionView['chat']) => unknown,
    eq?: (left: unknown, right: unknown) => boolean,
  ) => useSession(mobile => selector(mobile.chat), eq as never), [useSession]) as ChatViewSlotProps['useChat']

  const renderMessageImages = useCallback<RenderMessageImages>(owner => (
    <MobileMessageImages {...owner} loadImage={loadImage} />
  ), [loadImage])

  const t = mobileChatT
  const baseRuntime = {
    sessionId,
    useSession: ((selector: (snapshot: import('@deepseek-ai/dsh-api-session-controller/client').SessionSnapshot) => unknown) => (
      useSession(mobile => selector(mobile.session))
    )) as never,
    useProjection,
    useInput: useInput as never,
    inputActions: inputActions as never,
    useSessions: (() => undefined) as never,
    useSessionPendingInteraction: ((selector: (value: Map<SessionId, unknown>) => unknown) => (
      selector(emptyPendingInteraction)
    )) as never,
    useWorkspaces: (() => undefined) as never,
    useConversation: ((selector: (value: MobileSessionView['conversation']) => unknown) => (
      useSession(snapshot => selector(snapshot.conversation))
    )) as never,
    useChat: ((selector: (value: MobileSessionView['chat']) => unknown) => (
      useSession(snapshot => selector(snapshot.chat))
    )) as never,
    useTrajectory: (() => ({ order: [], nodes: new Map() })) as never,
    SessionProvider: PassthroughSessionProvider,
  }

  const renderToolSlot = (
    _slotName: string,
    toolOwner: object,
    opts?: { entryKey?: string; fallback?: ReactNode },
  ): ReactNode => {
    if (opts?.entryKey === 'ask_user_question') {
      const askProps = { ...toolOwner as ToolCallOwnerProps, ...baseRuntime, t: mobileChatT }
      return <AskQuestionRow {...(askProps as unknown as ComponentProps<typeof AskQuestionRow>)} />
    }
    return opts?.fallback ?? <GenericToolCard {...toolOwner as ToolCallOwnerProps} t={t} />
  }

  const renderSlot = (
    _name: string,
    owner: object,
    opts?: { entryKey?: string; fallback?: ReactNode; hookContext?: string },
  ): ReactNode => {
    if (_name !== 'conversation.chat.node') return opts?.fallback ?? null
    const routedOwner = owner as RoutedChatNodeOwner
    const useTurnData: UseChatNodeTurnData = dataKey => useSession((snapshot) => {
      const location = snapshot.chat.nodes.get(nodeKey)?.location
      return location?.kind === 'turn' || location?.kind === 'step'
        ? location.turn.data.get(dataKey)
        : undefined
    })
    const nodeProps = <Kind extends ChatNode['kind']>(): ChatNodeViewProps<Kind> => ({
      ...baseRuntime,
      ...routedOwner,
      useTurnData,
      t,
    } as unknown as ChatNodeViewProps<Kind>)

    switch (routedOwner.node.kind) {
      case 'user':
      case 'steering':
        return <UserMessageNodeView {...nodeProps<'user' | 'steering'>()} />
      case 'context':
        return <ContextMessageNodeView {...nodeProps<'context'>()} />
      case 'assistant-step':
        return <AssistantNodeView {...nodeProps<'assistant-step'>()} />
      case 'command':
        return (
          <div className={chatCss.callRow}>
            <GenericCommandCard node={localizeCommandNode(routedOwner.node.data)} t={t} />
          </div>
        )
      case 'manual-compaction': {
        const data = routedOwner.node.data
        return (
          <div className={chatCss.callRow}>
            <CompactionCommandCard
              node={localizeCommandNode(data.command)}
              {...data.compaction === null ? {} : { compaction: data.compaction }}
              t={t}
            />
          </div>
        )
      }
      case 'compaction':
        return <CompactionNodeView {...nodeProps<'compaction'>()} />
      case 'model-retry':
        return <RetryNodeView {...nodeProps<'model-retry'>()} />
      case 'turn-error':
        return <TurnErrorNodeView {...nodeProps<'turn-error'>()} />
      case 'turn-max-tokens':
        return <TurnMaxTokensNodeView {...nodeProps<'turn-max-tokens'>()} />
      case 'system-prompt':
        return <SystemPromptNodeView {...nodeProps<'system-prompt'>()} />
      case 'turn-process':
        return <TurnProcessNodeView {...nodeProps<'turn-process'>()} />
      case 'turn-tail':
        return (
          <TurnTailNodeView
            {...nodeProps<'turn-tail'>()}
            SessionProvider={PassthroughSessionProvider}
            renderSlot={noopRenderSlot}
            renderSlotChain={noopRenderSlotChain}
          />
        )
      case 'tool-call':
        return (
          <ToolCallTree
            {...nodeProps<'tool-call'>()}
            SessionProvider={PassthroughSessionProvider}
            useHostInfo={useHostInfo}
            renderSlot={renderToolSlot}
            t={mobileChatT as never}
          />
        )
      case 'unknown':
        return <UnknownNodeView {...nodeProps<'unknown'>()} />
      default: {
        const unexpected = routedOwner.node as { kind: string; data: unknown }
        return opts?.fallback ?? (
          <JsonBlock
            label={t('message.unknownSurface', { type: unexpected.kind })}
            payload={unexpected.data}
            truncatedLabel={total => t('json.truncated', { total })}
          />
        )
      }
    }
  }

  return (
    <ChatNodeSeat
      nodeKey={nodeKey}
      historyIncomplete={historyIncomplete}
      compactTranscript
      useChat={useChat}
      useStore={useStore}
      actions={actions}
      selectedCallId={undefined}
      cwd={undefined}
      openFile={noopOpenFile}
      inspectCall={noopInspect}
      forkAt={noopFork}
      renderMessageImages={renderMessageImages}
      fileMentions={noopFileMentions}
      renderSlot={renderSlot as ChatViewSlotProps['renderSlot']}
      t={t}
    />
  )
})
