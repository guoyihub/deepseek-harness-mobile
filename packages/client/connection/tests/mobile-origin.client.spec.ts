// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isNativeShell,
  normalizeMobileServerUrl,
  resolveMobileApiBase,
  resolveMobileServerBase,
} from '../src/client/mobile-origin.ts'
import { MOBILE_STORAGE_KEYS } from '../src/client/mobile-session.ts'

describe('resolveMobileApiBase', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.localStorage?.removeItem(MOBILE_STORAGE_KEYS.serverUrl)
  })

  it('routes loopback host QR through the Vite page origin when ports differ', () => {
    vi.stubGlobal('location', {
      href: 'http://localhost:8030/',
      origin: 'http://localhost:8030',
      hostname: 'localhost',
      protocol: 'http:',
    })
    expect(resolveMobileApiBase('http://127.0.0.1:3080')).toBe('http://localhost:8030')
    expect(resolveMobileApiBase('http://localhost:3080')).toBe('http://localhost:8030')
  })

  it('keeps LAN page origin for non-loopback surfaces', () => {
    vi.stubGlobal('location', {
      href: 'http://192.168.1.20:8030/',
      origin: 'http://192.168.1.20:8030',
      hostname: '192.168.1.20',
      protocol: 'http:',
    })
    expect(resolveMobileApiBase('http://192.168.1.5:3080')).toBe('http://192.168.1.20:8030')
  })

  it('uses configured server URL in native shell mode', () => {
    vi.stubGlobal('location', {
      href: 'capacitor://localhost/',
      origin: 'capacitor://localhost',
      hostname: 'localhost',
      protocol: 'capacitor:',
    })
    globalThis.localStorage?.setItem(MOBILE_STORAGE_KEYS.serverUrl, 'https://mobile.example.com')
    expect(resolveMobileServerBase()).toBe('https://mobile.example.com')
    expect(resolveMobileApiBase('http://192.168.1.5:3080')).toBe('https://mobile.example.com')
  })
})

describe('isNativeShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects capacitor page protocol', () => {
    vi.stubGlobal('location', {
      href: 'capacitor://localhost/',
      origin: 'capacitor://localhost',
      hostname: 'localhost',
      protocol: 'capacitor:',
    })
    expect(isNativeShell()).toBe(true)
  })
})

describe('normalizeMobileServerUrl', () => {
  it('adds https scheme and strips path noise', () => {
    expect(normalizeMobileServerUrl('mobile.example.com')).toBe('https://mobile.example.com')
    expect(normalizeMobileServerUrl('https://mobile.example.com/')).toBe('https://mobile.example.com')
  })

  it('returns empty string for invalid input', () => {
    expect(normalizeMobileServerUrl('')).toBe('')
    expect(normalizeMobileServerUrl('   ')).toBe('')
  })
})
