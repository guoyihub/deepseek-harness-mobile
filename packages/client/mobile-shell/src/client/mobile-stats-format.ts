import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { SessionStatsProjection } from '@deepseek-ai/dsh-session-stats/client'
import { formatTokensPerSecond } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/message-chrome.ts'

type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * Compact token count: 517 / 12.2K / 517K / 1.2M (one decimal under three digits).
 * @param n - token count.
 * @returns display string.
 */
export function formatTokens(n: number): string {
  const scaled = (v: number): string =>
    v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)
  if (n < 1_000) return String(n)
  if (n < 1_000_000) return `${scaled(n / 1_000)}K`
  return `${scaled(n / 1_000_000)}M`
}

/**
 * Compact duration: 45.2s under a minute, 2m42s from there on.
 * @param ms - duration in milliseconds.
 * @param t - locale resolver.
 * @returns display string.
 */
export function formatStatsDuration(ms: number, t: Translate): string {
  const s = ms / 1_000
  if (s < 60) return t('duration.compactSeconds', { seconds: Math.round(s * 10) / 10 })
  const whole = Math.round(s)
  return t('duration.compactMinutes', {
    minutes: Math.floor(whole / 60),
    seconds: whole % 60,
  })
}

/**
 * Sum the three disjoint prompt-side billing buckets.
 * @param usage - the session's token-usage projection value.
 * @returns billed input tokens.
 */
export function billedInputTokens(usage: TokenUsageProjection): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

/**
 * Cache-hit share of prompt-side input over the whole durable log.
 * @param usage - the session's token-usage projection value.
 * @returns rounded integer percent, or null when no input was billed.
 */
export function cacheHitPercent(usage: TokenUsageProjection): number | null {
  const denominator = billedInputTokens(usage)
  return denominator === 0
    ? null
    : Math.round(usage.cacheReadTokens / denominator * 100)
}

/**
 * Build the mobile composer stats groups: cache hit and token totals only.
 * @param usage - token usage projection, when present.
 * @param t - locale resolver for stats strings.
 * @returns groups joined with ` | ` for display.
 */
export function buildStatsGroups(
  usage: TokenUsageProjection | undefined,
  t: Translate,
): string[] {
  if (usage === undefined || (billedInputTokens(usage) === 0 && usage.outputTokens === 0)) {
    return []
  }
  const groups: string[] = []
  const cacheHit = cacheHitPercent(usage)
  if (cacheHit !== null) groups.push(t('stats.cacheHit', { percent: cacheHit }))
  groups.push(t('stats.tokens', {
    input: formatTokens(billedInputTokens(usage)),
    output: formatTokens(usage.outputTokens),
  }))
  return groups
}

/**
 * Duration and throughput lines for the expandable stats sheet.
 * @param stats - whole-log sessionStats projection.
 * @param t - locale resolver.
 * @returns detail groups; empty when the projection is absent or unused.
 */
export function buildStatsDetails(
  stats: SessionStatsProjection | undefined,
  t: Translate,
): string[] {
  if (stats === undefined || stats.steps === 0) return []
  const groups: string[] = [t('stats.counts', { turns: stats.turns, steps: stats.steps })]
  const durations: string[] = []
  if (stats.llmMs > 0) durations.push(t('stats.llm', { duration: formatStatsDuration(stats.llmMs, t) }))
  if (stats.toolMs > 0) durations.push(t('stats.toolCall', { duration: formatStatsDuration(stats.toolMs, t) }))
  if (durations.length > 0) groups.push(durations.join(' · '))
  const speeds: string[] = []
  if (stats.ttftSteps > 0) {
    speeds.push(t('stats.ttftAverage', {
      duration: formatStatsDuration(stats.ttftMs / stats.ttftSteps, t),
    }))
  }
  if (stats.decodeMs > 0) {
    speeds.push(t('stats.tokensPerSecond', {
      throughput: formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1_000)),
    }))
  }
  if (speeds.length > 0) groups.push(speeds.join(' · '))
  return groups
}
