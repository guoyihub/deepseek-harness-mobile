// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMobileNavigation } from '../src/client/useMobileNavigation.ts'

describe('useMobileNavigation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushes and pops routes with history integration', () => {
    vi.useFakeTimers()
    const pushState = vi.spyOn(window.history, 'pushState')
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    const { result } = renderHook(() => useMobileNavigation({ page: 'home' }))

    act(() => {
      result.current.push({ page: 'chat', sessionId: 'sess-1' })
    })

    expect(result.current.route).toEqual({ page: 'chat', sessionId: 'sess-1' })
    expect(result.current.transition).toBe('forward')
    expect(pushState).toHaveBeenCalled()

    act(() => {
      result.current.goBack()
    })

    expect(back).toHaveBeenCalled()
    expect(result.current.route).toEqual({ page: 'home' })
    expect(result.current.transition).toBe('back')

    act(() => {
      vi.advanceTimersByTime(320)
    })

    expect(result.current.transition).toBe('none')
  })
})
