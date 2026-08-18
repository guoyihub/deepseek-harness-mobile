/** Minimal chat row projection from Host history and mux session events. */

import type { ContentBlock, HistoryEntry, MuxFrame, SessionEvent, SessionId } from '@deepseek-ai/dsh-client-connection/client'

/** One rendered chat row in the mobile conversation surface. */
export interface ChatRow {
  /** Stable row key for React reconciliation. */
  id: string
  /** Message role or transient status line. */
  role: 'user' | 'assistant' | 'status'
  /** Plain or markdown body text. */
  text: string
  /** True while assistant text is still streaming. */
  streaming?: boolean
}

function textFromContent(content: readonly ContentBlock[]): string {
  return content
    .map(block => (block.type === 'text' ? block.text : `[${block.type}]`))
    .join('')
    .trim()
}

function streamingId(turn: number, step: number): string {
  return `streaming:${String(turn)}:${String(step)}`
}

function rowFromEvent(event: SessionEvent): ChatRow | undefined {
  switch (event.type) {
    case 'user/message': {
      const text = textFromContent(event.data.content)
      if (text === '') return undefined
      return { id: `user:${String(event.seq)}`, role: 'user', text }
    }
    case 'assistant/message': {
      const text = textFromContent(event.data.message.content)
      if (text === '') return undefined
      return { id: `assistant:${event.data.message.id}`, role: 'assistant', text }
    }
    case 'assistant/chunk': {
      const chunk = event.data.chunk
      if (chunk.type !== 'text-delta' || chunk.text === '') return undefined
      return {
        id: streamingId(event.data.turn, event.data.step),
        role: 'assistant',
        text: chunk.text,
        streaming: true,
      }
    }
    case 'turn/start':
      return { id: `status:${String(event.seq)}`, role: 'status', text: 'Agent 正在工作…' }
    case 'tool/call':
      return {
        id: `tool-call:${event.data.callId}`,
        role: 'status',
        text: `正在调用 ${event.data.name}…`,
      }
    case 'tool/result': {
      const block = event.data.message.content[0]
      const callId = block?.toolCallId ?? event.data.message.id
      const failed = event.data.error !== undefined || block?.isError === true
      return {
        id: `tool-result:${String(callId)}`,
        role: 'status',
        text: failed
          ? `工具调用失败：${event.data.error?.code ?? 'error'}`
          : '工具调用完成',
      }
    }
    default:
      return undefined
  }
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
  const row = rowFromEvent(frame.event)
  if (row === undefined) return [...rows]
  let next = [...rows]
  if (frame.event.type === 'assistant/chunk') {
    const existing = next.find(candidate => candidate.id === row.id)
    if (existing !== undefined) {
      row.text = existing.text + row.text
    }
  }
  if (frame.event.type === 'assistant/message') {
    next = finalizeStreaming(next, frame.event.data.turn, frame.event.data.step)
  }
  if (frame.event.type === 'assistant/chunk') {
    return upsertRow(next, { ...row, streaming: true })
  }
  return upsertRow(next, row)
}
