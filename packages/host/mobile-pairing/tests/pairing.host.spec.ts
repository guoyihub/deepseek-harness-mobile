import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { apply, Config, inject, name } from '../src/index.ts'
import { MobilePairingStore } from '../src/store.ts'
import { PAIR_TOKEN_NO_EXPIRY_MS } from '../src/types.ts'

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

function fakeWebServer(routes: WebRoute[]): {
  host: '127.0.0.1'
  port: number
  register(route: WebRoute): () => void
} {
  return {
    host: '127.0.0.1',
    port: 3080,
    register(route: WebRoute) {
      routes.push(route)
      return () => {
        const index = routes.indexOf(route)
        if (index !== -1) routes.splice(index, 1)
      }
    },
  }
}

describe('MobilePairingStore', () => {
  it('mints one active pairToken and rejects reuse after consumption', () => {
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'off',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    const offer = store.createPairing('192.168.1.10', 3080)
    expect(offer.qrUrl).toMatch(/^http:\/\//)
    expect(offer.qrUrl).toContain(offer.pairToken)
    expect(offer.shortCode).toMatch(/^\d{6}$/)
    expect(offer.confirmMode).toBe('off')
    const first = store.attemptPair(offer.pairToken, 'Pixel', 'mobile/0.1.0')
    expect(first.kind).toBe('success')
    const second = store.attemptPair(offer.pairToken, 'Pixel', 'mobile/0.1.0')
    expect(second.kind).toBe('consumed')
    expect(store.currentPairing('192.168.1.10', 3080)).toBeUndefined()
  })

  it('pairs by shortCode and rejects unknown codes', () => {
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'off',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    const offer = store.createPairing('192.168.1.10', 3080)
    const paired = store.attemptPairByShortCode(offer.shortCode, 'Pixel', 'mobile/0.1.0')
    expect(paired.kind).toBe('success')
    expect(store.attemptPairByShortCode('000000', 'Pixel', 'mobile/0.1.0').kind).toBe('not-found')
  })

  it('requires pair password when password mode is enabled', () => {
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'off',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    expect(store.setPairPasswordSettings('required', 'secret')).toBe(true)
    const offer = store.createPairing('192.168.1.10', 3080)
    expect(offer.passwordRequired).toBe(true)
    expect(offer.qrUrl).toContain('&p=1')
    expect(store.attemptPair(offer.pairToken, 'Pixel', 'mobile/0.1.0').kind).toBe('password-required')
    expect(store.attemptPair(offer.pairToken, 'Pixel', 'mobile/0.1.0', 'wrong').kind).toBe('password-invalid')
    const paired = store.attemptPair(offer.pairToken, 'Pixel', 'mobile/0.1.0', 'secret')
    expect(paired.kind).toBe('success')
  })

  it('expires no-password pairToken after the configured TTL', () => {
    vi.useFakeTimers()
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'off',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    const offer = store.createPairing('192.168.1.10', 3080)
    vi.advanceTimersByTime(60_001)
    expect(store.attemptPair(offer.pairToken, 'Pixel', 'mobile/0.1.0').kind).toBe('expired')
    vi.useRealTimers()
  })

  it('keeps password pairToken valid beyond the no-password TTL', () => {
    vi.useFakeTimers()
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'off',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    store.setPairPasswordSettings('required', 'secret')
    const offer = store.createPairing('192.168.1.10', 3080)
    expect(offer.expiresAt).toBe(PAIR_TOKEN_NO_EXPIRY_MS)
    expect(offer.qrUrl).toContain('&e=0')
    vi.advanceTimersByTime(25 * 60 * 60 * 1000)
    expect(store.attemptPair(offer.pairToken, 'Pixel', 'mobile/0.1.0', 'secret').kind).toBe('success')
    vi.useRealTimers()
  })

  it('bakes mobilePublicBaseUrl into QR deep links for tunnels', () => {
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'off',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    expect(store.setMobilePublicBaseUrl('https://tunnel.example.com/path')).toBe(true)
    const offer = store.createPairing('127.0.0.1', 3080)
    expect(offer.host).toBe('tunnel.example.com')
    expect(offer.port).toBe(443)
    expect(offer.qrUrl).toMatch(/^https:\/\/tunnel\.example\.com\/mobile\/pair\?t=/)
    expect(offer.qrUrl).not.toContain('127.0.0.1')
    expect(store.pairPasswordSettings().mobilePublicBaseUrl).toBe('https://tunnel.example.com')
  })

  it('enters pending in strict mode until desktop confirmation and phone poll pickup', () => {
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'strict',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    const offer = store.createPairing('192.168.1.10', 3080)
    const pending = store.attemptPair(offer.pairToken, 'iPhone', 'mobile/0.1.0')
    expect(pending).toEqual({ kind: 'pending', deviceId: expect.any(String) })
    if (pending.kind !== 'pending') throw new Error('expected pending')
    expect(store.pollDeviceStatus(pending.deviceId)).toEqual({ status: 'pending' })
    const confirmed = store.confirmPending(pending.deviceId)
    expect(confirmed?.sessionToken).toEqual(expect.any(String))
    expect(store.pollDeviceStatus(pending.deviceId)).toEqual({
      status: 'ready',
      value: expect.objectContaining({ deviceId: pending.deviceId }),
    })
    expect(store.pollDeviceStatus(pending.deviceId)).toEqual({ status: 'expired' })
  })

  it('reports denied status after desktop rejection', () => {
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'strict',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    const offer = store.createPairing('192.168.1.10', 3080)
    const pending = store.attemptPair(offer.pairToken, 'iPhone', 'mobile/0.1.0')
    if (pending.kind !== 'pending') throw new Error('expected pending')
    expect(store.denyPending(pending.deviceId)).toBe(true)
    expect(store.pollDeviceStatus(pending.deviceId)).toEqual({ status: 'denied' })
  })

  it('validates issued session tokens and honors revocation', () => {
    const store = new MobilePairingStore({
      publicScheme: 'http',
      confirmMode: 'off',
      pairTokenTtlMs: 60_000,
      sessionTokenTtlMs: 3_600_000,
      fingerprint: 'abc12345',
      hostDisplayName: 'test-host',
    })
    const offer = store.createPairing('192.168.1.10', 3080)
    const paired = store.attemptPair(offer.pairToken, 'Phone', 'mobile/0.1.0')
    if (paired.kind !== 'success') throw new Error('expected success')
    expect(store.validateSessionToken(paired.value.sessionToken)).toBeDefined()
    expect(store.listDevices()).toEqual([
      expect.objectContaining({ deviceId: paired.value.deviceId, revoked: false }),
    ])
    store.revokeDevice(paired.value.deviceId)
    expect(store.validateSessionToken(paired.value.sessionToken)).toBeUndefined()
    expect(store.listDevices()[0]?.revoked).toBe(true)
  })
})

describe('mobile-pairing plugin', () => {
  it('registers /api/mobile routes and exposes ctx.mobilePairing', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    const routes: WebRoute[] = []
    ctx.provide('webServer', fakeWebServer(routes) as never)
    const fiber = ctx.plugin({ name, inject: [...inject], apply, Config }, {
      confirmMode: 'off',
      trustedHosts: ['192.168.1.10'],
    })
    await fiber.await()
    expect(ctx.get('mobilePairing')).toBeDefined()
    expect(routes.map(route => `${route.kind}:${route.path}`)).toEqual([
      'exact:/api/mobile/pair',
      'exact:/api/mobile/pair/confirm',
      'exact:/api/mobile/pair/deny',
      'exact:/api/mobile/pair/status',
      'exact:/api/mobile/pair/pending',
      'exact:/api/mobile/pair/qrcode',
      'exact:/api/mobile/pair/policy',
      'exact:/api/mobile/pair/settings',
      'exact:/api/mobile/devices',
      'prefix:/api/mobile/devices',
    ])
    await fiber.dispose()
  })
})
