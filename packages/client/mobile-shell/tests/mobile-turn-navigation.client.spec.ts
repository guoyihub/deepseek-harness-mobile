import { describe, expect, it } from 'vitest'
import { SessionSeq } from '@deepseek-ai/dsh-session/types'
import type { TurnRailItem } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/turn-rail-items.ts'
import { visibleTurnWindow } from '../src/client/mobile-turn-navigation.ts'

function loaded(turn: number): TurnRailItem {
  return {
    turn,
    anchor: { kind: 'loaded', key: `user:${turn}` },
    prompt: `prompt ${turn}`,
    response: '',
  }
}

function unloaded(turn: number): TurnRailItem {
  return {
    turn,
    anchor: { kind: 'unloaded', seq: SessionSeq(turn * 10) },
    prompt: `prompt ${turn}`,
    response: '',
  }
}

describe('visibleTurnWindow', () => {
  it('returns every loaded turn when three or fewer are navigable', () => {
    expect(visibleTurnWindow([loaded(1), loaded(2)], 1)).toEqual([loaded(1), loaded(2)])
  })

  it('shows the first turn plus the next two at the start', () => {
    expect(visibleTurnWindow([loaded(1), loaded(2), loaded(3), loaded(4)], 1)).toEqual([
      loaded(1),
      loaded(2),
      loaded(3),
    ])
  })

  it('shows the previous, current, and next turn in the middle', () => {
    expect(visibleTurnWindow([loaded(1), loaded(2), loaded(3), loaded(4), loaded(5)], 3)).toEqual([
      loaded(2),
      loaded(3),
      loaded(4),
    ])
  })

  it('shows the last three turns at the end', () => {
    expect(visibleTurnWindow([loaded(1), loaded(2), loaded(3), loaded(4), loaded(5)], 5)).toEqual([
      loaded(3),
      loaded(4),
      loaded(5),
    ])
  })

  it('includes unloaded turns in the window', () => {
    expect(visibleTurnWindow([loaded(1), loaded(2), loaded(3), unloaded(4)], 3)).toEqual([
      loaded(2),
      loaded(3),
      unloaded(4),
    ])
  })
})
