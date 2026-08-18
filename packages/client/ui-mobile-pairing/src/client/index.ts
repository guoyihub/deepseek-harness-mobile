/** Desktop Web UI for LAN mobile pairing. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { MobilePairSettingsSection } from './MobilePairSettingsSection.tsx'
import { MobilePairTrigger } from './MobilePairTrigger.tsx'

/** Required services for sidebar and settings slot registration. */
export const inject = ['slots']

/**
 * Register the sidebar QR-only trigger and the DSH Mobile settings page.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'mobile-pairing',
    order: 10,
  }, MobilePairTrigger))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-mobile',
    order: 25,
    label: 'DSH 移动端',
  }, MobilePairSettingsSection))
}

export { MobilePairModal } from './MobilePairModal.tsx'
export { MobilePairQrBlock } from './MobilePairQrBlock.tsx'
export { MobilePairSettingsSection } from './MobilePairSettingsSection.tsx'
export { MobilePairTrigger } from './MobilePairTrigger.tsx'
