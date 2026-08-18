import { afterEach, describe, expect, it } from 'vitest'

import { readPairingLaunchContext } from '../src/client/pairing-launch.ts'

describe('readPairingLaunchContext', () => {
  afterEach(() => {
    delete (globalThis as { location?: Location }).location
  })

  it('returns idle when no pairing path or token', () => {
    ;(globalThis as { location: Location }).location = new URL('http://127.0.0.1:8030/') as unknown as Location
    expect(readPairingLaunchContext()).toEqual({ startPairPage: false })
  })

  it('opens pair page for /mobile/pair with token query', () => {
    const url = 'http://127.0.0.1:8030/mobile/pair?t=abc123&e=desk&f=fp1'
    ;(globalThis as { location: Location }).location = new URL(url) as unknown as Location
    expect(readPairingLaunchContext()).toEqual({
      startPairPage: true,
      initialRaw: 'http://127.0.0.1:3080/mobile/pair?t=abc123&e=desk&f=fp1',
    })
  })

  it('opens pair page when only ?t= is present on root', () => {
    const url = 'http://10.10.20.18:8030/?t=abc123'
    ;(globalThis as { location: Location }).location = new URL(url) as unknown as Location
    expect(readPairingLaunchContext()).toEqual({
      startPairPage: true,
      initialRaw: 'http://10.10.20.18:3080/?t=abc123',
    })
  })
})
