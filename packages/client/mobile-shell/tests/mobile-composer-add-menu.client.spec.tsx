// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { MobileCommandMenu } from '../src/client/MobileCommandMenu.tsx'

const SID = 'session-1' as SessionId

afterEach(cleanup)

describe('MobileCommandMenu', () => {
  it('opens a root panel with commands, camera, and album when attach is enabled', () => {
    render((
      <MobileCommandMenu
        sessionId={SID}
        locked={false}
        onLeadingInput={vi.fn()}
        onOpenSurface={vi.fn()}
        onAttachImage={vi.fn()}
      />
    ))

    fireEvent.click(screen.getByRole('button', { name: '更多操作' }))
    expect(screen.getByRole('menuitem', { name: '命令' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: '拍照' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: '相册' })).toBeTruthy()
  })

  it('drills into the command catalog and returns to the root panel', () => {
    render((
      <MobileCommandMenu
        sessionId={SID}
        locked={false}
        onLeadingInput={vi.fn()}
        onOpenSurface={vi.fn()}
        onAttachImage={vi.fn()}
      />
    ))

    fireEvent.click(screen.getByRole('button', { name: '更多操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '命令' }))
    expect(screen.getByRole('menuitem', { name: '返回' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /compact/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('menuitem', { name: '返回' }))
    expect(screen.getByRole('menuitem', { name: '拍照' })).toBeTruthy()
  })

  it('omits camera and album rows when attach is unavailable', () => {
    render((
      <MobileCommandMenu
        sessionId={SID}
        locked={false}
        onLeadingInput={vi.fn()}
        onOpenSurface={vi.fn()}
      />
    ))

    fireEvent.click(screen.getByRole('button', { name: '更多操作' }))
    expect(screen.getByRole('menuitem', { name: '命令' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: '拍照' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: '相册' })).toBeNull()
  })
})
