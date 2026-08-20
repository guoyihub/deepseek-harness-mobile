/** Session row verbs for the mobile task home (aligned with desktop Workspace rows). */

import type { SessionId, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import { mobileApi } from './mobile-api-client.ts'

/**
 * Rename one session through `session.rename`.
 * @param sessionId - target session.
 * @param title - raw title; Host normalizes and may reject empty.
 */
export async function renameMobileSession(sessionId: SessionId, title: string): Promise<string> {
  const response = await mobileApi.sessions.rename({ sessionId, title })
  if (!response.result.ok) throw new Error(response.result.error.message)
  return response.result.value.title
}

/**
 * Fork one session at its last completed turn through `session.fork`.
 * @param sessionId - source session.
 * @returns child session id.
 */
export async function forkMobileSession(sessionId: SessionId): Promise<SessionId> {
  const response = await mobileApi.sessions.fork({ sessionId })
  if (!response.result.ok) throw new Error(response.result.error.message)
  return response.result.value.sessionId
}

/**
 * Archive one session into the registry-global set (hides from grouping surfaces).
 * @param sessionId - session to archive.
 * @returns updated archive id list from Host.
 */
export async function archiveMobileSession(sessionId: SessionId): Promise<readonly SessionId[]> {
  const response = await mobileApi.workspace.archiveSession({ sessionId })
  if (!response.result.ok) throw new Error(response.result.error.message)
  return response.result.value.archivedSessionIds
}

/**
 * Archive many sessions sequentially; stop on the first failure.
 * @param sessionIds - sessions to archive.
 * @returns final archive id list from the last successful call.
 */
export async function archiveMobileSessions(
  sessionIds: readonly SessionId[],
): Promise<readonly SessionId[]> {
  let archived: readonly SessionId[] = []
  for (const sessionId of sessionIds) {
    archived = await archiveMobileSession(sessionId)
  }
  return archived
}

/**
 * Pin sessions to the top of their Host workspace order (`insertSessionBefore`).
 * Ungrouped sessions have no workspace account and cannot be pinned.
 * @param sessionIds - sessions to pin (list order top→bottom; first ends on top).
 * @param workspaces - current workspace.list rows.
 * @returns how many sessions were moved.
 */
export async function pinMobileSessions(
  sessionIds: readonly SessionId[],
  workspaces: readonly WorkspaceView[],
): Promise<number> {
  const workspaceById = new Map(workspaces.map(item => [item.workspaceId, {
    workspaceId: item.workspaceId,
    sessionIds: [...item.sessionIds],
  }]))
  const byWorkspace = new Map<WorkspaceId, SessionId[]>()
  let skippedUngrouped = 0
  for (const sessionId of sessionIds) {
    const owner = workspaces.find(item => item.sessionIds.includes(sessionId))
    if (owner === undefined) {
      skippedUngrouped += 1
      continue
    }
    const bucket = byWorkspace.get(owner.workspaceId)
    if (bucket === undefined) byWorkspace.set(owner.workspaceId, [sessionId])
    else bucket.push(sessionId)
  }
  let moved = 0
  for (const [workspaceId, ids] of byWorkspace) {
    const workspace = workspaceById.get(workspaceId)
    if (workspace === undefined) continue
    for (let index = ids.length - 1; index >= 0; index -= 1) {
      const sessionId = ids[index]
      if (sessionId === undefined) continue
      const head = workspace.sessionIds[0]
      if (head === sessionId) {
        moved += 1
        continue
      }
      const response = await mobileApi.workspace.insertSessionBefore({
        workspaceId,
        sessionId,
        ...(head === undefined ? {} : { beforeSessionId: head }),
      })
      if (!response.result.ok) throw new Error(response.result.error.message)
      workspace.sessionIds = [...response.result.value.workspace.sessionIds]
      moved += 1
    }
  }
  if (moved === 0 && skippedUngrouped > 0) {
    throw new Error('未分组会话无法置顶，请先归属到工作区')
  }
  return moved
}
