import {
  burstSyncMobileViewportShellFrame,
  markMobileViewportShellKeyboardOpen,
  mobileKeyboardInsetPx,
  pinMobileLayoutViewport,
  pinMobileLayoutViewportBurst,
  syncMobileViewportShellFrame,
} from './mobile-visual-viewport.ts'

/** CSS custom property for staged keyboard lift applied to the chat body. */
export const MOBILE_KEYBOARD_LIFT_VAR = '--mobile-keyboard-lift'

/** Minimum keyboard inset before treating the keyboard as open. */
export const MIN_KEYBOARD_INSET_PX = 40

/** Quiet period after the last viewport resize before the keyboard is fully open. */
export const KEYBOARD_OPENING_SETTLE_MS = 100

/** Delay after the keyboard is fully open before lifting the session stack. */
export const KEYBOARD_OPENING_LIFT_DELAY_MS = 300

/** Debounce after keyboard inset clears before returning to idle. */
export const KEYBOARD_CLOSING_SETTLE_MS = 50

/** Duration of the CSS padding-bottom transition when lift applies. */
export const KEYBOARD_LIFT_TRANSITION_MS = 380

/** data attribute enabling CSS transition on lift changes. */
export const KEYBOARD_LIFT_ANIMATE_ATTR = 'data-keyboard-lift-animate'

type KeyboardLiftPhase = 'idle' | 'opening' | 'open' | 'closing'

/** Options for {@link bindMobileChatKeyboardLift}. */
export interface MobileChatKeyboardLiftOptions {
  /** Called when lift is applied or cleared. */
  onLiftChange?: ((liftPx: number) => void) | undefined
  /** Quiet period before treating the keyboard as fully open. */
  openingSettleMs?: number | undefined
  /** Delay after the keyboard is fully open before lifting. */
  openingLiftDelayMs?: number | undefined
  /** Debounce duration for keyboard close settle detection. */
  closingSettleMs?: number | undefined
}

function isFocusableInput(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false
  if (target.disabled) return false
  return target.type !== 'hidden' && target.type !== 'checkbox' && target.type !== 'radio'
}

function focusedInputWithin(root: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  const active = document.activeElement
  if (active === null || !root.contains(active)) return null
  return isFocusableInput(active) ? active : null
}

function setLift(root: HTMLElement, liftPx: number, animate: boolean): void {
  root.style.setProperty(MOBILE_KEYBOARD_LIFT_VAR, `${liftPx}px`)
  if (animate) {
    root.setAttribute(KEYBOARD_LIFT_ANIMATE_ATTR, '')
  } else {
    root.removeAttribute(KEYBOARD_LIFT_ANIMATE_ATTR)
  }
}

/**
 * Staged keyboard lift for chat: session + composer stay still while the keyboard
 * animates, then lift smoothly 300ms after the viewport height settles.
 * @param root - chat surface element receiving lift custom properties.
 * @param options - settle callback and timing overrides.
 * @returns disposer for viewport and focus listeners.
 */
export function bindMobileChatKeyboardLift(
  root: HTMLElement,
  options: MobileChatKeyboardLiftOptions = {},
): () => void {
  const openingSettleMs = options.openingSettleMs ?? KEYBOARD_OPENING_SETTLE_MS
  const openingLiftDelayMs = options.openingLiftDelayMs ?? KEYBOARD_OPENING_LIFT_DELAY_MS
  const closingSettleMs = options.closingSettleMs ?? KEYBOARD_CLOSING_SETTLE_MS
  let phase: KeyboardLiftPhase = 'idle'
  let targetInsetPx = 0
  let openingSettleTimer: ReturnType<typeof setTimeout> | undefined
  let openingLiftTimer: ReturnType<typeof setTimeout> | undefined
  let closingTimer: ReturnType<typeof setTimeout> | undefined

  const clearClosingTimer = (): void => {
    if (closingTimer !== undefined) {
      clearTimeout(closingTimer)
      closingTimer = undefined
    }
  }

  const clearOpeningTimers = (): void => {
    if (openingSettleTimer !== undefined) {
      clearTimeout(openingSettleTimer)
      openingSettleTimer = undefined
    }
    if (openingLiftTimer !== undefined) {
      clearTimeout(openingLiftTimer)
      openingLiftTimer = undefined
    }
  }

  const applyLiftFromTarget = (animate: boolean): void => {
    const previous = root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)
    setLift(root, targetInsetPx, animate)
    const next = `${targetInsetPx}px`
    if (previous !== next) {
      options.onLiftChange?.(targetInsetPx)
    }
  }

  const enterIdle = (): void => {
    phase = 'idle'
    clearClosingTimer()
    clearOpeningTimers()
    targetInsetPx = 0
    setLift(root, 0, false)
    const shell = root.closest('[data-mobile-viewport-shell]') as HTMLElement | null
    if (shell !== null) {
      markMobileViewportShellKeyboardOpen(shell, false)
      syncMobileViewportShellFrame(shell)
    }
  }

  const finishOpening = (): void => {
    clearOpeningTimers()
    phase = 'open'
    targetInsetPx = mobileKeyboardInsetPx()
    const shell = root.closest('[data-mobile-viewport-shell]') as HTMLElement | null
    if (shell !== null) {
      markMobileViewportShellKeyboardOpen(shell, true)
      syncMobileViewportShellFrame(shell)
    }
    applyLiftFromTarget(true)
  }

  const scheduleOpeningLift = (): void => {
    clearOpeningTimers()
    openingSettleTimer = setTimeout(() => {
      openingSettleTimer = undefined
      if (phase !== 'opening') return
      pinMobileLayoutViewport()
      targetInsetPx = mobileKeyboardInsetPx()
      setLift(root, 0, false)
      if (targetInsetPx < MIN_KEYBOARD_INSET_PX) return

      openingLiftTimer = setTimeout(() => {
        openingLiftTimer = undefined
        if (phase !== 'opening') return
        pinMobileLayoutViewport()
        targetInsetPx = mobileKeyboardInsetPx()
        if (targetInsetPx < MIN_KEYBOARD_INSET_PX) return
        finishOpening()
      }, openingLiftDelayMs)
    }, openingSettleMs)
  }

  const noteOpeningResize = (insetPx: number): void => {
    setLift(root, 0, false)
    targetInsetPx = insetPx
    if (insetPx < MIN_KEYBOARD_INSET_PX) {
      clearOpeningTimers()
      return
    }
    scheduleOpeningLift()
  }

  const syncOpenLift = (): void => {
    pinMobileLayoutViewport()
    targetInsetPx = mobileKeyboardInsetPx()
    applyLiftFromTarget(true)
    if (targetInsetPx < MIN_KEYBOARD_INSET_PX) {
      phase = 'closing'
      setLift(root, 0, true)
      options.onLiftChange?.(0)
      scheduleClosingSettle()
    }
  }

  const scheduleClosingSettle = (): void => {
    clearClosingTimer()
    closingTimer = setTimeout(() => {
      closingTimer = undefined
      if (phase !== 'closing') return
      if (targetInsetPx >= MIN_KEYBOARD_INSET_PX) return
      enterIdle()
    }, closingSettleMs)
  }

  const onViewportResize = (): void => {
    pinMobileLayoutViewport()
    targetInsetPx = mobileKeyboardInsetPx()

    switch (phase) {
      case 'idle':
        return
      case 'opening':
        noteOpeningResize(targetInsetPx)
        return
      case 'open':
        syncOpenLift()
        return
      case 'closing':
        setLift(root, 0, true)
        if (targetInsetPx < MIN_KEYBOARD_INSET_PX) {
          scheduleClosingSettle()
        }
        return
      default: {
        const _exhaustive: never = phase
        return _exhaustive
      }
    }
  }

  const onViewportScroll = (): void => {
    pinMobileLayoutViewport()
    if (phase === 'open') {
      syncOpenLift()
      return
    }
    if (phase === 'closing') {
      targetInsetPx = mobileKeyboardInsetPx()
      setLift(root, 0, true)
      if (targetInsetPx < MIN_KEYBOARD_INSET_PX) {
        scheduleClosingSettle()
      }
    }
  }

  const onFocusIn = (event: FocusEvent): void => {
    if (!isFocusableInput(event.target) || !root.contains(event.target)) return
    const shell = root.closest('[data-mobile-viewport-shell]') as HTMLElement | null
    if (shell !== null) {
      burstSyncMobileViewportShellFrame(shell)
    }
    pinMobileLayoutViewportBurst(shell)
    clearClosingTimer()
    clearOpeningTimers()
    phase = 'opening'
    noteOpeningResize(mobileKeyboardInsetPx())
  }

  const onFocusOut = (): void => {
    window.setTimeout(() => {
      if (focusedInputWithin(root) !== null) return
      if (phase !== 'opening' && phase !== 'open') return
      clearClosingTimer()
      clearOpeningTimers()
      phase = 'closing'
      targetInsetPx = mobileKeyboardInsetPx()
      setLift(root, 0, true)
      options.onLiftChange?.(0)
      if (targetInsetPx < MIN_KEYBOARD_INSET_PX) {
        scheduleClosingSettle()
      }
    }, 0)
  }

  setLift(root, 0, false)
  window.visualViewport?.addEventListener('resize', onViewportResize)
  window.visualViewport?.addEventListener('scroll', onViewportScroll)
  window.addEventListener('resize', onViewportResize)
  window.addEventListener('orientationchange', onViewportResize)
  root.addEventListener('focusin', onFocusIn)
  root.addEventListener('focusout', onFocusOut)

  return () => {
    clearClosingTimer()
    clearOpeningTimers()
    const shell = root.closest('[data-mobile-viewport-shell]') as HTMLElement | null
    if (shell !== null) {
      markMobileViewportShellKeyboardOpen(shell, false)
    }
    window.visualViewport?.removeEventListener('resize', onViewportResize)
    window.visualViewport?.removeEventListener('scroll', onViewportScroll)
    window.removeEventListener('resize', onViewportResize)
    window.removeEventListener('orientationchange', onViewportResize)
    root.removeEventListener('focusin', onFocusIn)
    root.removeEventListener('focusout', onFocusOut)
    root.style.removeProperty(MOBILE_KEYBOARD_LIFT_VAR)
    root.removeAttribute(KEYBOARD_LIFT_ANIMATE_ATTR)
  }
}
