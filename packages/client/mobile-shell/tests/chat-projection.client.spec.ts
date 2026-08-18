import { describe, expect, it, vi, afterEach } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-client-connection/client'

import { applyMuxEvent, rowsFromHistory } from '../src/client/chat-projection.ts'

function userMessage(seq: number, text: string): SessionEvent {
  return {
    type: 'user/message',
    seq,
    time: seq,
    data: { content: [{ type: 'text', text }] },
  } as unknown as SessionEvent
}

function toolCall(callId: string, name: string): SessionEvent {
  return {
    type: 'tool/call',
    seq: 10,
    time: 10,
    data: { turn: 1, step: 0, callId, name, arguments: '{}' },
  } as unknown as SessionEvent
}

function toolResult(callId: string, failed = false): SessionEvent {
  return {
    type: 'tool/result',
    seq: 11,
    time: 11,
    data: {
      turn: 1,
      step: 0,
      message: {
        id: 'msg-1',
        role: 'tool',
        content: [{ type: 'tool-result', toolCallId: callId, isError: failed, content: [] }],
      },
      error: failed ? { name: 'ToolError', code: 'tool_failed' } : undefined,
    },
  } as unknown as SessionEvent
}

describe('rowsFromHistory', () => {
  it('projects tool call and result into status rows', () => {
    const rows = rowsFromHistory([
      { event: userMessage(1, 'run tool') },
      { event: toolCall('c1', 'Read') },
      { event: toolResult('c1') },
    ])
    expect(rows.map(row => row.text)).toEqual([
      'run tool',
      '正在调用 Read…',
      '工具调用完成',
    ])
    expect(rows.every(row => row.role !== 'assistant' || row.streaming !== true)).toBe(true)
  })

  it('marks failed tool results', () => {
    const rows = rowsFromHistory([{ event: toolResult('c2', true) }])
    expect(rows[0]?.text).toBe('工具调用失败：tool_failed')
  })
})

describe('applyMuxEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ignores frames for other sessions', () => {
    const rows = applyMuxEvent([], 'sess-a' as never, {
      type: 'session/event',
      sessionId: 'sess-b' as never,
      event: userMessage(1, 'other'),
    })
    expect(rows).toEqual([])
  })

  it('accumulates assistant chunk text for the active session', () => {
    const sessionId = 'sess-a' as never
    const frame = {
      type: 'session/event' as const,
      sessionId,
      event: {
        type: 'assistant/chunk',
        seq: 2,
        time: 2,
        data: { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: 'hi' } },
      } as unknown as SessionEvent,
    }
    let rows = applyMuxEvent([], sessionId, frame)
    rows = applyMuxEvent(rows, sessionId, {
      ...frame,
      event: {
        ...frame.event,
        data: { ...frame.event.data, chunk: { type: 'text-delta', index: 0, text: ' there' } },
      } as unknown as SessionEvent,
    })
    expect(rows).toEqual([
      { id: 'streaming:1:0', role: 'assistant', text: 'hi there', streaming: true },
    ])
  })
})
