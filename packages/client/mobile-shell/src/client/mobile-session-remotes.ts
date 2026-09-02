/** SessionRemotes over the mobile PWA Connection RPC and Remote stream mux. */

import type { ClientConnectionRpc, ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import {
  RemoteStream,
  RemoteStreamMuxClient,
  type RemoteStreamOptions,
} from '@deepseek-ai/dsh-api-gateway/client'
import type { SessionRemotes } from '@deepseek-ai/dsh-api-session-controller/src/client/sessions/remotes.ts'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { transportError } from '@deepseek-ai/dsh-client-connection/client'

function asRemoteResult<T>(value: unknown): RemoteResult<T> {
  const result = value as RemoteResult<T>
  if (typeof result === 'object' && result !== null && 'ok' in result) return result
  return transportError(new Error('mobile session remote: unexpected RPC result')) as RemoteResult<T>
}

/**
 * Build Session object-layer remotes over unary RPC plus the Gateway mux.
 * @param rpc - browser Connection unary caller.
 * @param streams - physical Remote stream mux.
 * @param generation - Host generation source used to pace stream retries.
 */
export function createMobileSessionRemotes(
  rpc: ClientConnectionRpc,
  streams: RemoteStreamMuxClient,
  generation: Pick<ConnectionHandle, 'generation'>,
): SessionRemotes {
  const call = async <T>(
    endpoint: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<RemoteResult<T>> => {
    try {
      return asRemoteResult(await rpc.call('/api', endpoint, { args }, signal))
    } catch (error) {
      return transportError(error) as RemoteResult<T>
    }
  }
  return {
    $stream: <Item>(options: RemoteStreamOptions<Item>) => new RemoteStream(generation, options),
    commands: {
      execute: (agentId, line, images, signal) => call('commands/execute', { agentId, line, images }, signal),
    },
    session: {
      list: (request, signal) => call('session/list', { _request: request }, signal),
      search: (request, signal) => call('session/search', { request }, signal),
      create: request => call('session/create', { request }),
      selectModel: request => call('session/selectModel', { request }),
      rename: request => call('session/rename', { request }),
      fork: request => call('session/fork', { request }),
      prompt: (request, signal) => call('session/prompt', { request }, signal),
      attachment: request => call('session/attachment', { request }),
      updateQueue: request => call('session/updateQueue', { request }),
      cancel: request => call('session/cancel', { request }),
      openWorkspacePath: request => call('session/openWorkspacePath', { request }),
      canOpenWorkspacePath: () => call('session/canOpenWorkspacePath', {}),
      modelCatalog: () => call('session/modelCatalog', {}),
      page: (request, signal) => call('session/page', { request }, signal),
      follow: (request, signal) => streams.open(
        'session/follow',
        { args: { request } },
        signal ?? new AbortController().signal,
      ) as never,
      control: signal => streams.open(
        'session/control',
        { args: {} },
        signal ?? new AbortController().signal,
      ) as never,
    } as SessionRemotes['session'],
    subagents: {
      list: (parentSessionId, signal) => call('subagents/list', { agentId: parentSessionId }, signal),
      prompt: (request, signal) => call('subagents/prompt', { request }, signal),
      interruptByParent: (childSessionId, parentSessionId, mode) => call('subagents/interruptByParent', {
        childSessionId,
        parentSessionId,
        mode,
      }),
    },
  }
}
