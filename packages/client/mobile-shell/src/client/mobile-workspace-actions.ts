/** Workspace (task-home group) verbs for the mobile shell. */

import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { mobileApi } from './mobile-api-client.ts'

/**
 * Rename one workspace through `workspace.rename`.
 * @param workspaceId - target workspace.
 * @param title - raw title; Host normalizes and may reject empty or duplicate names.
 */
export async function renameMobileWorkspace(workspaceId: WorkspaceId, title: string): Promise<string> {
  const response = await mobileApi.workspace.rename({ workspaceId, title })
  if (!response.result.ok) throw new Error(response.result.error.message)
  return response.result.value.workspace.title
}

/**
 * Delete one workspace through `workspace.delete`.
 * Sessions remain on Host; only the grouping account is removed.
 * @param workspaceId - workspace to delete.
 */
export async function deleteMobileWorkspace(workspaceId: WorkspaceId): Promise<void> {
  const response = await mobileApi.workspace.delete({ workspaceId })
  if (!response.result.ok) throw new Error(response.result.error.message)
}
