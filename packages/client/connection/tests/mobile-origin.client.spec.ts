// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveMobileApiBase } from '../src/client/mobile-origin.ts'

describe('resolveMobileApiBase', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('routes loopback host QR through the Vite page origin when ports differ', () => {
    vi.stubGlobal('location', {
      href: 'http://localhost:8030/',
      origin: 'http://localhost:8030',
      hostname: 'localhost',
    })
    expect(resolveMobileApiBase('http://127.0.0.1:3080')).toBe('http://localhost:8030')
    expect(resolveMobileApiBase('http://localhost:3080')).toBe('http://localhost:8030')
  })

  it('keeps LAN page origin for non-loopback surfaces', () => {
    vi.stubGlobal('location', {
      href: 'http://192.168.1.20:8030/',
      origin: 'http://192.168.1.20:8030',
      hostname: '192.168.1.20',
    })
    expect(resolveMobileApiBase('http://192.168.1.5:3080')).toBe('http://192.168.1.20:8030')
  })
})
