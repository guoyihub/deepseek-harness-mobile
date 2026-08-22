// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileScrollToBottomButton } from '../src/client/MobileScrollToBottomButton.tsx'

describe('MobileScrollToBottomButton', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders when visible and scrolls on click', () => {
    const onClick = vi.fn()
    const view = render(<MobileScrollToBottomButton visible onClick={onClick} />)
    const button = view.getByLabelText('回到底部')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('keeps composer focus on press so the keyboard stays open', () => {
    const onClick = vi.fn()
    vi.stubGlobal('scrollTo', vi.fn())
    const textarea = document.createElement('textarea')
    document.body.append(textarea)
    textarea.focus()
    const focusSpy = vi.spyOn(textarea, 'focus')

    const view = render(<MobileScrollToBottomButton visible onClick={onClick} />)
    const button = view.getByLabelText('回到底部')
    fireEvent.touchStart(button)

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    textarea.remove()
    view.unmount()
    vi.unstubAllGlobals()
  })

  it('unmounts when not visible', () => {
    const view = render(<MobileScrollToBottomButton visible={false} onClick={() => {}} />)
    expect(view.queryByLabelText('回到底部')).toBeNull()
  })
})
