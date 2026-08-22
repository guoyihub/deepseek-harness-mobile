/** Workspace-browser locale seat for the mobile task home session rows. */

import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { WorkspaceBrowserProps } from '@deepseek-ai/dsh-client-ui-workspace/src/client/contract/slots.ts'
import { zh as workspaceZh } from '@deepseek-ai/dsh-client-ui-workspace/src/client/locales.ts'

/** Shared vocabulary used by hover cards but owned outside the workspace namespace. */
const MOBILE_COMMON_OVERRIDES: Record<string, string> = {
  copy: '复制',
}

/**
 * Resolve one workspace-browser string for mobile session rows.
 * @param key - workspace or shared locale key.
 * @param params - optional `{name}` placeholders.
 */
export const mobileWorkspaceT: WorkspaceBrowserProps['t'] = (key, params) => {
  const template = (workspaceZh as Record<string, string>)[key]
    ?? MOBILE_COMMON_OVERRIDES[key]
    ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}
