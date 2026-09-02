import { describe, expect, it } from 'vitest'
import type { ConversationTimelineSnapshot, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'
import {
  deriveAgentWorkingFromSnapshot,
  latestOpenTurnStartTime,
} from '../src/client/chat-projection.ts'

function turn(status: TurnLocation['status'], time?: number): TurnLocation {
  return {
    turn: 1,
    start: time === undefined ? undefined : { time } as TurnLocation['start'],
    end: status === 'closed' ? { time: (time ?? 0) + 1 } as TurnLocation['end'] : undefined,
    status,
    steps: [],
    data: { get: () => undefined },
  }
}

function timelineOf(...rows: readonly TurnLocation[]): ConversationTimelineSnapshot {
  return {
    turnOrder: rows.map(row => row.turn),
    turns: new Map(rows.map(row => [row.turn, row])),
  }
}

describe('latestOpenTurnStartTime', () => {
  it('returns the open turn start and ignores a closed turn', () => {
    expect(latestOpenTurnStartTime(timelineOf(turn('open', 1_700)))).toBe(1_700)
    expect(latestOpenTurnStartTime(timelineOf(turn('closed', 1_700)))).toBeNull()
  })
})

describe('deriveAgentWorkingFromSnapshot', () => {
  it('ignores a late session-list running bit after the turn has closed', () => {
    const snapshot = {
      chat: { ...EMPTY_CHAT_SNAPSHOT, timeline: timelineOf(turn('closed', 1_700)) },
      running: true,
    }
    expect(deriveAgentWorkingFromSnapshot(true, snapshot, false)).toBe(false)
  })

  it('treats an open turn as working even when the list running bit is still false', () => {
    const snapshot = {
      chat: { ...EMPTY_CHAT_SNAPSHOT, timeline: timelineOf(turn('open', 1_700)) },
      running: false,
    }
    expect(deriveAgentWorkingFromSnapshot(false, snapshot, false)).toBe(true)
  })

  it('trusts the list running bit only before any turn is folded', () => {
    const snapshot = { chat: EMPTY_CHAT_SNAPSHOT, running: true }
    expect(deriveAgentWorkingFromSnapshot(true, snapshot, false)).toBe(true)
    expect(deriveAgentWorkingFromSnapshot(false, { chat: EMPTY_CHAT_SNAPSHOT, running: false }, false)).toBe(false)
  })
})
