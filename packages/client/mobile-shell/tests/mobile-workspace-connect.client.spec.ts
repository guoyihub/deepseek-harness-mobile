import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import {
  findReusableBlankSession,
  resolveDefaultWorkspaceId,
  resolveRecentWorkspaceId,
  workspaceForSession,
} from '../src/client/mobile-workspace-connect.ts'

const sid = (id: string): SessionId => id as SessionId
const wid = (id: string): WorkspaceId => id as WorkspaceId

const wireSummary = (
  id: string,
  updatedAt: number,
  options: { blank?: boolean; cwd?: string } = {},
): SessionSummary => ({
  sessionId: sid(id),
  updatedAt,
  running: false,
  blank: options.blank === true,
  ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
})

const workspace = (
  id: string,
  sessionIds: string[],
  options: { path?: string; createdAt?: string } = {},
): WorkspaceView => ({
  workspaceId: wid(id),
  path: options.path ?? `/projects/${id}`,
  title: id,
  sessionIds: sessionIds.map(sid),
  createdAt: options.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('workspaceForSession', () => {
  it('returns the owning workspace and undefined when ungrouped', () => {
    const workspaces = [workspace('alpha', ['a1']), workspace('beta', ['b1'])]
    expect(workspaceForSession(sid('a1'), workspaces)?.workspaceId).toBe(wid('alpha'))
    expect(workspaceForSession(sid('orphan'), workspaces)).toBeUndefined()
  })
})

describe('resolveRecentWorkspaceId', () => {
  it('prefers the workspace with the newest session activity', () => {
    const workspaces = [
      workspace('old', ['a'], { createdAt: '2026-01-01T00:00:00.000Z' }),
      workspace('new', ['b'], { createdAt: '2026-01-01T00:00:00.000Z' }),
    ]
    const sessions = [
      wireSummary('a', 10),
      wireSummary('b', 99),
    ]
    expect(resolveRecentWorkspaceId(workspaces, sessions)).toBe(wid('new'))
  })

  it('falls back to workspace createdAt when no sessions are listed', () => {
    const workspaces = [
      workspace('older', [], { createdAt: '2026-01-01T00:00:00.000Z' }),
      workspace('newer', [], { createdAt: '2026-06-01T00:00:00.000Z' }),
    ]
    expect(resolveRecentWorkspaceId(workspaces, [])).toBe(wid('newer'))
  })
})

describe('findReusableBlankSession', () => {
  it('reuses a blank session that matches workspace membership and path', () => {
    const ws = workspace('demo', ['blank', 'busy'], { path: '/projects/demo' })
    const sessions = [
      wireSummary('blank', 1, { blank: true, cwd: '/projects/demo' }),
      wireSummary('busy', 2, { blank: false, cwd: '/projects/demo' }),
    ]
    expect(findReusableBlankSession(ws, sessions, [])).toBe(sid('blank'))
  })

  it('skips archived blanks and path mismatches', () => {
    const ws = workspace('demo', ['archived', 'other'], { path: '/projects/demo' })
    const sessions = [
      wireSummary('archived', 1, { blank: true, cwd: '/projects/demo' }),
      wireSummary('other', 2, { blank: true, cwd: '/elsewhere' }),
    ]
    expect(findReusableBlankSession(ws, sessions, [sid('archived')])).toBeUndefined()
  })
})

describe('resolveDefaultWorkspaceId', () => {
  it('returns the first workspace when no recent activity exists', () => {
    const workspaces = [workspace('only', [])]
    expect(resolveDefaultWorkspaceId(workspaces, [])).toBe(wid('only'))
  })

  it('returns undefined when the registry is empty', () => {
    expect(resolveDefaultWorkspaceId([], [])).toBeUndefined()
  })
})
