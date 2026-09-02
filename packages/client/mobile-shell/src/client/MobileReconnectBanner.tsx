/** In-app reconnect strip for Home and Chat when the Host generation is down. */

import { useMobileConnection } from './MobileConnectionContext.tsx'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/**
 * Show connecting / disconnected copy plus an immediate retry control.
 */
export function MobileReconnectBanner(): JSX.Element | null {
  const { paired, revoked, connectionState, reconnectNow } = useMobileConnection()
  if (!paired || revoked) return null
  if (connectionState === 'connected' || connectionState === null) return null
  const connecting = connectionState === 'connecting'
  return (
    <div className={css.reconnectBanner} role="status">
      <span>
        {connecting
          ? mobileConversationT('connection.bannerConnecting')
          : mobileConversationT('connection.bannerDisconnected')}
      </span>
      <button type="button" className={css.reconnectBannerAction} onClick={reconnectNow}>
        {mobileConversationT('connection.retryNow')}
      </button>
    </div>
  )
}
