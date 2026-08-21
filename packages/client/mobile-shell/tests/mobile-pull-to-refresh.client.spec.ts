import { describe, expect, it } from 'vitest'
import {
  computePullOffset,
  MOBILE_PULL_REFRESH_MAX_PX,
  MOBILE_PULL_REFRESH_THRESHOLD_PX,
  shouldTriggerRefresh,
} from '../src/client/mobile-pull-to-refresh.ts'

describe('mobile pull-to-refresh math', () => {
  it('applies resistance and caps visible travel', () => {
    expect(computePullOffset(0)).toBe(0)
    expect(computePullOffset(100)).toBe(45)
    expect(computePullOffset(1000)).toBe(MOBILE_PULL_REFRESH_MAX_PX)
  })

  it('commits refresh at the configured threshold', () => {
    expect(shouldTriggerRefresh(MOBILE_PULL_REFRESH_THRESHOLD_PX - 1)).toBe(false)
    expect(shouldTriggerRefresh(MOBILE_PULL_REFRESH_THRESHOLD_PX)).toBe(true)
  })
})
