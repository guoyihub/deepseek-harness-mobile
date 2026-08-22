// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MOBILE_KEYBOARD_OPEN_ATTR,
  MOBILE_VV_HEIGHT_VAR,
  MOBILE_VV_WIDTH_VAR,
  applyMobileStandaloneDocumentFlags,
  bindMobileLayoutViewportPin,
  bindMobileViewportShellFrame,
  burstSyncMobileViewportShellFrame,
  markMobileViewportShellKeyboardOpen,
  mobileKeyboardInsetPx,
  pinMobileLayoutViewport,
  pinMobileLayoutViewportBurst,
  syncMobileViewportShellFrame,
} from '../src/client/mobile-visual-viewport.ts'

describe('mobileKeyboardInsetPx', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns zero when visualViewport is unavailable', () => {
    vi.stubGlobal('visualViewport', null)
    vi.stubGlobal('innerHeight', 800)
    expect(mobileKeyboardInsetPx()).toBe(0)
  })

  it('sums keyboard height and layout scroll offset', () => {
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('visualViewport', {
      height: 500,
      offsetTop: 24,
    })
    expect(mobileKeyboardInsetPx()).toBe(276)
  })
})

describe('syncMobileViewportShellFrame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('mobile-standalone')
  })

  it('does not publish offset variables', () => {
    const shell = document.createElement('div')
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('visualViewport', {
      width: 390,
      height: 844,
      offsetTop: 56,
      offsetLeft: 0,
    })

    syncMobileViewportShellFrame(shell)

    expect(shell.style.getPropertyValue('--mobile-vv-offset-top')).toBe('')
    expect(shell.style.getPropertyValue('--mobile-vv-offset-left')).toBe('')
  })

  it('tracks visual viewport size in standalone mode when keyboard is closed', () => {
    const shell = document.createElement('div')
    document.documentElement.classList.add('mobile-standalone')
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    vi.stubGlobal('navigator', { standalone: true })
    vi.stubGlobal('visualViewport', {
      width: 390,
      height: 780,
      offsetTop: 0,
      offsetLeft: 0,
    })

    syncMobileViewportShellFrame(shell)

    expect(shell.style.getPropertyValue(MOBILE_VV_WIDTH_VAR)).toBe('390px')
    expect(shell.style.getPropertyValue(MOBILE_VV_HEIGHT_VAR)).toBe('780px')
  })

  it('skips standalone resize while keyboard session is active', () => {
    const shell = document.createElement('div')
    shell.setAttribute(MOBILE_KEYBOARD_OPEN_ATTR, '')
    document.documentElement.classList.add('mobile-standalone')
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    vi.stubGlobal('navigator', { standalone: true })
    vi.stubGlobal('visualViewport', {
      width: 390,
      height: 500,
      offsetTop: 0,
      offsetLeft: 0,
    })

    syncMobileViewportShellFrame(shell)

    expect(shell.style.getPropertyValue(MOBILE_VV_WIDTH_VAR)).toBe('')
    expect(shell.style.getPropertyValue(MOBILE_VV_HEIGHT_VAR)).toBe('')
  })
})

describe('markMobileViewportShellKeyboardOpen', () => {
  it('toggles the shell keyboard-open marker', () => {
    const shell = document.createElement('div')
    markMobileViewportShellKeyboardOpen(shell, true)
    expect(shell.hasAttribute(MOBILE_KEYBOARD_OPEN_ATTR)).toBe(true)
    markMobileViewportShellKeyboardOpen(shell, false)
    expect(shell.hasAttribute(MOBILE_KEYBOARD_OPEN_ATTR)).toBe(false)
  })
})

describe('pinMobileLayoutViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('scrolls back to the origin when the layout viewport moved', () => {
    const scrollTo = vi.fn()
    const documentElement = { scrollTop: 12 }
    const body = { scrollTop: 8 }
    vi.stubGlobal('scrollTo', scrollTo)
    vi.stubGlobal('document', { documentElement, body })

    pinMobileLayoutViewport()

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(documentElement.scrollTop).toBe(0)
    expect(body.scrollTop).toBe(0)
  })
})

describe('pinMobileLayoutViewportBurst', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pins immediately and on the next animation frames', () => {
    const scrollTo = vi.fn()
    const rafQueue: FrameRequestCallback[] = []
    vi.stubGlobal('scrollTo', scrollTo)
    vi.stubGlobal('document', { documentElement: { scrollTop: 0 }, body: { scrollTop: 0 } })
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('visualViewport', { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafQueue.push(callback)
      return rafQueue.length
    })

    pinMobileLayoutViewportBurst()
    expect(scrollTo).toHaveBeenCalledTimes(1)

    rafQueue.splice(0).forEach((callback) => { callback(0) })
    expect(scrollTo).toHaveBeenCalledTimes(2)

    rafQueue.splice(0).forEach((callback) => { callback(0) })
    expect(scrollTo).toHaveBeenCalledTimes(3)
  })
})

describe('burstSyncMobileViewportShellFrame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('mobile-standalone')
  })

  it('syncs across animation frames', () => {
    const shell = document.createElement('div')
    document.documentElement.classList.add('mobile-standalone')
    const rafQueue: FrameRequestCallback[] = []
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    vi.stubGlobal('navigator', { standalone: true })
    vi.stubGlobal('visualViewport', {
      width: 390,
      height: 844,
      offsetTop: 12,
      offsetLeft: 0,
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafQueue.push(callback)
      return rafQueue.length
    })

    burstSyncMobileViewportShellFrame(shell)
    expect(shell.style.getPropertyValue(MOBILE_VV_HEIGHT_VAR)).toBe('844px')

    rafQueue.splice(0).forEach((callback) => { callback(0) })
    rafQueue.splice(0).forEach((callback) => { callback(0) })

    expect(shell.style.getPropertyValue(MOBILE_VV_HEIGHT_VAR)).toBe('844px')
  })
})

describe('bindMobileViewportShellFrame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pins on visualViewport scroll and clears sizing on dispose', () => {
    const shell = document.createElement('div')
    const scrollTo = vi.fn()
    const handlers = new Map<string, () => void>()
    vi.stubGlobal('scrollTo', scrollTo)
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('visualViewport', {
      width: 390,
      height: 844,
      offsetTop: 32,
      offsetLeft: 0,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        handlers.set(event, handler)
      }),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('document', {
      documentElement: { clientHeight: 800, scrollTop: 0 },
      body: { scrollTop: 0 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const dispose = bindMobileViewportShellFrame(shell)
    expect(shell.style.getPropertyValue(MOBILE_VV_WIDTH_VAR)).toBe('')

    handlers.get('scroll')?.()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    dispose()
    expect(shell.style.getPropertyValue(MOBILE_VV_WIDTH_VAR)).toBe('')
    expect(shell.style.getPropertyValue(MOBILE_VV_HEIGHT_VAR)).toBe('')
  })
})

describe('applyMobileStandaloneDocumentFlags', () => {
  afterEach(() => {
    document.documentElement.classList.remove('mobile-standalone')
    vi.unstubAllGlobals()
  })

  it('adds the standalone class in installed PWA mode', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    vi.stubGlobal('navigator', { standalone: true })

    const dispose = applyMobileStandaloneDocumentFlags()

    expect(document.documentElement.classList.contains('mobile-standalone')).toBe(true)
    dispose()
    expect(document.documentElement.classList.contains('mobile-standalone')).toBe(false)
  })
})

describe('bindMobileLayoutViewportPin', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers focus and pointer listeners', () => {
    const addEventListener = vi.fn()
    vi.stubGlobal('scrollTo', vi.fn())
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('visualViewport', {
      width: 390,
      height: 844,
      offsetTop: 0,
      offsetLeft: 0,
    })
    vi.stubGlobal('document', {
      documentElement: { scrollTop: 0 },
      body: { scrollTop: 0 },
      addEventListener,
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    bindMobileLayoutViewportPin()

    expect(addEventListener).toHaveBeenCalledWith('focusin', expect.any(Function), true)
    expect(addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), {
      capture: true,
      passive: true,
    })
  })
})
