// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { SessionNodeItem } from '@deepseek-ai/dsh-client-ui-workspace/src/client/rows/Rows.tsx'
import { mobileWorkspaceT } from '../src/client/mobile-workspace-t.ts'

const node = {
  id: 'sess-1' as SessionId,
  title: 'sess-1',
  blank: false,
  running: false,
  runningSubagentCount: 0,
  completed: false,
  updatedAt: Date.now(),
  hasActiveSchedule: false,
}

afterEach(cleanup)

describe('mobile task home session rows', () => {
  it('renders desktop SessionNodeItem with a reserved status slot and trailing actions', () => {
    const { container } = render(
      <SessionNodeItem
        node={node}
        currentId={undefined}
        now={Date.now()}
        surface="mobile"
        onOpen={vi.fn()}
        onRename={vi.fn()}
        onFork={vi.fn()}
        onArchive={vi.fn()}
        t={mobileWorkspaceT}
      />,
    )

    const row = container.querySelector('[role="treeitem"]')
    expect(row).not.toBeNull()
    expect(row?.children.length).toBe(4)
    expect(row?.children[0]?.className).toMatch(/slot/u)
    expect(row?.children[1]?.textContent).toBe('sess-1')
    expect(row?.children[2]?.textContent).toBe('刚刚')
    expect(screen.getByRole('button', { name: /会话.*的操作/u })).toBeTruthy()
  })

  it('swaps the status slot for a checkbox while selecting', () => {
    const { container } = render(
      <SessionNodeItem
        node={node}
        currentId={undefined}
        now={Date.now()}
        surface="mobile"
        selecting
        selected
        onToggleSelect={vi.fn()}
        onOpen={vi.fn()}
        onRename={vi.fn()}
        onFork={vi.fn()}
        onArchive={vi.fn()}
        t={mobileWorkspaceT}
      />,
    )

    const row = container.querySelector('[role="treeitem"]')
    expect(row?.children.length).toBe(2)
    expect(row?.children[0]?.hasAttribute('data-checked')).toBe(true)
    expect(within(container).queryByRole('button', { name: /会话.*的操作/u })).toBeNull()
  })
})
