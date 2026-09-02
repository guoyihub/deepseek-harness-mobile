import { describe, expect, it } from 'vitest'
import type { SessionStatsProjection } from '@deepseek-ai/dsh-session-stats/client'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import {
  buildStatsDetails,
  buildStatsGroups,
  formatStatsDuration,
} from '../src/client/mobile-stats-format.ts'

const t = (key: string, params?: Record<string, string | number>): string => {
  if (params === undefined) return key
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    key,
  )
}

describe('mobile stats format', () => {
  it('formats compact durations', () => {
    expect(formatStatsDuration(45_200, t)).toBe('duration.compactSeconds')
    expect(formatStatsDuration(162_000, t)).toContain('duration.compactMinutes')
  })

  it('builds expandable duration details from sessionStats', () => {
    const usage: TokenUsageProjection = {
      uncachedInputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 50,
      cacheWriteTokens: 0,
    }
    expect(buildStatsGroups(usage, t).length).toBeGreaterThan(0)
    const stats: SessionStatsProjection = {
      turns: 2,
      steps: 3,
      llmMs: 12_000,
      toolMs: 1_000,
      ttftMs: 900,
      ttftSteps: 3,
      decodeMs: 2_000,
      decodeTokens: 40,
    }
    const details = buildStatsDetails(stats, t)
    expect(details[0]).toContain('stats.counts')
    expect(details.join(' ')).toContain('stats.llm')
  })
})
