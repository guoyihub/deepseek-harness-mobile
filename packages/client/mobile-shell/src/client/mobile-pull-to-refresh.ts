/** Shared pull-to-refresh motion and threshold constants for the mobile shell. */

/** Indicator snap/enter duration; matches task-home motion. */
export const MOBILE_PULL_REFRESH_MOTION_MS = 320

/** Rubber-band resistance applied to finger travel. */
export const MOBILE_PULL_REFRESH_RESISTANCE = 0.45

/** Visible pull distance that triggers refresh. */
export const MOBILE_PULL_REFRESH_THRESHOLD_PX = 64

/** Maximum visible pull indicator travel. */
export const MOBILE_PULL_REFRESH_MAX_PX = 96

/** Indicator slot height while refresh is in flight. */
export const MOBILE_PULL_REFRESH_ACTIVE_PX = 52

/**
 * Map raw downward finger travel to the visible pull offset.
 * @param rawDeltaPx - downward touch delta from the scroll top.
 */
export function computePullOffset(rawDeltaPx: number): number {
  if (rawDeltaPx <= 0) return 0
  return Math.min(rawDeltaPx * MOBILE_PULL_REFRESH_RESISTANCE, MOBILE_PULL_REFRESH_MAX_PX)
}

/**
 * Whether the visible pull offset should commit refresh on release.
 * @param offsetPx - resisted pull offset.
 */
export function shouldTriggerRefresh(offsetPx: number): boolean {
  return offsetPx >= MOBILE_PULL_REFRESH_THRESHOLD_PX
}
