/** Busy-state Enter preference for the mobile composer. */

import {
  BUSY_ENTER_FIELD,
  CONVERSATION_SETTINGS_NAMESPACE,
  DEFAULT_BUSY_ENTER_BEHAVIOR,
  type BusyEnterBehavior,
} from '@deepseek-ai/dsh-client-ui-conversation/src/submission-settings.ts'
import { mobileApi } from './mobile-api-client.ts'
import { getMobileSettingsDescribe, invalidateMobileSettingsDescribe } from './mobile-host-metadata-cache.ts'

const STORAGE_KEY = 'dsh.mobile.busyEnter'

/**
 * Read the locally cached busy Enter preference.
 */
export function readMobileBusyEnter(): BusyEnterBehavior {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (value === 'queue' || value === 'steer') return value
  } catch {
    return DEFAULT_BUSY_ENTER_BEHAVIOR
  }
  return DEFAULT_BUSY_ENTER_BEHAVIOR
}

/**
 * Persist the busy Enter preference locally and on the Host when writable.
 * @param behavior - queue or steer while the agent is running.
 */
export async function writeMobileBusyEnter(behavior: BusyEnterBehavior): Promise<void> {
  globalThis.localStorage?.setItem(STORAGE_KEY, behavior)
  const describe = await getMobileSettingsDescribe()
  const section = describe.namespaces.find(item => item.ns === CONVERSATION_SETTINGS_NAMESPACE)
  if (section === undefined || !describe.writable) return
  const response = await mobileApi.settings.update({
    ns: CONVERSATION_SETTINGS_NAMESPACE,
    patch: { [BUSY_ENTER_FIELD]: behavior },
    expectedRevision: section.revision,
  })
  if (response.result.ok) invalidateMobileSettingsDescribe()
}

/**
 * Adopt the Host conversation settings namespace when present.
 */
export async function adoptMobileBusyEnterFromHost(): Promise<BusyEnterBehavior> {
  const describe = await getMobileSettingsDescribe()
  const section = describe.namespaces.find(item => item.ns === CONVERSATION_SETTINGS_NAMESPACE)
  const value = section?.value as { busyEnter?: unknown } | undefined
  if (value?.busyEnter === 'queue' || value?.busyEnter === 'steer') {
    globalThis.localStorage?.setItem(STORAGE_KEY, value.busyEnter)
    return value.busyEnter
  }
  return readMobileBusyEnter()
}
