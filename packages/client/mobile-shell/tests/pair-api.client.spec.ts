import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PairPendingError,
  buildHostBaseUrl,
  pairWithPolling,
  parsePairingInput,
  pollPairStatus,
} from '../src/client/pair-api.ts'

const pairResponse = {
  sessionToken: 'sess-token',
  deviceId: 'dev-1',
  hostDisplayName: 'desk',
  fingerprint: 'fp123456',
  scopes: ['mobile'],
  expiresAt: new Date().toISOString(),
}

describe('parsePairingInput', () => {
  it('parses QR URLs and manual host token pairs', () => {
    expect(parsePairingInput('http://192.168.1.10:3080/pair?t=abc123')).toEqual({
      baseUrl: 'http://192.168.1.10:3080',
      pairToken: 'abc123',
      passwordRequired: false,
    })
    expect(parsePairingInput('http://192.168.1.10:3080/mobile/pair?t=abc123&p=1')).toEqual({
      baseUrl: 'http://192.168.1.10:3080',
      pairToken: 'abc123',
      passwordRequired: true,
    })
    expect(parsePairingInput('192.168.1.10:3080 tok')).toEqual({
      baseUrl: 'http://192.168.1.10:3080',
      pairToken: 'tok',
      passwordRequired: false,
    })
  })
})

describe('buildHostBaseUrl', () => {
  it('combines host and port with http scheme', () => {
    expect(buildHostBaseUrl('192.168.1.10', '3080')).toBe('http://192.168.1.10:3080')
  })
})

describe('pollPairStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns ready payload without waiting when status is ready', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'ready', value: pairResponse }))))
    await expect(pollPairStatus('http://127.0.0.1:3080', 'dev-1', { initialDelayMs: 1, maxDelayMs: 1 })).resolves.toEqual(pairResponse)
  })

  it('throws when desktop denies the device', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'denied' }))))
    await expect(pollPairStatus('http://127.0.0.1:3080', 'dev-1')).rejects.toThrow('桌面拒绝了此设备的连接请求')
  })
})

describe('pairWithPolling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('polls after a 409 pending response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ deviceId: 'dev-pending' }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ready', value: pairResponse })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(pairWithPolling({ baseUrl: 'http://127.0.0.1:3080', pairToken: 'tok' }, 'Phone')).resolves.toEqual(pairResponse)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rethrows non-pending pair failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('bad', { status: 500 })))
    await expect(pairWithPolling({ baseUrl: 'http://127.0.0.1:3080', pairToken: 'tok' }, 'Phone')).rejects.toThrow('配对失败')
  })

  it('exposes PairPendingError for direct postPair callers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ deviceId: 'dev-pending' }), { status: 409 })))
    const { postPair } = await import('../src/client/pair-api.ts')
    await expect(postPair({ baseUrl: 'http://127.0.0.1:3080', pairToken: 'tok' }, 'Phone')).rejects.toBeInstanceOf(PairPendingError)
  })
})
