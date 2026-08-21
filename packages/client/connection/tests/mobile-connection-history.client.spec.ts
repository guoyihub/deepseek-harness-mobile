// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  MAX_MOBILE_CONNECTION_HISTORY,
  connectionHistoryId,
  readMobileConnectionHistory,
  rememberMobileConnection,
  removeMobileConnectionHistory,
  touchMobileConnectionHistory,
} from '../src/client/mobile-connection-history.ts'
import { MOBILE_STORAGE_KEYS } from '../src/client/mobile-session.ts'

describe('mobile connection history', () => {
  afterEach(() => {
    globalThis.localStorage?.removeItem(MOBILE_STORAGE_KEYS.connectionHistory)
  })

  it('upserts saved connections by fingerprint and host base', () => {
    rememberMobileConnection({
      fingerprint: 'abc12345',
      hostBase: 'http://192.168.1.10:3080',
      sessionToken: 'token-a',
      deviceId: 'device-a',
      hostDisplayName: 'Desk',
    })
    rememberMobileConnection({
      fingerprint: 'abc12345',
      hostBase: 'http://192.168.1.10:3080',
      sessionToken: 'token-b',
      deviceId: 'device-a',
      hostDisplayName: 'Desk',
    })
    const entries = readMobileConnectionHistory()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.sessionToken).toBe('token-b')
    expect(entries[0]?.connectedAt).toBeLessThanOrEqual(entries[0]?.lastConnectedAt ?? 0)
  })

  it('keeps multiple hosts and caps the list', () => {
    for (let index = 0; index < MAX_MOBILE_CONNECTION_HISTORY + 2; index += 1) {
      rememberMobileConnection({
        fingerprint: `fp${String(index)}`,
        hostBase: `http://192.168.1.${String(index)}:3080`,
        sessionToken: `token-${String(index)}`,
        deviceId: `device-${String(index)}`,
        hostDisplayName: `Host ${String(index)}`,
      })
    }
    expect(readMobileConnectionHistory()).toHaveLength(MAX_MOBILE_CONNECTION_HISTORY)
  })

  it('builds stable ids and supports touch/remove', () => {
    const id = connectionHistoryId('abc12345', 'http://127.0.0.1:3080')
    rememberMobileConnection({
      fingerprint: 'abc12345',
      hostBase: 'http://127.0.0.1:3080',
      sessionToken: 'token-a',
      deviceId: 'device-a',
      hostDisplayName: 'Desk',
    })
    touchMobileConnectionHistory(id)
    expect(readMobileConnectionHistory()[0]?.id).toBe(id)
    removeMobileConnectionHistory(id)
    expect(readMobileConnectionHistory()).toEqual([])
  })
})
