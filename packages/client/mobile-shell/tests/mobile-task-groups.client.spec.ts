import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { UNGROUPED_KEY } from '@deepseek-ai/dsh-client-ui-workspace/src/client/tree.ts'
import {
  deriveMobileTaskGroups,
  groupDisplayLabel,
  mobileUngroupedLabel,
  visibleWireSessions,
} from '../src/client/mobile-task-groups.ts'
import { zh } from '../src/client/locales.ts'

const sid = (id: string): SessionId => id as SessionId
const wid = (id: string): WorkspaceId => id as WorkspaceId

const wireSummary = (id: string, updatedAt: number, cwd?: string): SessionSummary => ({
  sessionId: sid(id),
  updatedAt,
  running: false,
  blank: false,
  ...(cwd === undefined ? {} : { cwd }),
})

const workspace = (id: string, sessionIds: string[], title = id): WorkspaceView => ({
  workspaceId: wid(id),
  path: `/projects/${id}`,
  title,
  sessionIds: sessionIds.map(sid),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('deriveMobileTaskGroups', () => {
  it('groups sessions under workspaces and hides archived rows', () => {
    const sessions = [
      wireSummary('owned', 1, '/projects/first'),
      wireSummary('loose', 9, '/other'),
      wireSummary('archived', 5, '/projects/first'),
    ]
    const groups = deriveMobileTaskGroups(
      sessions,
      [workspace('first', ['owned', 'archived'])],
      [sid('archived')],
    )
    expect(groups.map(group => group.key)).toEqual(['first', UNGROUPED_KEY])
    expect(groups[0]?.sessions.map(session => session.id)).toEqual([sid('owned')])
    expect(groups[1]?.sessions.map(session => session.id)).toEqual([sid('loose')])
  })

  it('labels the ungrouped bucket for mobile copy', () => {
    const groups = deriveMobileTaskGroups(
      [wireSummary('loose', 9)],
      [],
      [],
    )
    expect(groupDisplayLabel(groups[0]!)).toBe(mobileUngroupedLabel())
    expect(mobileUngroupedLabel()).toBe(zh['workspace.ungrouped'])
  })

  it('honors caller-supplied expanded group keys', () => {
    const sessions = [
      wireSummary('owned', 1, '/projects/first'),
      wireSummary('other', 2, '/projects/second'),
    ]
    const groups = deriveMobileTaskGroups(
      sessions,
      [workspace('first', ['owned']), workspace('second', ['other'])],
      [],
      undefined,
      ['second'],
    )
    expect(groups[0]?.expanded).toBe(false)
    expect(groups[0]?.sessions).toEqual([])
    expect(groups[1]?.expanded).toBe(true)
    expect(groups[1]?.sessions.map(session => session.id)).toEqual([sid('other')])
  })
})

describe('visibleWireSessions', () => {
  it('returns only non-archived visible sessions for search', () => {
    const sessions = [
      wireSummary('shown', 1),
      wireSummary('archived', 2),
    ]
    expect(visibleWireSessions(sessions, [], [sid('archived')]).map(item => item.sessionId)).toEqual([
      sid('shown'),
    ])
  })
})
