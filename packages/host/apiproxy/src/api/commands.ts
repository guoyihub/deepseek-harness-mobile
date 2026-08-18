/**
 * commands domain contract: catalog plus execute, addressed by session.
 * `command.execute` is the PC slash-menu path: the host runs the registry
 * handler and logs `command/run`/`command/done` without a model turn.
 * A lone `/` text prompt on `session.prompt` still intercepts the same way.
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RpcRequest, RpcResponse } from './rpc.ts'

/** One slash-command row returned by command.list. */
export interface CommandEntry {
  /** Lowercase command name without the leading slash. */
  readonly name: string
  /** Human-readable summary used in discovery UI. */
  readonly description: string
  /** Optional free-form input hint advertised to capable clients. */
  readonly input?: { readonly hint: string }
}

/** Handler outcome carried on a matched `command.execute` admission. */
export type CommandExecuteResult =
  | { readonly kind: 'success'; readonly text?: string }
  | { readonly kind: 'error'; readonly text: string }

/**
 * Admission result of `command.execute`.
 * Unmatched syntax or unknown name: `matched: false` and no lifecycle events.
 * A matched handler always returns `matched: true` with the pairing id; the
 * handler's own success/error stays in `result` (same as the Typert remote).
 */
export type CommandExecuteValue =
  | { readonly matched: false }
  | { readonly matched: true; readonly commandId: string; readonly result: CommandExecuteResult }

/** Command-domain unary methods (the map key command.* of RpcMethodMap). */
export interface CommandsApi {
  /** Lists the slash-command catalog for the session's agent. */
  list(request: RpcRequest<{ sessionId: SessionId }>): Promise<RpcResponse<{ commands: readonly CommandEntry[] }>>
  /**
   * Run one slash-command line against the session's agent.
   * The carrier passes the request AbortSignal; compact and similar handlers
   * may outlive the default unary deadline.
   */
  execute(
    request: RpcRequest<{ sessionId: SessionId; line: string }>,
    signal: AbortSignal,
  ): Promise<RpcResponse<CommandExecuteValue>>
}
