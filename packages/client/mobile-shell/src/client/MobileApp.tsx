import { useEffect, useMemo, useState } from 'react'

import type { SessionId } from '@deepseek-ai/dsh-session/types'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { ChatPage } from './ChatPage.tsx'

import { ConnectionPage } from './ConnectionPage.tsx'

import { HomePage } from './HomePage.tsx'

import { MobileConnectionProvider } from './MobileConnectionContext.tsx'

import { MobilePageStack } from './MobilePageStack.tsx'

import { PairPage } from './PairPage.tsx'

import {
  applyMobileFontSize,
  applyMobileTheme,
  dismissA2hsHint,
  isA2hsDismissed,
  isStandaloneDisplayMode,
  readMobileFontSize,
  readMobileThemePreference,
  subscribeMobileTheme,
} from './mobile-theme.ts'
import {
  applyMobileLanguage,
  readMobileLanguagePreference,
  resolveMobileLanguage,
  writeMobileLanguagePreference,
  type MobileLanguagePreference,
} from './mobile-language.ts'
import { MobileLanguageContext, MobileLanguageSetContext, mobileConversationT } from './mobile-locale.ts'

import { readPairingLaunchContext } from './pairing-launch.ts'

import { ServerSetupPage } from './ServerSetupPage.tsx'

import { isNativeShell, readStoredServerUrl } from '@deepseek-ai/dsh-client-connection/client'

import { MobileViewportShell } from './MobileViewportShell.tsx'
import type { MobileRoute } from './mobile-route.ts'
import { useMobileNavigation } from './useMobileNavigation.ts'
import css from './mobile-shell.module.css'

function resolveInitialRoute(launch: ReturnType<typeof readPairingLaunchContext>): MobileRoute {
  if (isNativeShell() && readStoredServerUrl() === undefined) return { page: 'server-setup' }
  if (launch.startPairPage) return { page: 'pair' }
  return { page: 'home' }
}

function renderRoute(
  route: MobileRoute,
  nav: Pick<ReturnType<typeof useMobileNavigation>, 'push' | 'replace' | 'reset' | 'goBack'>,
  launch: ReturnType<typeof readPairingLaunchContext>,
  pairLaunchRaw: string | undefined,
  onPaired: () => void,
): JSX.Element {
  switch (route.page) {
    case 'server-setup':
      return (
        <ServerSetupPage
          allowBack={readStoredServerUrl() !== undefined}
          {...(readStoredServerUrl() !== undefined ? { onBack: nav.goBack } : {})}
          onConfigured={() => {
            if (route.returnTo === 'connection') {
              nav.replace({ page: 'connection' })
              return
            }
            nav.reset(launch.startPairPage ? { page: 'pair' } : { page: 'home' })
          }}
        />
      )
    case 'home':
      return (
        <HomePage
          onPair={() => { nav.push({ page: 'pair' }) }}
          onOpenChat={(sessionId) => { nav.push({ page: 'chat', sessionId }) }}
          onOpenConnection={() => { nav.push({ page: 'connection' }) }}
        />
      )
    case 'connection':
      return (
        <ConnectionPage
          onBack={nav.goBack}
          onPair={() => { nav.push({ page: 'pair' }) }}
          onEditServer={() => { nav.push({ page: 'server-setup', returnTo: 'connection' }) }}
        />
      )
    case 'pair':
      return (
        <PairPage
          {...(pairLaunchRaw !== undefined ? { initialPairingRaw: pairLaunchRaw } : {})}
          autoStartCamera={pairLaunchRaw === undefined}
          onBack={nav.goBack}
          onPaired={onPaired}
        />
      )
    case 'chat':
      return (
        <ChatPage
          sessionId={route.sessionId}
          {...(route.draft !== undefined ? { initialDraft: route.draft } : {})}
          onBack={nav.goBack}
          onSessionChange={(nextSessionId: SessionId, draft: string) => {
            nav.replace({ page: 'chat', sessionId: nextSessionId, draft })
          }}
        />
      )
  }
}

/**
 * DeepSeek Harness Mobile PWA shell: pairing, task list, and minimal chat.
 */
export function MobileApp(): JSX.Element {
  const launch = readPairingLaunchContext()
  const [pairLaunchRaw] = useState(() => launch.initialRaw)
  const nav = useMobileNavigation(resolveInitialRoute(launch))
  const [showA2hs, setShowA2hs] = useState(false)
  const [languagePreference, setLanguagePreference] = useState(() => readMobileLanguagePreference())
  const language = resolveMobileLanguage(languagePreference)

  useEffect(() => {
    const preference = readMobileThemePreference()
    applyMobileTheme(preference)
    applyMobileFontSize(readMobileFontSize())
    return subscribeMobileTheme(preference, () => { applyMobileTheme(readMobileThemePreference()) })
  }, [])

  useEffect(() => {
    applyMobileLanguage(language)
  }, [language])

  const setLanguage = (preference: MobileLanguagePreference): void => {
    writeMobileLanguagePreference(preference)
    setLanguagePreference(preference)
    applyMobileLanguage(resolveMobileLanguage(preference))
  }

  useEffect(() => {
    if (isNativeShell() || isStandaloneDisplayMode() || isA2hsDismissed()) return
    setShowA2hs(true)
  }, [])

  const { route, transition, previousRoute, push, replace, reset, goBack } = nav

  const onPaired = (): void => {
    if (!isStandaloneDisplayMode() && !isA2hsDismissed()) setShowA2hs(true)
    reset({ page: 'home' })
  }

  const activePage = useMemo(
    () => renderRoute(route, { push, replace, reset, goBack }, launch, pairLaunchRaw, onPaired),
    [goBack, launch, pairLaunchRaw, push, replace, reset, route, language],
  )

  const underlayPage = useMemo(
    () => (previousRoute === undefined
      ? undefined
      : renderRoute(previousRoute, { push, replace, reset, goBack }, launch, pairLaunchRaw, onPaired)),
    [goBack, launch, pairLaunchRaw, previousRoute, push, replace, reset, language],
  )

  return (
    <MobileLanguageSetContext.Provider value={setLanguage}>
      <MobileLanguageContext.Provider value={language}>
        <MobileConnectionProvider>
          <MobileViewportShell>
            {showA2hs && !isNativeShell() && (
              <div className={css.a2hsBanner}>
                <p className={css.a2hsText}>{mobileConversationT('pwa.installHint')}</p>
                <div className={css.actionRow}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      dismissA2hsHint()
                      setShowA2hs(false)
                    }}
                  >
                    {mobileConversationT('common.gotIt')}
                  </Button>
                </div>
              </div>
            )}
            <MobilePageStack transition={transition} underlay={underlayPage}>
              {activePage}
            </MobilePageStack>
          </MobileViewportShell>
        </MobileConnectionProvider>
      </MobileLanguageContext.Provider>
    </MobileLanguageSetContext.Provider>
  )
}
