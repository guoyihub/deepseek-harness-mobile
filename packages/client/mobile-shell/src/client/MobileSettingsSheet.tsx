import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Sheet motion duration (ms). */
const SHEET_ANIM_MS = 320

/** Drag distance (px) that dismisses the sheet. */
const DISMISS_DRAG_PX = 96

/** Props for {@link MobileSettingsSheet}. */
export interface MobileSettingsSheetProps {
  /** Centered sheet title. */
  title: string
  /** Called after the close animation when no `afterClose` override was passed. */
  onClose: () => void
  /** Scrollable sheet body. */
  children: ReactNode
  /** Receive the animated close function for navigation after retract. */
  onCloseControl?: ((close: (afterClose?: () => void) => void) => void) | undefined
}

/**
 * Bottom sheet overlay: top gap, slide-up enter, drag-down or close retract.
 * @param props - title, close handler, and body.
 */
export function MobileSettingsSheet({
  title,
  onClose,
  children,
  onCloseControl,
}: MobileSettingsSheetProps): JSX.Element {
  const [phase, setPhase] = useState<'enter' | 'open' | 'exit'>('enter')
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragOffsetRef = useRef(0)
  const draggingRef = useRef(false)
  const closeTimerRef = useRef<number | undefined>(undefined)
  const closedRef = useRef(false)
  const afterCloseRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => { setPhase('open') })
    })
    return () => { cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  const finishClose = useCallback((): void => {
    if (closedRef.current) return
    closedRef.current = true
    const afterClose = afterCloseRef.current
    afterCloseRef.current = undefined
    if (afterClose !== undefined) {
      afterClose()
      return
    }
    onClose()
  }, [onClose])

  const requestClose = useCallback((afterClose?: () => void): void => {
    if (phase === 'exit') return
    afterCloseRef.current = afterClose
    draggingRef.current = false
    setIsDragging(false)
    dragOffsetRef.current = 0
    setDragOffset(0)
    setPhase('exit')
    closeTimerRef.current = window.setTimeout(finishClose, SHEET_ANIM_MS)
  }, [finishClose, phase])

  useEffect(() => {
    onCloseControl?.(requestClose)
  }, [onCloseControl, requestClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [requestClose])

  const onDragZonePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (phase !== 'open') return
    draggingRef.current = true
    setIsDragging(true)
    dragStartY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onDragZonePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current || phase !== 'open') return
    const nextOffset = Math.max(0, event.clientY - dragStartY.current)
    dragOffsetRef.current = nextOffset
    setDragOffset(nextOffset)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (dragOffsetRef.current > DISMISS_DRAG_PX) {
      requestClose()
      return
    }
    dragOffsetRef.current = 0
    setDragOffset(0)
  }

  const sheetTransform = phase === 'enter' || phase === 'exit'
    ? undefined
    : dragOffset > 0
      ? `translateY(${dragOffset}px)`
      : undefined

  const sheetStyle: CSSProperties | undefined = sheetTransform !== undefined
    ? { transform: sheetTransform }
    : undefined

  const backdropOpacity = phase === 'enter'
    ? 0
    : phase === 'exit'
      ? 0
      : Math.max(0, 1 - dragOffset / 280)

  return (
    <div className={css.mSetOverlay} role="presentation">
      <div
        className={css.mSetBackdrop}
        style={{ opacity: backdropOpacity }}
        aria-hidden="true"
        onClick={() => { requestClose() }}
      />
      <div
        className={css.mSetSheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-phase={phase}
        data-dragging={isDragging || undefined}
        style={sheetStyle}
      >
        <div
          className={css.mSetDragZone}
          onPointerDown={onDragZonePointerDown}
          onPointerMove={onDragZonePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className={css.mSetHandle} aria-hidden="true" />
          <header className={css.mSetHeader}>
            <h1 className={css.mSetTitle}>{title}</h1>
            <button
              type="button"
              className={css.mSetClose}
              aria-label="关闭"
              onClick={() => { requestClose() }}
            >
              <IconCloseOutline16 size={16} aria-hidden />
            </button>
          </header>
        </div>
        <div className={css.mSetScroll}>
          {children}
        </div>
      </div>
    </div>
  )
}
