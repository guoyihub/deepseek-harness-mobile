import { useEffect, useMemo, useState } from 'react'

import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { ChatPage } from './ChatPage.tsx'

import { ConnectionPage } from './ConnectionPage.tsx'

import { HomePage } from './HomePage.tsx'

import { MobileConnectionProvider } from './MobileConnectionContext.tsx'

import { PairPage } from './PairPage.tsx'

import { TaskListPage } from './TaskListPage.tsx'

import {
  applyMobileTheme,
  dismissA2hsHint,
  isA2hsDismissed,
  isStandaloneDisplayMode,
  readMobileThemePreference,
  subscribeMobileTheme,
} from './mobile-theme.ts'

import { readPairingLaunchContext } from './pairing-launch.ts'

import css from './mobile-shell.module.css'

/** Mobile shell route discriminant. */
type MobileRoute =
  | { page: 'home' }
  | { page: 'pair' }
  | { page: 'tasks' }
  | { page: 'chat'; sessionId: SessionId }
  | { page: 'connection' }

/**
 * MetaCode Mobile PWA shell: pairing, task list, and minimal chat.
 */
export function MobileApp(): JSX.Element {
  const launch = readPairingLaunchContext()
  const [pairLaunchRaw] = useState(() => launch.initialRaw)
  const [route, setRoute] = useState<MobileRoute>(() => (
    launch.startPairPage ? { page: 'pair' } : { page: 'home' }
  ))
  const [showA2hs, setShowA2hs] = useState(false)

  useEffect(() => {
    const preference = readMobileThemePreference()
    applyMobileTheme(preference)
    return subscribeMobileTheme(preference, () => { applyMobileTheme(readMobileThemePreference()) })
  }, [])

  useEffect(() => {
    if (isStandaloneDisplayMode() || isA2hsDismissed()) return
    setShowA2hs(true)
  }, [])

  const body = useMemo(() => {
    switch (route.page) {
      case 'home':
        return (
          <HomePage
            onPair={() => { setRoute({ page: 'pair' }) }}
            onOpenTasks={() => { setRoute({ page: 'tasks' }) }}
            onOpenChat={(sessionId) => { setRoute({ page: 'chat', sessionId }) }}
            onOpenConnection={() => { setRoute({ page: 'connection' }) }}
          />
        )
      case 'pair':
        return (
          <PairPage
            initialPairingRaw={pairLaunchRaw}
            autoStartCamera={pairLaunchRaw === undefined}
            onBack={() => { setRoute({ page: 'home' }) }}
            onPaired={() => {
              if (!isStandaloneDisplayMode() && !isA2hsDismissed()) setShowA2hs(true)
              setRoute({ page: 'tasks' })
            }}
          />
        )
      case 'tasks':
        return (
          <TaskListPage
            onBack={() => { setRoute({ page: 'home' }) }}
            onOpenChat={(sessionId) => { setRoute({ page: 'chat', sessionId }) }}
          />
        )
      case 'chat':
        return (
          <ChatPage
            sessionId={route.sessionId}
            onBack={() => { setRoute({ page: 'tasks' }) }}
          />
        )
      case 'connection':
        return (
          <ConnectionPage
            onBack={() => { setRoute({ page: 'home' }) }}
            onPair={() => { setRoute({ page: 'pair' }) }}
          />
        )
    }
  }, [pairLaunchRaw, route])

  return (
    <MobileConnectionProvider>
      {showA2hs && (
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
    </MobileConnectionProvider>
  )
}
