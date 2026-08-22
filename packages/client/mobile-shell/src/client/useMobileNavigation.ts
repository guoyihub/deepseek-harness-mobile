import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mobileRouteFromHash,
  mobileRouteToHash,
  mobileRoutesEqual,
  type MobileHistoryState,
  type MobileRoute,
} from './mobile-route.ts'

/** Page transition direction for stack animations. */
export type MobileNavTransition = 'none' | 'forward' | 'back'

/** Mobile shell navigation stack bound to browser history. */
export interface MobileNavigation {
  /** Current route at the top of the stack. */
  route: MobileRoute
  /** Active slide transition, if any. */
  transition: MobileNavTransition
  /** Route beneath the current page during a back animation. */
  previousRoute: MobileRoute | undefined
  /** Whether {@link goBack} can pop the stack. */
  canGoBack: boolean
  /** Push a new page with a forward slide. */
  push: (route: MobileRoute) => void
  /** Replace the current page without animating forward. */
  replace: (route: MobileRoute) => void
  /** Reset the stack to one route (for flows that land on home). */
  reset: (route: MobileRoute) => void
  /** Pop one page, syncing browser / system back when possible. */
  goBack: () => void
}

const PAGE_MOTION_MS = 320

function readHistoryRoute(): MobileRoute | undefined {
  const state = window.history.state as MobileHistoryState | null
  if (state !== null && typeof state === 'object' && state.mobileRoute !== undefined) {
    return state.mobileRoute
  }
  return mobileRouteFromHash(window.location.hash)
}

/**
 * Route stack with iOS-style history integration for UI and system back.
 * @param initialRoute - first page shown on cold start.
 */
export function useMobileNavigation(initialRoute: MobileRoute): MobileNavigation {
  const [stack, setStack] = useState<MobileRoute[]>(() => [initialRoute])
  const [transition, setTransition] = useState<MobileNavTransition>('none')
  const [previousRoute, setPreviousRoute] = useState<MobileRoute | undefined>(undefined)
  const stackRef = useRef(stack)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const ignorePopRef = useRef(false)

  stackRef.current = stack
  const route = stack[stack.length - 1] ?? initialRoute

  const clearTransitionTimer = (): void => {
    if (transitionTimerRef.current !== undefined) {
      clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = undefined
    }
  }

  const finishTransition = useCallback((): void => {
    clearTransitionTimer()
    setTransition('none')
    setPreviousRoute(undefined)
  }, [])

  const beginTransition = useCallback((direction: MobileNavTransition, prior: MobileRoute | undefined): void => {
    clearTransitionTimer()
    setPreviousRoute(prior)
    setTransition(direction)
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = undefined
      finishTransition()
    }, PAGE_MOTION_MS)
  }, [finishTransition])

  useEffect(() => {
    const state: MobileHistoryState = { mobileRoute: initialRoute }
    window.history.replaceState(state, '', mobileRouteToHash(initialRoute))
  }, [initialRoute])

  useEffect(() => () => {
    clearTransitionTimer()
  }, [])

  const applyPop = useCallback((): void => {
    const current = stackRef.current
    if (current.length <= 1) return
    const nextStack = current.slice(0, -1)
    const prior = current[current.length - 2]
    stackRef.current = nextStack
    setStack(nextStack)
    beginTransition('back', prior)
  }, [beginTransition])

  useEffect(() => {
    const onPopState = (): void => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      const fromHistory = readHistoryRoute()
      const current = stackRef.current
      const top = current[current.length - 1]
      if (fromHistory !== undefined && top !== undefined && mobileRoutesEqual(fromHistory, top)) {
        return
      }
      applyPop()
    }

    const onSystemBack = (): void => {
      if (stackRef.current.length <= 1) return
      ignorePopRef.current = true
      window.history.back()
      applyPop()
    }

    window.addEventListener('popstate', onPopState)
    window.addEventListener('mobile-nav-back', onSystemBack)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('mobile-nav-back', onSystemBack)
    }
  }, [applyPop])

  const push = useCallback((next: MobileRoute): void => {
    const current = stackRef.current[stackRef.current.length - 1]
    if (current !== undefined && mobileRoutesEqual(current, next)) return
    const nextStack = [...stackRef.current, next]
    stackRef.current = nextStack
    setStack(nextStack)
    beginTransition('forward', current)
    window.history.pushState({ mobileRoute: next } satisfies MobileHistoryState, '', mobileRouteToHash(next))
  }, [beginTransition])

  const replace = useCallback((next: MobileRoute): void => {
    const current = stackRef.current
    const top = current[current.length - 1]
    if (top !== undefined && mobileRoutesEqual(top, next)) return
    const nextStack = [...current.slice(0, -1), next]
    stackRef.current = nextStack
    setStack(nextStack)
    finishTransition()
    window.history.replaceState({ mobileRoute: next } satisfies MobileHistoryState, '', mobileRouteToHash(next))
  }, [finishTransition])

  const reset = useCallback((next: MobileRoute): void => {
    stackRef.current = [next]
    setStack([next])
    finishTransition()
    window.history.replaceState({ mobileRoute: next } satisfies MobileHistoryState, '', mobileRouteToHash(next))
  }, [finishTransition])

  const goBack = useCallback((): void => {
    if (stackRef.current.length <= 1) return
    ignorePopRef.current = true
    window.history.back()
    applyPop()
  }, [applyPop])

  return {
    route,
    transition,
    previousRoute,
    canGoBack: stack.length > 1,
    push,
    replace,
    reset,
    goBack,
  }
}
