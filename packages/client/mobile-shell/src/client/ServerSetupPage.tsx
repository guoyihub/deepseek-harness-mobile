import { useCallback, useState } from 'react'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { MobileShellLayout } from './MobileShellLayout.tsx'
import {
  probeMobileServerUrl,
  readStoredServerUrl,
  saveMobileServerUrl,
} from './mobile-server-config.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link ServerSetupPage}. */
export interface ServerSetupPageProps {
  /** Whether the user can skip back to home (already configured once). */
  allowBack?: boolean
  /** Navigate back without saving. */
  onBack?: () => void
  /** Called after a server URL is saved successfully. */
  onConfigured: () => void
}

/**
 * First-run and settings flow for configuring the deployed Mobile server URL.
 * @param props - navigation and completion callbacks.
 */
export function ServerSetupPage({
  allowBack = false,
  onBack,
  onConfigured,
}: ServerSetupPageProps): JSX.Element {
  const [serverUrl, setServerUrl] = useState(() => readStoredServerUrl() ?? '')
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const onTest = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(false)
    setStatus('正在测试连接…')
    try {
      await probeMobileServerUrl(serverUrl)
      setStatus('连接成功，可以保存')
    } catch (testError) {
      setError(true)
      setStatus(testError instanceof Error ? testError.message : String(testError))
    } finally {
      setBusy(false)
    }
  }, [serverUrl])

  const onSave = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(false)
    setStatus('正在保存…')
    try {
      await saveMobileServerUrl(serverUrl)
      setStatus(undefined)
      onConfigured()
    } catch (saveError) {
      setError(true)
      setStatus(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setBusy(false)
    }
  }, [onConfigured, serverUrl])

  return (
    <MobileShellLayout
      title={mobileConversationT('server.title')}
      {...(allowBack && onBack !== undefined ? { onBack } : {})}
    >
      <div className={css.settingsPage}>
        <section className={css.settingsCard}>
          <p className={css.statusText}>
            {mobileConversationT('server.descriptionBefore')}
            {' '}
            <code>{mobileConversationT('server.exampleUrl')}</code>
            {mobileConversationT('server.descriptionAfter')}
          </p>
          <label className={css.pairField}>
            <span className={css.pairFieldLabel}>{mobileConversationT('settings.mobileServer')}</span>
            <input
              className={css.pairInput}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={mobileConversationT('server.exampleUrl')}
              aria-label={mobileConversationT('server.addressLabel')}
              value={serverUrl}
              disabled={busy}
              onChange={(event) => {
                setServerUrl(event.target.value)
                setStatus(undefined)
                setError(false)
              }}
            />
          </label>
          {status !== undefined && (
            <p className={`${css.statusText} ${error ? css.statusTextError : ''}`}>{status}</p>
          )}
        </section>

        <div className={css.settingsActions}>
          <Button variant="outline" size="md" disabled={busy} onClick={() => { void onTest() }}>
            {mobileConversationT('server.testConnection')}
          </Button>
          <button type="button" className={css.settingsPrimaryBtn} disabled={busy} onClick={() => { void onSave() }}>
            {mobileConversationT('server.saveContinue')}
          </button>
        </div>
      </div>
    </MobileShellLayout>
  )
}
