import { useState } from 'react'
import { Button, ConnectionBanner } from '@deepseek-ai/dsh-client-ui-primitives'
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
  /** Navigate to pairing after disconnect. */
  onPair: () => void
}

const THEME_OPTIONS: readonly MobileThemePreference[] = ['light', 'dark', 'system']

/**
 * Connection management page: host facts, scopes summary, and disconnect.
 * @param props - navigation callbacks.
 */
export function ConnectionPage({ onBack, onPair }: ConnectionPageProps): JSX.Element {
  const {
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
    onPair()
  }

  return (
    <>
      <ConnectionBanner reconnecting={connectionState === 'reconnecting'} />
      <MobileShellLayout title="连接管理" onBack={onBack}>
        <div className={css.formStack}>
          <div className={css.connectionBar}>
            <span className={css.connectionDot} aria-hidden="true" />
            <span className={css.connectionMeta}>
              <span className={css.connectionHost}>
                {hostDescription?.provider ?? 'MetaCode Host'}
              </span>
              <span className={css.connectionAddress}>{hostBase ?? '未知地址'}</span>
            </span>
          </div>
          <StatusPanel
            error={revoked ? '设备已被桌面吊销，请重新扫码连接' : error}
          />
          <div>
            <h2 className={css.sectionTitle}>外观</h2>
            <div className={css.segmentRow}>
              {THEME_OPTIONS.map(option => (
                <Button
                  key={option}
                  variant={theme === option ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => { onThemeChange(option) }}
                >
                  {option === 'light' ? '浅色' : option === 'dark' ? '深色' : '跟随系统'}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h2 className={css.sectionTitle}>权限摘要</h2>
            <p className={css.statusText}>已授权：查看与继续 Agent 任务</p>
            <p className={css.statusText}>未授权：修改系统设置与凭证（仅桌面）</p>
          </div>
          <div className={css.actionRow}>
            <Button variant="outline" onClick={onPair}>重新扫码</Button>
            <Button variant="ghost" onClick={onDisconnect}>断开连接</Button>
          </div>
        </div>
      </MobileShellLayout>
    </>
  )
}
