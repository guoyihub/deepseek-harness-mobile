/** Session follow owns live inbox; the former mux buffer is unused. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Former mux-owned frames now arrive through Session follow/control. */
export function isMobileSessionRoutedFrame(_frame: unknown): boolean {
  return false
}

/**
 * @param _sessionId - unused.
 * @param _session - unused.
 */
export function registerMobileSession(_sessionId: SessionId, _session: unknown): void {}

/** @param _sessionId - unused. */
export function unregisterMobileSession(_sessionId: SessionId): void {}

/**
 * @param _sessionId - unused.
 * @param _envelope - unused.
 */
export function routeMobileMuxEnvelope(_sessionId: SessionId, _envelope: unknown): void {}
