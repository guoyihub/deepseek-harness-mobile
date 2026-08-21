import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  computePullOffset,
  MOBILE_PULL_REFRESH_ACTIVE_PX,
  MOBILE_PULL_REFRESH_MOTION_MS,
  shouldTriggerRefresh,
} from './mobile-pull-to-refresh.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobilePullToRefresh}. */
export interface MobilePullToRefreshProps {
  /** Scrollport body. */
  children: ReactNode
  /** Refresh handler; errors propagate to the caller. */
  onRefresh: () => Promise<void>
  /** Disable gesture handling (search mode, multi-select, etc.). */
  disabled?: boolean | undefined
  /** Optional class composed onto the scrollport. */
  scrollClassName?: string | undefined
  /** Increase bottom padding when a bottom dock is visible. */
  dock?: boolean | undefined
  /** Accessible label for the scroll region. */
  ariaLabel?: string | undefined
}

/**
 * Touch pull-to-refresh wrapper for mobile scrollports.
 * @param props - scroll body, refresh handler, and layout flags.
 */
export function MobilePullToRefresh({
  children,
  onRefresh,
  disabled = false,
  scrollClassName,
  dock = false,
  ariaLabel,
}: MobilePullToRefreshProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pullRaw, setPullRaw] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [animating, setAnimating] = useState(false)
  const armedRef = useRef(false)
  const pullingRef = useRef(false)
  const startYRef = useRef(0)
  const pullRawRef = useRef(0)
  const disabledRef = useRef(disabled)
  const refreshingRef = useRef(refreshing)
  const onRefreshRef = useRef(onRefresh)

  disabledRef.current = disabled
  refreshingRef.current = refreshing
  onRefreshRef.current = onRefresh
  pullRawRef.current = pullRaw

  const pullOffset = refreshing
    ? MOBILE_PULL_REFRESH_ACTIVE_PX
    : computePullOffset(pullRaw)
  const ready = !refreshing && shouldTriggerRefresh(pullOffset)

  const runRefresh = useCallback(async (): Promise<void> => {
    if (disabledRef.current || refreshingRef.current) return
    setAnimating(true)
    setRefreshing(true)
    setPullRaw(0)
    try {
      await onRefreshRef.current()
    } finally {
      setRefreshing(false)
      setAnimating(true)
      window.setTimeout(() => { setAnimating(false) }, MOBILE_PULL_REFRESH_MOTION_MS)
    }
  }, [])

  useEffect(() => {
    const scroll = scrollRef.current
    if (scroll === null) return

    const resetGesture = (): void => {
      armedRef.current = false
      pullingRef.current = false
    }

    const onTouchStart = (event: TouchEvent): void => {
      if (disabledRef.current || refreshingRef.current) return
      if (scroll.scrollTop > 0) return
      const touch = event.touches[0]
      if (touch === undefined) return
      startYRef.current = touch.clientY
      armedRef.current = true
      pullingRef.current = false
      setAnimating(false)
    }

    const onTouchMove = (event: TouchEvent): void => {
      if (!armedRef.current || disabledRef.current || refreshingRef.current) return
      const touch = event.touches[0]
      if (touch === undefined) return
      const delta = touch.clientY - startYRef.current
      if (scroll.scrollTop > 0 || delta <= 0) {
        if (pullRawRef.current !== 0) setPullRaw(0)
        pullingRef.current = false
        return
      }
      pullingRef.current = true
      event.preventDefault()
      setPullRaw(delta)
      setAnimating(false)
    }

    const onTouchEnd = (): void => {
      if (!armedRef.current) return
      const wasPulling = pullingRef.current
      resetGesture()
      if (!wasPulling || disabledRef.current || refreshingRef.current) {
        if (pullRawRef.current !== 0) {
          setAnimating(true)
          setPullRaw(0)
        }
        return
      }
      const offset = computePullOffset(pullRawRef.current)
      if (shouldTriggerRefresh(offset)) {
        void runRefresh()
        return
      }
      setAnimating(true)
      setPullRaw(0)
    }

    scroll.addEventListener('touchstart', onTouchStart, { passive: true })
    scroll.addEventListener('touchmove', onTouchMove, { passive: false })
    scroll.addEventListener('touchend', onTouchEnd)
    scroll.addEventListener('touchcancel', onTouchEnd)
    return () => {
      scroll.removeEventListener('touchstart', onTouchStart)
      scroll.removeEventListener('touchmove', onTouchMove)
      scroll.removeEventListener('touchend', onTouchEnd)
      scroll.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [runRefresh])

  useEffect(() => {
    if (!disabled || pullRaw === 0) return
    setAnimating(true)
    setPullRaw(0)
  }, [disabled, pullRaw])

  const scrollClass = scrollClassName === undefined
    ? css.pullToRefreshScroll
    : `${css.pullToRefreshScroll} ${scrollClassName}`

  return (
    <div className={css.pullToRefresh}>
      <div
        className={css.pullToRefreshIndicator}
        data-ready={ready || undefined}
        data-refreshing={refreshing || undefined}
        style={{
          height: `${pullOffset}px`,
          transition: animating
            ? `height ${MOBILE_PULL_REFRESH_MOTION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
            : undefined,
        }}
        aria-hidden={!refreshing && pullOffset <= 0}
        {...(refreshing ? { role: 'status', 'aria-live': 'polite' as const } : {})}
      >
        <span
          className={css.pullToRefreshIcon}
          data-spinning={refreshing || undefined}
        >
          <IconRefreshOutline16 size={16} />
        </span>
      </div>
      <div
        ref={scrollRef}
        className={scrollClass}
        data-dock={dock || undefined}
        {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
        style={{
          transform: pullOffset > 0 ? `translateY(${pullOffset}px)` : undefined,
          transition: animating
            ? `transform ${MOBILE_PULL_REFRESH_MOTION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
