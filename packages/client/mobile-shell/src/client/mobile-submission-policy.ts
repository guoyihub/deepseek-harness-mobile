/** Composer submission policy for the mobile PWA. */

import {
  ComposerSubmissionPolicy,
  DEFAULT_BUSY_ENTER_BEHAVIOR,
} from '@deepseek-ai/dsh-client-ui-conversation/src/client/input/submission-policy.ts'
import type { InputSubmitMode } from '@deepseek-ai/dsh-client-ui-conversation/src/client/contract/composer-submission.ts'
import { readMobileBusyEnter } from './mobile-busy-enter.ts'

const policy = new ComposerSubmissionPolicy()
policy.busyEnter.set(readMobileBusyEnter())

/**
 * Resolve one send mode from the current agent state.
 * @param running - whether the addressed session is busy.
 */
export function resolveMobileSubmitMode(running: boolean): InputSubmitMode {
  return policy.resolve(running, 'enter', true)
}

/** Live busy Enter preference for settings and send resolution. */
export const mobileSubmissionPolicy = policy

/** Reset the policy to the default when no local value exists. */
export function resetMobileSubmissionPolicy(): void {
  policy.busyEnter.set(readMobileBusyEnter() ?? DEFAULT_BUSY_ENTER_BEHAVIOR)
}
