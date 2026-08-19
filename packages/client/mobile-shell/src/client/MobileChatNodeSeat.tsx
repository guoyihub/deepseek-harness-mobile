/**
 * One Chat Node seat: subscribe by Context key and dispatch to the same
 * desktop node views the PC conversation tab uses (retry, context, Think,
 * tools, turn-error, …).
 */
import { memo, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ChatNode, ChatNodeOwnerProps, ChatNodeViewProps, UseChatNodeTurnData,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Ensure ChatNodeDataMap augmentations from each Conversation Node package are in scope.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/assistant.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/command.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/compaction.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/fallback.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/message.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/retry.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/tool.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/turn-error.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/turn-max-tokens.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation-nodes/turn-tail.ts'
import { AssistantNodeView } from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/AssistantNodeView.tsx'
import { CompactionCommandCard } from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/CompactionCommandCard.tsx'
import { GenericCommandCard } from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/GenericCommandCard.tsx'
import {
  CompactionNodeView,
  ContextMessageNodeView,
  RetryNodeView,
  TurnErrorNodeView,
  TurnMaxTokensNodeView,
  UnknownNodeView,
  UserMessageNodeView,
} from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/MessageItem.tsx'
import { TurnTailNodeView } from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/TurnTailNodeView.tsx'
import chatCss from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/ChatView.module.css'
import { ToolCallTree } from '@deepseek-ai/dsh-client-ui-tool/src/client/tool/ToolCallTree.tsx'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/src/client/contract/slots.ts'
import { GenericToolCard } from '@deepseek-ai/dsh-client-ui-tool/src/client/tool/toolviews/GenericToolCard.tsx'
import type { SnapshotSelectorHook, SessionAreaProps } from '@deepseek-ai/dsh-client-ui-slots'
import { JsonBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileChatT } from './mobile-conversation-t.ts'

type RoutedChatNodeOwner = ChatNodeOwnerProps & { readonly node: ChatNode }

/** Props for {@link MobileChatNodeSeat}. */
export interface MobileChatNodeSeatProps {
  /** Stable Context key from `snapshot.chat.order`. */
  nodeKey: string
  /** Active Host session id. */
  sessionId: SessionId
  /** uSES selector over the conversation snapshot. */
  useSession: SnapshotSelectorHook<ConversationSnapshot>
}

const noopOpenFile: ChatNodeOwnerProps['openFile'] = () => {}
const noopInspect: ChatNodeOwnerProps['inspectCall'] = () => {}
const noopFork: ChatNodeOwnerProps['forkAt'] = () => {}
const noopFileMentions: ChatNodeOwnerProps['fileMentions'] = () => undefined
const loadImageUnavailable: ChatNodeOwnerProps['loadImage'] = () =>
  Promise.reject(new Error(mobileChatT('image.serviceUnavailable')))
const noopRenderSlot = (): null => null
const noopRenderSlotChain = (): null => null

/** Satisfy PropsRuntime SessionProvider without nesting a real session area. */
function PassthroughSessionProvider(_props: SessionAreaProps): ReactNode {
  return null
}

/**
 * Subscribe and dispatch one Chat Node without observing sibling Nodes.
 * @param props - node key and session face.
 */
export const MobileChatNodeSeat = memo(function MobileChatNodeSeat({
  nodeKey,
  sessionId,
  useSession,
}: MobileChatNodeSeatProps): ReactNode {
  const node = useSession(snapshot => snapshot.chat.nodes.get(nodeKey)) as ChatNode | undefined

  const useTurnData: UseChatNodeTurnData = dataKey => useSession((snapshot) => {
    const location = snapshot.chat.nodes.get(nodeKey)?.location
    return location?.kind === 'turn' || location?.kind === 'step'
      ? location.turn.data.get(dataKey)
      : undefined
  })

  if (node === undefined) return null

  const owner: ChatNodeOwnerProps = {
    selectedCallId: undefined,
    cwd: undefined,
    openFile: noopOpenFile,
    inspectCall: noopInspect,
    forkAt: noopFork,
    loadImage: loadImageUnavailable,
    fileMentions: noopFileMentions,
  }
  const routedOwner = { ...owner, node } as RoutedChatNodeOwner
  const t = mobileChatT
  const baseRuntime = {
    sessionId,
    useSession,
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
    SessionProvider: PassthroughSessionProvider,
  }
  const nodeProps = <Kind extends ChatNode['kind']>(): ChatNodeViewProps<Kind> => ({
    ...baseRuntime,
    ...routedOwner,
    useTurnData,
    t,
  } as unknown as ChatNodeViewProps<Kind>)

  const renderToolSlot = (
    _key: string,
    toolOwner: object,
    opts?: { fallback?: ReactNode },
  ): ReactNode => opts?.fallback ?? (
    <GenericToolCard {...toolOwner as ToolCallOwnerProps} t={t} />
  )

  let body: ReactNode
  switch (routedOwner.node.kind) {
    case 'user':
    case 'steering':
      body = <UserMessageNodeView {...nodeProps<'user' | 'steering'>()} />
      break
    case 'context':
      body = <ContextMessageNodeView {...nodeProps<'context'>()} />
      break
    case 'assistant-step':
      body = <AssistantNodeView {...nodeProps<'assistant-step'>()} />
      break
    case 'command':
      body = (
        <div className={chatCss.callRow}>
          <GenericCommandCard node={routedOwner.node.data} t={t} />
        </div>
      )
      break
    case 'manual-compaction': {
      const data = routedOwner.node.data
      body = (
        <div className={chatCss.callRow}>
          <CompactionCommandCard
            node={data.command}
            {...data.compaction === null ? {} : { compaction: data.compaction }}
            t={t}
          />
        </div>
      )
      break
    }
    case 'compaction':
      body = <CompactionNodeView {...nodeProps<'compaction'>()} />
      break
    case 'model-retry':
      body = <RetryNodeView {...nodeProps<'model-retry'>()} />
      break
    case 'turn-error':
      body = <TurnErrorNodeView {...nodeProps<'turn-error'>()} />
      break
    case 'turn-max-tokens':
      body = <TurnMaxTokensNodeView {...nodeProps<'turn-max-tokens'>()} />
      break
    case 'turn-tail':
      body = (
        <TurnTailNodeView
          {...nodeProps<'turn-tail'>()}
          {...baseRuntime}
          renderSlot={noopRenderSlot}
          renderSlotChain={noopRenderSlotChain}
        />
      )
      break
    case 'tool-call':
      body = (
        <ToolCallTree
          {...nodeProps<'tool-call'>()}
          {...baseRuntime}
          renderSlot={renderToolSlot}
        />
      )
      break
    case 'unknown':
      body = <UnknownNodeView {...nodeProps<'unknown'>()} />
      break
    default: {
      const unexpected = routedOwner.node as { kind: string; data: unknown }
      body = (
        <JsonBlock
          label={t('message.unknownSurface', { type: unexpected.kind })}
          payload={unexpected.data}
          truncatedLabel={total => t('json.truncated', { total })}
        />
      )
    }
  }

  return (
    <div
      className={chatCss.flowItem}
      data-chat-anchor-key={routedOwner.node.key}
      data-chat-flow-key={routedOwner.node.key}
      data-chat-flow-kind={routedOwner.node.kind}
    >
      {body}
    </div>
  )
})
