// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SessionStatsProjection } from '@deepseek-ai/dsh-session-stats/client'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import { MobileStatsLine } from '../src/client/MobileStatsLine.tsx'

describe('MobileStatsLine', () => {
  it('expands duration details from sessionStats', () => {
    const tokenUsage: TokenUsageProjection = {
      uncachedInputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }
    const sessionStats: SessionStatsProjection = {
      turns: 1,
      steps: 2,
      llmMs: 5_000,
      toolMs: 0,
      ttftMs: 0,
      ttftSteps: 0,
      decodeMs: 0,
      decodeTokens: 0,
    }
    render(<MobileStatsLine tokenUsage={tokenUsage} sessionStats={sessionStats} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('region', { name: '会话统计详情' })).toBeTruthy()
    expect(screen.getByText(/LLM /)).toBeTruthy()
  })
})
