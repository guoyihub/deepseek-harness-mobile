/** Shared browser RPC client for the standalone mobile PWA. */

import {
  createWebConnectionRpc,
  transportError,
  type ClientConnectionRpc,
  type ConnectionRpcResult,
} from '@deepseek-ai/dsh-client-connection/client'
import type { EncodedImageAttachment } from '@deepseek-ai/dsh-attachment/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types'
import type { DirectoryListing, PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'

const rpc: ClientConnectionRpc = createWebConnectionRpc()

/** Unary Connection RPC used by Session remotes and the mobile shell. */
export function mobileConnectionRpc(): ClientConnectionRpc {
  return rpc
}

async function invoke<T>(
  endpoint: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ result: ConnectionRpcResult<T> }> {
  try {
    const result = await rpc.call('/api', endpoint, { args }, signal)
    return { result: result as ConnectionRpcResult<T> }
  } catch (error) {
    return { result: transportError(error) }
  }
}

/** Named-argument unary namespaces matching the Typert Connection wire. */
export const mobileApi = {
  sessions: {
    list: (_request: Record<string, unknown> = {}, signal?: AbortSignal) =>
      invoke<{ items: readonly unknown[] }>('session/list', { _request }, signal),
    search: (payload: { query: string }, signal?: AbortSignal) =>
      invoke<{ items: readonly unknown[]; hasMore: boolean }>(
        'session/search',
        { request: payload },
        signal,
      ),
    create: (payload: {
      workspaceId?: WorkspaceId
      cwd?: string
      sessionId?: SessionId
      agentPreset?: string
    }, signal?: AbortSignal) =>
      invoke<{ sessionId: SessionId; agentPreset?: string }>(
        'session/create',
        { request: payload },
        signal,
      ),
    prompt: (payload: {
      sessionId: SessionId
      mode: 'queue' | 'steer'
      content: readonly unknown[]
      requestId?: string
    }, signal?: AbortSignal) =>
      invoke<{ accepted: true }>('session/prompt', {
        request: {
          requestId: payload.requestId ?? randomUUID(),
          sessionId: payload.sessionId,
          mode: payload.mode,
          content: payload.content,
        },
      }, signal),
    cancel: (payload: { sessionId: SessionId }, signal?: AbortSignal) =>
      invoke<{ accepted: true }>('session/cancel', { request: payload }, signal),
    rename: (payload: { sessionId: SessionId; title: string }, signal?: AbortSignal) =>
      invoke<{ title: string; seq: number }>('session/rename', { request: payload }, signal),
    fork: (payload: { sessionId: SessionId }, signal?: AbortSignal) =>
      invoke<{ sessionId: SessionId }>('session/fork', { request: payload }, signal),
    selectModel: (payload: {
      sessionId: SessionId
      provider: string
      model: string
      reasoningEffort?: string
    }, signal?: AbortSignal) =>
      invoke<{ selected: { provider: string; model: string; reasoningEffort?: string } }>(
        'session/selectModel',
        { request: payload },
        signal,
      ),
    models: (_payload: { sessionId: SessionId }, signal?: AbortSignal) =>
      invoke<ModelCatalog>('session/modelCatalog', {}, signal),
    modelCatalog: (signal?: AbortSignal) =>
      invoke<ModelCatalog>('session/modelCatalog', {}, signal),
  },
  workspace: {
    create: (payload: { path: string }, signal?: AbortSignal) =>
      invoke<{ workspace: WorkspaceView; created: boolean }>(
        'workspace/create',
        { request: payload },
        signal,
      ),
    rename: (payload: { workspaceId: WorkspaceId; title: string }, signal?: AbortSignal) =>
      invoke<{ workspace: WorkspaceView }>('workspace/rename', { request: payload }, signal),
    delete: (payload: { workspaceId: WorkspaceId }, signal?: AbortSignal) =>
      invoke<{ deleted: true }>('workspace/delete', { request: payload }, signal),
    archiveSession: (payload: { sessionId: SessionId }, signal?: AbortSignal) =>
      invoke<{ archivedSessionIds: readonly SessionId[] }>(
        'workspace/archiveSession',
        { request: payload },
        signal,
      ),
    insertSessionBefore: (payload: {
      workspaceId: WorkspaceId
      sessionId: SessionId
      beforeSessionId?: SessionId
    }, signal?: AbortSignal) =>
      invoke<{ workspace: WorkspaceView }>('workspace/insertSessionBefore', { request: payload }, signal),
  },
  commands: {
    list: (payload: { sessionId: SessionId }, signal?: AbortSignal) =>
      invoke<readonly unknown[]>('commands/list', { agentId: payload.sessionId }, signal),
    execute: (payload: {
      sessionId: SessionId
      line: string
      images?: readonly EncodedImageAttachment[]
    }, signal?: AbortSignal) =>
      invoke<{ commandId?: string; matched?: boolean; result?: { kind: string; text?: string } }>(
        'commands/execute',
        {
          agentId: payload.sessionId,
          line: payload.line,
          images: payload.images ?? [],
        },
        signal,
      ),
  },
  agentPresets: {
    list: (_payload: Record<string, never> = {}, signal?: AbortSignal) =>
      invoke<{ presets: readonly unknown[]; authorable: boolean }>('agentPresets/list', {}, signal),
  },
  settings: {
    describe: (signal?: AbortSignal) =>
      invoke<{
        namespaces: readonly {
          ns: string
          value: unknown
          revision: number
        }[]
        writable: boolean
      }>('settings/describe', {}, signal),
    update: (payload: {
      ns: string
      patch: Record<string, JsonValue>
      expectedRevision?: number
    }, signal?: AbortSignal) =>
      invoke<unknown>('settings/update', {
        ns: payload.ns,
        patch: payload.patch,
        expectedRevision: payload.expectedRevision,
      }, signal),
  },
  pluginInventory: {
    list: (signal?: AbortSignal) =>
      invoke<PluginInventorySnapshot>('pluginInventory/list', {}, signal),
  },
  host: {
    listDirectory: (payload: { path?: string } | undefined, signal?: AbortSignal) =>
      invoke<DirectoryListing>('directoryPicker/list', { path: payload?.path }, signal),
    createDirectory: (payload: { path: string; name: string }, signal?: AbortSignal) =>
      invoke<{ path: string }>('directoryPicker/createDirectory', payload, signal),
  },
}
