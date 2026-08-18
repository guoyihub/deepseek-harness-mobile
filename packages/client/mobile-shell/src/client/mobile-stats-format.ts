import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'

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
  t: (key: string, params?: Record<string, string | number>) => string,
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
