import { useCallback, useState } from 'react'

import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

import { MobileShellLayout } from './MobileShellLayout.tsx'
import {
  probeMobileServerUrl,
  readStoredServerUrl,
  saveMobileServerUrl,
} from './mobile-server-config.ts'
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
      title="服务器地址"
      {...(allowBack && onBack !== undefined ? { onBack } : {})}
    >
      <div className={css.settingsPage}>
        <section className={css.settingsCard}>
          <p className={css.statusText}>
            输入已部署的 Mobile 服务外网地址。App 将通过该地址访问 Host API（例如
            {' '}
            <code>https://mobile.example.com</code>
            ）。
          </p>
          <label className={css.pairField}>
            <span className={css.pairFieldLabel}>Mobile 服务器</span>
            <input
              className={css.pairInput}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://mobile.example.com"
              aria-label="Mobile 服务器地址"
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
            测试连接
          </Button>
          <button type="button" className={css.settingsPrimaryBtn} disabled={busy} onClick={() => { void onSave() }}>
            保存并继续
          </button>
        </div>
      </div>
    </MobileShellLayout>
  )
}
