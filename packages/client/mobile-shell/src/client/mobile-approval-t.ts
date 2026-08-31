/** `approval` namespace copy for the mobile composer takeover. */

import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-approval/client'
import { zh } from '@deepseek-ai/dsh-client-ui-approval/src/client/locales.ts'

/** Mobile-facing approval composer locale seat. */
export const mobileApprovalT: TranslateNS<'approval'> = key => (
  zh[key as keyof typeof zh] ?? key
)
