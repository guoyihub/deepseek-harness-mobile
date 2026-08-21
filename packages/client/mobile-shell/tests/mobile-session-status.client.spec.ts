import { describe, expect, it } from 'vitest'
import { mobileSessionStatuses } from '../src/client/mobile-session-status.ts'

describe('mobileSessionStatuses', () => {
  it('shows the green completion reminder ahead of idle', () => {
    const statuses = mobileSessionStatuses({ running: false, completed: true })
    expect(statuses[0]).toMatchObject({ state: 'done', label: '已完成' })
  })

  it('hides idle status from the primary dot slot', () => {
    const statuses = mobileSessionStatuses({ running: false, completed: false })
    expect(statuses[0]).toMatchObject({ state: 'done', label: expect.any(String) })
  })

  it('prefers pending interaction over completion reminders', () => {
    const statuses = mobileSessionStatuses({
      running: false,
      completed: true,
      pendingInteraction: 'question',
    })
    expect(statuses[0]).toMatchObject({ state: 'warning', label: '等待回答' })
  })

  it('prefers running over completion reminders', () => {
    const statuses = mobileSessionStatuses({ running: true, completed: true })
    expect(statuses[0]).toMatchObject({ state: 'ongoing', label: '进行中' })
  })
})
