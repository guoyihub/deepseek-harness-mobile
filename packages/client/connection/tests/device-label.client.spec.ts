// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_DEVICE_LABEL,
  resolveDefaultDeviceLabel,
  resolveDeviceLabel,
} from '../src/client/device-label.ts'
import {
  MOBILE_STORAGE_KEYS,
  clearPairingStorage,
  readStoredDeviceLabel,
  writeStoredDeviceLabel,
} from '../src/client/mobile-session.ts'

describe('resolveDefaultDeviceLabel', () => {
  it('returns the fixed default label', () => {
    expect(resolveDefaultDeviceLabel()).toBe('My Phone')
    expect(DEFAULT_DEVICE_LABEL).toBe('My Phone')
  })
})

describe('device label persistence', () => {
  afterEach(() => {
    clearPairingStorage()
    globalThis.localStorage?.removeItem(MOBILE_STORAGE_KEYS.deviceLabel)
    globalThis.localStorage?.removeItem(MOBILE_STORAGE_KEYS.deviceLabelCustomized)
  })

  it('uses the default label when unset', () => {
    expect(resolveDeviceLabel()).toBe('My Phone')
  })

  it('prefers a stored label when customized', () => {
    writeStoredDeviceLabel('Work phone')
    expect(resolveDeviceLabel()).toBe('Work phone')
    expect(readStoredDeviceLabel()).toBe('Work phone')
  })

  it('ignores stale auto-saved labels until the user edits again', () => {
    globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.deviceLabel, 'iPhone 16 Pro')
    expect(resolveDeviceLabel()).toBe('My Phone')
  })

  it('survives disconnect clears', () => {
    writeStoredDeviceLabel('Work phone')
    globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.host, 'https://host.test')
    clearPairingStorage()
    expect(readStoredDeviceLabel()).toBe('Work phone')
    expect(globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.host)).toBeNull()
  })
})
