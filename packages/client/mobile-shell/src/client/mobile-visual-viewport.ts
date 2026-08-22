import { isStandaloneDisplayMode } from './mobile-theme.ts'

/** CSS variables published on the viewport shell root. */
export const MOBILE_VV_WIDTH_VAR = '--mobile-vv-width'
export const MOBILE_VV_HEIGHT_VAR = '--mobile-vv-height'

/** Shell attribute while a chat keyboard session is active (standalone sizing guard). */
export const MOBILE_KEYBOARD_OPEN_ATTR = 'data-mobile-keyboard-open'

/** Minimum keyboard inset before treating the keyboard as open. */
export const MIN_KEYBOARD_INSET_PX = 40

/** Pixel height hidden by the on-screen keyboard and layout viewport scroll. */
export function mobileKeyboardInsetPx(): number {
  const viewport = window.visualViewport
  if (viewport === null) return 0

  const layoutHeight = window.innerHeight
  const visualBottom = viewport.offsetTop + viewport.height
  const fromVisualBottom = layoutHeight - visualBottom
  const clientHeight = document.documentElement.clientHeight
  const fromClientBottom = clientHeight > 0 ? clientHeight - visualBottom : fromVisualBottom

  return Math.max(0, fromVisualBottom, fromClientBottom)
}

/**
 * Keep a fixed shell aligned with the visual viewport when iOS scrolls the layout viewport.
 * @param shell - viewport shell element receiving geometry and CSS variables.
 */
export function syncMobileViewportShellFrame(shell: HTMLElement): void {
  const viewport = window.visualViewport
  if (viewport === null) {
    shell.style.removeProperty(MOBILE_VV_WIDTH_VAR)
    shell.style.removeProperty(MOBILE_VV_HEIGHT_VAR)
    return
  }

  const keyboardOpen = shell.hasAttribute(MOBILE_KEYBOARD_OPEN_ATTR)
  const keyboardInset = mobileKeyboardInsetPx()
  const trackVisualViewportBox = isStandaloneDisplayMode()
    && !keyboardOpen
    && keyboardInset < MIN_KEYBOARD_INSET_PX

  if (trackVisualViewportBox) {
    shell.style.setProperty(MOBILE_VV_WIDTH_VAR, `${viewport.width}px`)
    shell.style.setProperty(MOBILE_VV_HEIGHT_VAR, `${viewport.height}px`)
  } else {
    shell.style.removeProperty(MOBILE_VV_WIDTH_VAR)
    shell.style.removeProperty(MOBILE_VV_HEIGHT_VAR)
  }
}

/**
 * Mark the shell while chat keyboard handling owns vertical layout (standalone guard).
 * @param shell - viewport shell element.
 * @param open - whether a keyboard session is active.
 */
export function markMobileViewportShellKeyboardOpen(shell: HTMLElement, open: boolean): void {
  if (open) {
    shell.setAttribute(MOBILE_KEYBOARD_OPEN_ATTR, '')
  } else {
    shell.removeAttribute(MOBILE_KEYBOARD_OPEN_ATTR)
  }
}

/**
 * Pin shell geometry across the next frames (iOS standalone first-focus guard).
 * @param shell - viewport shell element receiving geometry sync.
 */
export function burstSyncMobileViewportShellFrame(shell: HTMLElement): void {
  syncMobileViewportShellFrame(shell)
  window.requestAnimationFrame(() => {
    syncMobileViewportShellFrame(shell)
    window.requestAnimationFrame(() => {
      syncMobileViewportShellFrame(shell)
    })
  })
}

/**
 * Force the layout viewport back to the origin (iOS scrolls it when focusing inputs).
 */
export function pinMobileLayoutViewport(): void {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/**
 * Pin across the next frames so the first input focus cannot paint a scrolled layout.
 * @param shell - optional viewport shell to re-sync while pinning.
 */
export function pinMobileLayoutViewportBurst(shell: HTMLElement | null = null): void {
  pinMobileLayoutViewport()
  if (shell !== null) {
    syncMobileViewportShellFrame(shell)
  }
  window.requestAnimationFrame(() => {
    pinMobileLayoutViewport()
    if (shell !== null) {
      syncMobileViewportShellFrame(shell)
    }
    window.requestAnimationFrame(() => {
      pinMobileLayoutViewport()
      if (shell !== null) {
        syncMobileViewportShellFrame(shell)
      }
    })
  })
}

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    if (target.disabled) return false
    return target.type !== 'hidden' && target.type !== 'checkbox' && target.type !== 'radio'
  }
  return target.isContentEditable
}

function findViewportShell(from: EventTarget | null): HTMLElement | null {
  if (!(from instanceof HTMLElement)) return null
  return from.closest('[data-mobile-viewport-shell]') as HTMLElement | null
}

/**
 * Track visual-viewport offset on a fixed shell so first-focus layout scroll never shifts chrome.
 * @param shell - viewport shell element receiving geometry sync.
 * @returns disposer for viewport listeners.
 */
export function bindMobileViewportShellFrame(shell: HTMLElement): () => void {
  const sync = (): void => { syncMobileViewportShellFrame(shell) }
  const onVisualViewportScroll = (): void => {
    pinMobileLayoutViewport()
    syncMobileViewportShellFrame(shell)
  }
  const onEditableTouchStart = (event: Event): void => {
    if (!isEditableTarget(event.target)) return
    pinMobileLayoutViewport()
    burstSyncMobileViewportShellFrame(shell)
  }
  const onEditableFocusIn = (event: Event): void => {
    if (!isEditableTarget(event.target)) return
    pinMobileLayoutViewportBurst(shell)
  }

  sync()
  window.visualViewport?.addEventListener('scroll', onVisualViewportScroll)
  window.visualViewport?.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)
  document.addEventListener('touchstart', onEditableTouchStart, { capture: true, passive: true })
  document.addEventListener('focusin', onEditableFocusIn, true)
  return () => {
    window.visualViewport?.removeEventListener('scroll', onVisualViewportScroll)
    window.visualViewport?.removeEventListener('resize', sync)
    window.removeEventListener('orientationchange', sync)
    document.removeEventListener('touchstart', onEditableTouchStart, true)
    document.removeEventListener('focusin', onEditableFocusIn, true)
    shell.style.removeProperty(MOBILE_VV_WIDTH_VAR)
    shell.style.removeProperty(MOBILE_VV_HEIGHT_VAR)
    shell.removeAttribute(MOBILE_KEYBOARD_OPEN_ATTR)
  }
}

/**
 * Suppress layout-viewport scroll while typing without driving keyboard lift.
 * @param shell - optional viewport shell to re-sync while pinning.
 * @returns disposer for viewport listeners.
 */
export function bindMobileLayoutViewportPin(shell: HTMLElement | null = null): () => void {
  const pinBurst = (): void => { pinMobileLayoutViewportBurst(shell) }
  const onEditablePointerDown = (event: Event): void => {
    if (!isEditableTarget(event.target)) return
    const targetShell = shell ?? findViewportShell(event.target)
    pinMobileLayoutViewportBurst(targetShell)
    if (targetShell !== null && isStandaloneDisplayMode()) {
      burstSyncMobileViewportShellFrame(targetShell)
    }
  }

  document.addEventListener('focusin', pinBurst, true)
  document.addEventListener('touchstart', onEditablePointerDown, { capture: true, passive: true })
  document.addEventListener('pointerdown', onEditablePointerDown, { capture: true })

  return () => {
    document.removeEventListener('focusin', pinBurst, true)
    document.removeEventListener('touchstart', onEditablePointerDown, true)
    document.removeEventListener('pointerdown', onEditablePointerDown, true)
  }
}

/**
 * Apply document-level flags for installed iOS/Android PWAs.
 */
export function applyMobileStandaloneDocumentFlags(): () => void {
  if (!isStandaloneDisplayMode()) return () => {}
  document.documentElement.classList.add('mobile-standalone')
  return () => { document.documentElement.classList.remove('mobile-standalone') }
}
