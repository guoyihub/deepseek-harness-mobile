import { describe, expect, it } from 'vitest'
import type { SessionId, SessionSummary } from '@deepseek-ai/dsh-client-connection/client'
import {
  clearMobileCompletedNotifications,
  mobileSessionCompleted,
  setMobileSelectedSession,
  syncMobileCompletedNotifications,
} from '../src/client/mobile-session-completed-tracker.ts'

const sid = (id: string): SessionId => id as SessionId

const summary = (id: string, running: boolean): SessionSummary => ({
  sessionId: sid(id),
  updatedAt: 0,
  running,
  blank: false,
})

describe('mobile-session-completed-tracker', () => {
  it('arms on a running→idle flip of a non-selected session and clears on select', () => {
    clearMobileCompletedNotifications()
    setMobileSelectedSession(sid('s1'))
    expect(syncMobileCompletedNotifications([summary('s1', false), summary('s2', false)])).toBe(false)
    expect(syncMobileCompletedNotifications([summary('s1', false), summary('s2', true)])).toBe(false)
    expect(syncMobileCompletedNotifications([summary('s1', false), summary('s2', false)])).toBe(true)
    expect(mobileSessionCompleted(sid('s2'))).toBe(true)
    setMobileSelectedSession(sid('s2'))
    expect(mobileSessionCompleted(sid('s2'))).toBe(false)
  })

  it('never arms for the session being watched', () => {
    clearMobileCompletedNotifications()
    setMobileSelectedSession(sid('s2'))
    expect(syncMobileCompletedNotifications([summary('s2', true)])).toBe(false)
    expect(syncMobileCompletedNotifications([summary('s2', false)])).toBe(false)
    expect(mobileSessionCompleted(sid('s2'))).toBe(false)
  })

  it('re-arms after switching away from a watched completion', () => {
    clearMobileCompletedNotifications()
    setMobileSelectedSession(sid('s2'))
    expect(syncMobileCompletedNotifications([summary('s1', false), summary('s2', true)])).toBe(false)
    expect(syncMobileCompletedNotifications([summary('s1', false), summary('s2', false)])).toBe(false)
    setMobileSelectedSession(sid('s1'))
    expect(syncMobileCompletedNotifications([summary('s1', false), summary('s2', true)])).toBe(false)
    expect(syncMobileCompletedNotifications([summary('s1', false), summary('s2', false)])).toBe(true)
    expect(mobileSessionCompleted(sid('s2'))).toBe(true)
  })

  it('disarms while running and drops removed sessions', () => {
    clearMobileCompletedNotifications()
    setMobileSelectedSession(undefined)
    expect(syncMobileCompletedNotifications([summary('s2', true)])).toBe(false)
    expect(syncMobileCompletedNotifications([summary('s2', false)])).toBe(true)
    expect(syncMobileCompletedNotifications([summary('s2', true)])).toBe(true)
    expect(mobileSessionCompleted(sid('s2'))).toBe(false)
    expect(syncMobileCompletedNotifications([summary('s2', false)])).toBe(true)
    expect(syncMobileCompletedNotifications([])).toBe(true)
    expect(mobileSessionCompleted(sid('s2'))).toBe(false)
  })
})
