/** Minimal chat row projection from Host history and mux session events. */

import type { ContentBlock, HistoryEntry, MuxFrame, SessionEvent, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { AssistantBlock, RunningToolCall, ToolCallBlock, ToolResultNode } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/conversation.ts'
import type { ContextProvenanceView, KnownContextForm } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/context-provenance.ts'
import { contextForm, contextProvenance } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/context-provenance.ts'
import { toAssistantBlock, toAssistantBlocks } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/conversation.ts'
import { emptyAssistantBlock } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/partial.ts'
import type { StreamChunk } from '@deepseek-ai/dsh-llm/types'

interface ChatRowBase {
  /** Stable row key for React reconciliation. */
  id: string
}

/** One user prompt bubble. */
export interface UserChatRow extends ChatRowBase {
  role: 'user'
  text: string
}

/** Transient status line for turn/tool activity. */
export interface StatusChatRow extends ChatRowBase {
  role: 'status'
  text: string
}

/** One logged non-user context injection. */
export interface ContextChatRow extends ChatRowBase {
  role: 'context'
  content: readonly ContentBlock[]
  source: unknown
  provenance: ContextProvenanceView
  form: KnownContextForm | null
}

/** One assistant answer with classified blocks. */
export interface AssistantChatRow extends ChatRowBase {
  role: 'assistant'
  blocks: readonly AssistantBlock[]
  streaming?: boolean
  /** Sparse accumulator while assistant/chunk events are in flight. */
  partialBlocks?: (AssistantBlock | undefined)[]
}

/** One tool call row paired from tool/call and tool/result events. */
export interface ToolChatRow extends ChatRowBase {
  role: 'tool'
  /** Wire tool name from the paired tool/call event. */
  name: string
  /** Running or settled call slice for row-model derivation. */
  block: ToolCallBlock
}

/** Slash-command lifecycle folded from command/run and command/done. */
export interface CommandChatRow extends ChatRowBase {
  role: 'command'
  commandId: string
  name: string | null
  outcome: { kind: 'success' | 'error'; text?: string } | null
}

/** One rendered chat row in the mobile conversation surface. */
export type ChatRow =
  | UserChatRow
  | StatusChatRow
  | ContextChatRow
  | AssistantChatRow
  | ToolChatRow
  | CommandChatRow

function isUserSource(source: unknown): boolean {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) return false
  return (source as { kind?: unknown }).kind === 'user'
}

function textFromUserContent(content: readonly ContentBlock[]): string {
  return content
    .filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()
}

function compactBlocks(blocks: readonly (AssistantBlock | undefined)[]): AssistantBlock[] {
  return blocks.filter((block): block is AssistantBlock => block !== undefined)
}

function applyAssistantChunk(
  partialBlocks: (AssistantBlock | undefined)[],
  chunk: StreamChunk,
): (AssistantBlock | undefined)[] {
  const blocks = [...partialBlocks]
  switch (chunk.type) {
    case 'block-start':
      blocks[chunk.index] = emptyAssistantBlock(chunk.blockType)
      return blocks
    case 'text-delta': {
      const previous = blocks[chunk.index]
      blocks[chunk.index] = { kind: 'text', text: (previous?.kind === 'text' ? previous.text : '') + chunk.text }
      return blocks
    }
    case 'reasoning-delta': {
      const previous = blocks[chunk.index]
      blocks[chunk.index] = {
        kind: 'reasoning',
        text: (previous?.kind === 'reasoning' ? previous.text : '') + chunk.text,
      }
      return blocks
    }
    case 'tool-call-delta': {
      const previous = blocks[chunk.index]
      const base = previous?.kind === 'tool-call'
        ? previous
        : { kind: 'tool-call' as const, callId: '', name: '', argsRaw: '' }
      blocks[chunk.index] = {
        kind: 'tool-call',
        callId: base.callId || String(chunk.id),
        name: chunk.name ?? base.name,
        argsRaw: base.argsRaw + chunk.argumentsDelta,
      }
      return blocks
    }
    case 'block-end':
      blocks[chunk.index] = toAssistantBlock(chunk.block)
      return blocks
    default:
      return blocks
  }
}

function streamingId(turn: number, step: number): string {
  return `streaming:${String(turn)}:${String(step)}`
}

function toolRowId(callId: string): string {
  return `tool:${callId}`
}

function runningToolFromCall(event: Extract<SessionEvent, { type: 'tool/call' }>): RunningToolCall {
  return {
    callId: String(event.data.callId),
    name: event.data.name,
    argsRaw: event.data.arguments,
    turn: event.data.turn,
    step: event.data.step,
    time: event.time,
    callView: null,
    subCalls: [],
  }
}

function callIdFromResult(event: Extract<SessionEvent, { type: 'tool/result' }>): string {
  const source = event.data.message.source
  if (typeof source === 'object' && source !== null && 'callId' in source) {
    return String((source as { callId: unknown }).callId)
  }
  const block = event.data.message.content[0]
  if (block?.type === 'tool-result') {
    return String(block.toolCallId)
  }
  return String(event.data.message.id)
}

function settledToolFromResult(
  event: Extract<SessionEvent, { type: 'tool/result' }>,
  previous?: RunningToolCall,
): ToolResultNode {
  const resultBlock = event.data.message.content[0]
  return {
    kind: 'tool-result',
    seq: event.seq,
    time: event.time,
    callId: callIdFromResult(event),
    call: previous === undefined ? null : { name: previous.name, argsRaw: previous.argsRaw },
    callTime: previous?.time ?? null,
    content: resultBlock?.type === 'tool-result' ? resultBlock.content : [],
    isError: event.data.error !== undefined || resultBlock?.isError === true,
    ...(event.data.error === undefined ? {} : { error: event.data.error }),
    callView: null,
    resultView: null,
    subCalls: [],
  }
}

function toolRowFromCall(event: Extract<SessionEvent, { type: 'tool/call' }>): ToolChatRow {
  const block = runningToolFromCall(event)
  return {
    id: toolRowId(block.callId),
    role: 'tool',
    name: block.name,
    block,
  }
}

function commandRowId(commandId: string): string {
  return `command:${commandId}`
}

function commandRowFromRun(event: Extract<SessionEvent, { type: 'command/run' }>): CommandChatRow {
  return {
    id: commandRowId(String(event.data.commandId)),
    role: 'command',
    commandId: String(event.data.commandId),
    name: event.data.name,
    outcome: null,
  }
}

function commandRowFromDone(
  rows: readonly ChatRow[],
  event: Extract<SessionEvent, { type: 'command/done' }>,
): CommandChatRow {
  const commandId = String(event.data.commandId)
  const existing = rows.find((row): row is CommandChatRow =>
    row.role === 'command' && row.commandId === commandId)
  const data = event.data
  return {
    id: commandRowId(commandId),
    role: 'command',
    commandId,
    name: existing?.name ?? null,
    outcome: {
      kind: data.kind,
      ...(data.text === undefined ? {} : { text: data.text }),
    },
  }
}

function toolRowFromResult(rows: readonly ChatRow[], event: Extract<SessionEvent, { type: 'tool/result' }>): ToolChatRow {
  const callId = callIdFromResult(event)
  const existing = rows.find((row): row is ToolChatRow => row.role === 'tool' && row.id === toolRowId(callId))
  const previous = existing !== undefined && !('kind' in existing.block) ? existing.block : undefined
  const block = settledToolFromResult(event, previous)
  return {
    id: toolRowId(callId),
    role: 'tool',
    name: previous?.name ?? existing?.name ?? block.call?.name ?? 'Tool',
    block,
  }
}

function rowFromEvent(event: SessionEvent): ChatRow | undefined {
  switch (event.type) {
    case 'user/message': {
      const { content, source } = event.data
      if (!isUserSource(source)) {
        return {
          id: `context:${String(event.seq)}`,
          role: 'context',
          content,
          source,
          provenance: contextProvenance(source),
          form: contextForm(source),
        }
      }
      const text = textFromUserContent(content)
      if (text === '') return undefined
      return { id: `user:${String(event.seq)}`, role: 'user', text }
    }
    case 'assistant/message': {
      const blocks = toAssistantBlocks(event.data.message.content)
      if (blocks.every(block => (block.kind === 'text' || block.kind === 'reasoning') && block.text.trim() === '')) {
        return undefined
      }
      return { id: `assistant:${event.data.message.id}`, role: 'assistant', blocks }
    }
    case 'assistant/chunk': {
      const chunk = event.data.chunk
      if (chunk.type === 'usage' || chunk.type === 'finish') return undefined
      const partialBlocks = applyAssistantChunk([], chunk)
      return {
        id: streamingId(event.data.turn, event.data.step),
        role: 'assistant',
        blocks: compactBlocks(partialBlocks),
        partialBlocks,
        streaming: true,
      }
    }
    case 'turn/start':
      return { id: `status:${String(event.seq)}`, role: 'status', text: 'Agent 正在工作…' }
    case 'turn/end':
      return undefined
    case 'tool/call':
      return toolRowFromCall(event)
    case 'tool/result':
      return undefined
    case 'command/run':
      return commandRowFromRun(event)
    case 'command/done':
      return undefined
    default:
      return undefined
  }
}

function applyCommandDone(rows: readonly ChatRow[], event: Extract<SessionEvent, { type: 'command/done' }>): ChatRow[] {
  return upsertRow(rows, commandRowFromDone(rows, event))
}

function clearStatusRows(rows: readonly ChatRow[]): ChatRow[] {
  return rows.filter(row => row.role !== 'status')
}

function hasRunningTool(rows: readonly ChatRow[]): boolean {
  return rows.some(row => row.role === 'tool' && !('kind' in row.block))
}

function hasStreamingAssistant(rows: readonly ChatRow[]): boolean {
  return rows.some(row => row.role === 'assistant' && row.streaming === true)
}

/**
 * Derive whether the composer should expose stop for the active session.
 * @param running - host session.list running flag for the active session.
 * @param rows - current chat projection rows.
 * @param sending - whether a prompt submission is still in flight locally.
 */
export function deriveAgentWorking(
  running: boolean,
  rows: readonly ChatRow[],
  sending: boolean,
): boolean {
  if (sending) return true
  if (running) return true
  return hasRunningTool(rows) || hasStreamingAssistant(rows)
}

/** Prefix for composer-optimistic user rows pending a matching mux event. */
export const OPTIMISTIC_USER_PREFIX = 'optimistic:'

/**
 * Drop the oldest optimistic user bubble that matches the confirmed text.
 * @param rows - current chat rows.
 * @param text - confirmed user message text from the Host.
 */
export function dropMatchingOptimisticUser(
  rows: readonly ChatRow[],
  text: string,
): ChatRow[] {
  let dropped = false
  return rows.filter((row) => {
    if (dropped) return true
    if (
      row.role === 'user'
      && row.id.startsWith(OPTIMISTIC_USER_PREFIX)
      && row.text === text
    ) {
      dropped = true
      return false
    }
    return true
  })
}

function upsertRow(rows: readonly ChatRow[], row: ChatRow): ChatRow[] {
  const index = rows.findIndex(candidate => candidate.id === row.id)
  if (index < 0) return [...rows, row]
  const next = [...rows]
  next[index] = row
  return next
}

function finalizeStreaming(rows: readonly ChatRow[], turn: number, step: number): ChatRow[] {
  const streamId = streamingId(turn, step)
  return rows.filter(row => row.id !== streamId)
}

/**
 * Build chat rows from one history page.
 * @param entries - host history entries in log order.
 */
export function rowsFromHistory(entries: readonly HistoryEntry[]): ChatRow[] {
  let rows: ChatRow[] = []
  for (const entry of entries) {
    if (entry.event.type === 'turn/end') {
      rows = clearStatusRows(rows)
      continue
    }
    if (entry.event.type === 'tool/result') {
      rows = upsertRow(rows, toolRowFromResult(rows, entry.event))
      continue
    }
    if (entry.event.type === 'command/done') {
      rows = applyCommandDone(rows, entry.event)
      continue
    }
    const row = rowFromEvent(entry.event)
    if (row === undefined) continue
    if (entry.event.type === 'assistant/message') {
      rows = finalizeStreaming(rows, entry.event.data.turn, entry.event.data.step)
    }
    rows = upsertRow(rows, row)
  }
  return rows
}

/**
 * Apply one mux session event to the current chat projection.
 * @param rows - current rows.
 * @param sessionId - active chat session id.
 * @param frame - mux frame from the connection pump.
 */
export function applyMuxEvent(
  rows: readonly ChatRow[],
  sessionId: SessionId,
  frame: MuxFrame,
): ChatRow[] {
  if (frame.type !== 'session/event' || frame.sessionId !== sessionId) return [...rows]
  const event = frame.event
  if (event.type === 'turn/end') {
    return clearStatusRows(rows)
  }
  if (event.type === 'tool/result') {
    return upsertRow(rows, toolRowFromResult(rows, event))
  }
  if (event.type === 'command/done') {
    return applyCommandDone(rows, event)
  }
  if (event.type === 'assistant/chunk') {
    const chunk = event.data.chunk
    if (chunk.type === 'usage' || chunk.type === 'finish') return [...rows]
    const streamId = streamingId(event.data.turn, event.data.step)
    const existing = rows.find(candidate => candidate.id === streamId)
    const partialBlocks = applyAssistantChunk(
      existing?.role === 'assistant'
        ? [...(existing.partialBlocks ?? existing.blocks)]
        : [],
      chunk,
    )
    const row: AssistantChatRow = {
      id: streamId,
      role: 'assistant',
      blocks: compactBlocks(partialBlocks),
      partialBlocks,
      streaming: true,
    }
    return upsertRow(rows, row)
  }
  const row = rowFromEvent(event)
  if (row === undefined) return [...rows]
  let next = [...rows]
  if (event.type === 'assistant/message') {
    next = finalizeStreaming(next, event.data.turn, event.data.step)
  }
  if (row.role === 'user') {
    next = dropMatchingOptimisticUser(next, row.text)
  }
  return upsertRow(next, row)
}
