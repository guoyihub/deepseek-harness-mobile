/** Desktop Web UI for LAN mobile pairing. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { MobilePairTrigger } from './MobilePairTrigger.tsx'

/** Required services for sidebar slot registration. */
export const inject = ['slots']

/**
 * Register the sidebar footer trigger and pairing modal.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'mobile-pairing',
    order: 10,
  }, MobilePairTrigger))
}

export { MobilePairModal } from './MobilePairModal.tsx'
export { MobilePairTrigger } from './MobilePairTrigger.tsx'
