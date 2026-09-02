import { describe, expect, it } from 'vitest'
import type { TurnNavigationItem } from '@deepseek-ai/dsh-client-ui-chat/client'
import { visibleTurnWindow } from '../src/client/mobile-turn-navigation.ts'

function item(turn: number): TurnNavigationItem {
  return {
    turn,
    anchorKey: `user:${turn}`,
    prompt: `prompt ${turn}`,
    response: '',
  }
}

describe('visibleTurnWindow', () => {
  it('returns every loaded turn when three or fewer are navigable', () => {
    expect(visibleTurnWindow([item(1), item(2)], 1)).toEqual([item(1), item(2)])
  })

  it('shows the first turn plus the next two at the start', () => {
    expect(visibleTurnWindow([item(1), item(2), item(3), item(4)], 1)).toEqual([
      item(1),
      item(2),
      item(3),
    ])
  })

  it('shows the previous, current, and next turn in the middle', () => {
    expect(visibleTurnWindow([item(1), item(2), item(3), item(4), item(5)], 3)).toEqual([
      item(2),
      item(3),
      item(4),
    ])
  })

  it('shows the last three turns at the end', () => {
    expect(visibleTurnWindow([item(1), item(2), item(3), item(4), item(5)], 5)).toEqual([
      item(3),
      item(4),
      item(5),
    ])
  })

  it('ignores turns without anchors', () => {
    const pending = { ...item(4), anchorKey: '' }
    expect(visibleTurnWindow([item(1), item(2), item(3), pending], 3)).toEqual([
      item(1),
      item(2),
      item(3),
    ])
  })
})
