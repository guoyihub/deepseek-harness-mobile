/** Shared browser API client for the mobile PWA shell. */

import { WebApiClient } from '@deepseek-ai/dsh-client-connection/client'

/** Shared mobile PWA API client instance (includes `command.execute`). */
export const mobileApi = new WebApiClient()
