import { useState } from 'react'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import { clearPairingStorage } from './mobile-session.ts'
import {
  applyMobileTheme,
  readMobileThemePreference,
  writeMobileThemePreference,
  type MobileThemePreference,
} from './mobile-theme.ts'
import { StatusPanel } from './StatusPanel.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link ConnectionPage}. */
export interface ConnectionPageProps {
  /** Navigate back to home. */
  onBack: () => void
  /** Navigate to the scan pairing flow. */
  onPair: () => void
}

const THEME_OPTIONS: readonly { id: MobileThemePreference; label: string }[] = [
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
  { id: 'system', label: '跟随系统' },
]

/**
 * Connection management page: host facts, scopes summary, and disconnect.
 * @param props - navigation callbacks.
 */
export function ConnectionPage({ onBack, onPair }: ConnectionPageProps): JSX.Element {
  const {
    paired,
    hostBase,
    hostDescription,
    connectionState,
    revoked,
    error,
    disconnect,
    reloadPairing,
  } = useMobileConnection()
  const [theme, setTheme] = useState<MobileThemePreference>(() => readMobileThemePreference())

  const onThemeChange = (next: MobileThemePreference): void => {
    setTheme(next)
    writeMobileThemePreference(next)
    applyMobileTheme(next)
  }

  const onDisconnect = (): void => {
    clearPairingStorage()
    disconnect()
    reloadPairing()
  }

  const statusLabel = revoked
    ? '已吊销'
    : connectionState === 'reconnecting'
      ? '重连中'
      : connectionState === 'connected'
        ? '已连接'
        : '未连接'

  const statusDotClass = revoked
    ? css.settingsStatusOffline
    : connectionState === 'connected'
      ? css.settingsStatusOnline
      : paired
        ? css.settingsStatusError
        : css.settingsStatusOffline

  return (
    <MobileShellLayout title="连接管理" onBack={onBack}>
      <div className={css.settingsPage}>
        <StatusPanel
          error={revoked ? '设备已被桌面吊销，请重新扫码连接' : error}
        />

        <section className={css.settingsCard} aria-label="主机连接">
          <div className={css.settingsStatusRow}>
            <span className={`${css.settingsStatusDot} ${statusDotClass}`} aria-hidden="true" />
            <span className={css.settingsStatusLabel}>{statusLabel}</span>
          </div>
          <dl className={css.settingsList}>
            <div className={css.settingsRow}>
              <dt>主机</dt>
              <dd>{hostDescription?.provider ?? 'DSH Host'}</dd>
            </div>
            <div className={css.settingsRow}>
              <dt>地址</dt>
              <dd>{hostBase ?? '未知地址'}</dd>
            </div>
            {hostDescription?.model !== undefined && hostDescription.model !== '' && (
              <div className={css.settingsRow}>
                <dt>模型</dt>
                <dd>{hostDescription.model}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={css.settingsSection}>
          <h2 className={css.settingsSectionLabel}>外观</h2>
          <div className={css.settingsSegment} role="radiogroup" aria-label="外观">
            {THEME_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={theme === option.id}
                className={css.settingsSegmentBtn}
                data-active={theme === option.id || undefined}
                onClick={() => { onThemeChange(option.id) }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className={css.settingsSection}>
          <h2 className={css.settingsSectionLabel}>权限</h2>
          <div className={css.settingsCard}>
            <dl className={css.settingsList}>
              <div className={css.settingsRow}>
                <dt>已授权</dt>
                <dd>查看与继续 Agent 任务</dd>
              </div>
              <div className={css.settingsRow}>
                <dt>未授权</dt>
                <dd>修改系统设置与凭证（仅桌面）</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className={css.settingsActions}>
          <button type="button" className={css.settingsPrimaryBtn} onClick={onPair}>
            {paired ? '重新扫码连接' : '扫码连接电脑'}
          </button>
          {paired && (
            <button type="button" className={css.settingsDangerBtn} onClick={onDisconnect}>
              断开连接
            </button>
          )}
        </div>
      </div>
    </MobileShellLayout>
  )
}
