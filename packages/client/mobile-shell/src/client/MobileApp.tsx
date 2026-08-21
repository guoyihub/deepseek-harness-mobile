import { useEffect, useMemo, useState } from 'react'

import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { ChatPage } from './ChatPage.tsx'

import { ConnectionPage } from './ConnectionPage.tsx'

import { HomePage } from './HomePage.tsx'

import { MobileConnectionProvider } from './MobileConnectionContext.tsx'

import { PairPage } from './PairPage.tsx'

import {
  applyMobileTheme,
  dismissA2hsHint,
  isA2hsDismissed,
  isStandaloneDisplayMode,
  readMobileThemePreference,
  subscribeMobileTheme,
} from './mobile-theme.ts'

import { readPairingLaunchContext } from './pairing-launch.ts'

import { ServerSetupPage } from './ServerSetupPage.tsx'

import { isNativeShell, readStoredServerUrl } from '@deepseek-ai/dsh-client-connection/client'

import { MobileViewportShell } from './MobileViewportShell.tsx'
import css from './mobile-shell.module.css'

/** Mobile shell route discriminant. */
type MobileRoute =
  | { page: 'server-setup'; returnTo?: 'connection' }
  | { page: 'home' }
  | { page: 'pair' }
  | { page: 'chat'; sessionId: SessionId; draft?: string }
  | { page: 'connection' }

function resolveInitialRoute(launch: ReturnType<typeof readPairingLaunchContext>): MobileRoute {
  if (isNativeShell() && readStoredServerUrl() === undefined) return { page: 'server-setup' }
  if (launch.startPairPage) return { page: 'pair' }
  return { page: 'home' }
}

/**
 * DeepSeek Harness Mobile PWA shell: pairing, task list, and minimal chat.
 */
export function MobileApp(): JSX.Element {
  const launch = readPairingLaunchContext()
  const [pairLaunchRaw] = useState(() => launch.initialRaw)
  const [route, setRoute] = useState<MobileRoute>(() => resolveInitialRoute(launch))
  const [showA2hs, setShowA2hs] = useState(false)

  useEffect(() => {
    const preference = readMobileThemePreference()
    applyMobileTheme(preference)
    return subscribeMobileTheme(preference, () => { applyMobileTheme(readMobileThemePreference()) })
  }, [])

  useEffect(() => {
    if (isNativeShell() || isStandaloneDisplayMode() || isA2hsDismissed()) return
    setShowA2hs(true)
  }, [])

  const body = useMemo(() => {
    switch (route.page) {
      case 'server-setup':
        return (
          <ServerSetupPage
            allowBack={readStoredServerUrl() !== undefined}
            {...(readStoredServerUrl() !== undefined
              ? {
                onBack: () => {
                  setRoute(route.returnTo === 'connection' ? { page: 'connection' } : { page: 'home' })
                },
              }
              : {})}
            onConfigured={() => {
              if (route.returnTo === 'connection') {
                setRoute({ page: 'connection' })
                return
              }
              setRoute(launch.startPairPage ? { page: 'pair' } : { page: 'home' })
            }}
          />
        )
      case 'home':
      case 'connection':
        return (
          <HomePage
            onPair={() => { setRoute({ page: 'pair' }) }}
            onOpenChat={(sessionId) => { setRoute({ page: 'chat', sessionId }) }}
            onOpenConnection={() => { setRoute({ page: 'connection' }) }}
          />
        )
      case 'pair':
        return (
          <PairPage
            {...(pairLaunchRaw !== undefined ? { initialPairingRaw: pairLaunchRaw } : {})}
            autoStartCamera={pairLaunchRaw === undefined}
            onBack={() => { setRoute({ page: 'home' }) }}
            onPaired={() => {
              if (!isStandaloneDisplayMode() && !isA2hsDismissed()) setShowA2hs(true)
              setRoute({ page: 'home' })
            }}
          />
        )
      case 'chat':
        return (
          <ChatPage
            sessionId={route.sessionId}
            {...(route.draft !== undefined ? { initialDraft: route.draft } : {})}
            onBack={() => { setRoute({ page: 'home' }) }}
            onSessionChange={(nextSessionId, draft) => { setRoute({ page: 'chat', sessionId: nextSessionId, draft }) }}
          />
        )
    }
  }, [launch.startPairPage, pairLaunchRaw, route])

  const connectionOverlay = route.page === 'connection'
    ? (
      <ConnectionPage
        onBack={() => { setRoute({ page: 'home' }) }}
        onPair={() => { setRoute({ page: 'pair' }) }}
        onEditServer={() => { setRoute({ page: 'server-setup', returnTo: 'connection' }) }}
      />
    )
    : null

  return (
    <MobileConnectionProvider>
      <MobileViewportShell>
        {showA2hs && !isNativeShell() && (
          <div className={css.a2hsBanner}>
            <p className={css.a2hsText}>添加到主屏幕，获得更接近 App 的体验。</p>
            <div className={css.actionRow}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  dismissA2hsHint()
                  setShowA2hs(false)
                }}
              >
                知道了
              </Button>
            </div>
          </div>
        )}
        {body}
        {connectionOverlay}
      </MobileViewportShell>
    </MobileConnectionProvider>
  )
}
