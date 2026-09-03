/**
 * Settings page for DSH Mobile: password policy, QR,
 * pending approval, and paired device revoke.
 */

import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { MobilePairQrBlock } from './MobilePairQrBlock.tsx'
import { useMobilePairing } from './use-mobile-pairing.ts'
import css from './mobile-pairing.module.css'

/** Full component props for the DSH Mobile settings section. */
export type MobilePairSettingsSectionProps = PropsRuntime<'settings.section'>

/**
 * Render the DSH Mobile settings page.
 * @param _props - section owner share (`close` unused).
 */
export function MobilePairSettingsSection(_props: MobilePairSettingsSectionProps): JSX.Element {
  void _props
  const {
    offer,
    qrDataUrl,
    pending,
    devices,
    error,
    ttl,
    passwordMode,
    setPasswordMode,
    passwordDraft,
    setPasswordDraft,
    settingsBusy,
    settingsMessage,
    onSavePasswordSettings,
    onConfirm,
    onDeny,
    onRevoke,
  } = useMobilePairing(true)

  return (
    <div className={css.section}>
      <h2 className={css.heading}>DSH 移动端</h2>
      <p className={css.intro}>
        手机通过 Mobile 同源代理访问本机 Host。侧栏「手机连接」可快速扫码；此处管理连接验证与已配对设备。
      </p>

      {error !== undefined && <p className={css.error} role="alert">{error}</p>}

      <div className={css.heroGrid}>
        <section className={css.card} aria-labelledby="mobile-pair-qr-heading">
          <h3 className={css.cardTitle} id="mobile-pair-qr-heading">连接二维码</h3>
          <MobilePairQrBlock qrDataUrl={qrDataUrl} embedded />
          <dl className={css.metaList}>
            <div className={css.metaItem}>
              <dt>连接密码</dt>
              <dd>{offer?.passwordRequired === true ? '已启用' : '未启用'}</dd>
            </div>
            <div className={css.metaItem}>
              <dt>QR 有效期</dt>
              <dd>{ttl || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className={css.card} aria-labelledby="mobile-pair-auth-heading">
          <h3 className={css.cardTitle} id="mobile-pair-auth-heading">连接验证</h3>
          <div className={css.modeOptions} role="radiogroup" aria-label="连接验证">
            <label className={css.modeOption}>
              <input
                type="radio"
                name="settings-pair-password-mode"
                checked={passwordMode === 'none'}
                disabled={settingsBusy}
                onChange={() => { setPasswordMode('none') }}
              />
              <span className={css.modeCopy}>
                <span className={css.modeTitle}>无密码</span>
                <span className={css.modeHint}>扫码后直接配对</span>
              </span>
            </label>
            <label className={css.modeOption}>
              <input
                type="radio"
                name="settings-pair-password-mode"
                checked={passwordMode === 'required'}
                disabled={settingsBusy}
                onChange={() => { setPasswordMode('required') }}
              />
              <span className={css.modeCopy}>
                <span className={css.modeTitle}>需要密码</span>
                <span className={css.modeHint}>手机端需输入连接密码</span>
              </span>
            </label>
          </div>
          {passwordMode === 'required' && (
            <label className={css.field}>
              <span className={css.fieldLabel}>连接密码</span>
              <Input
                type="password"
                value={passwordDraft}
                disabled={settingsBusy}
                placeholder="设置手机连接时需输入的密码"
                onChange={(event) => { setPasswordDraft(event.target.value) }}
              />
            </label>
          )}
          <div className={css.cardFooter}>
            {settingsMessage !== undefined && (
              <p className={css.status} role="status">{settingsMessage}</p>
            )}
            <Button variant="primary" disabled={settingsBusy} onClick={() => { void onSavePasswordSettings() }}>
              保存
            </Button>
          </div>
        </section>
      </div>

      {offer?.confirmMode === 'strict' && (
        <section className={css.group}>
          <h3 className={css.groupHead}>待确认设备</h3>
          {pending.length === 0
            ? <p className={css.empty}>暂无待确认请求</p>
            : (
              <ul className={css.list}>
                {pending.map(item => (
                  <li key={item.deviceId} className={css.rowCard}>
                    <div className={css.rowMeta}>
                      <span className={css.rowTitle}>{item.deviceLabel}</span>
                      <span className={css.rowSub}>{item.clientVersion}</span>
                    </div>
                    <div className={css.rowActions}>
                      <Button variant="primary" onClick={() => { void onConfirm(item.deviceId) }}>允许</Button>
                      <Button variant="outline" onClick={() => { void onDeny(item.deviceId) }}>拒绝</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      <section className={css.group}>
        <h3 className={css.groupHead}>已连接设备</h3>
        <div className={css.devicePanel}>
          {devices.length === 0
            ? <p className={css.empty}>暂无已配对设备</p>
            : (
              <ul className={css.deviceScrollList}>
                {devices.map(item => (
                  <li key={item.deviceId} className={css.rowCard}>
                    <div className={css.rowMeta}>
                      <span className={css.rowTitle}>{item.label}</span>
                      <span className={css.rowSub}>{item.deviceId.slice(0, 8)} · {item.issuedAt}</span>
                    </div>
                    <Button variant="outline" onClick={() => { void onRevoke(item.deviceId) }}>吊销</Button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>
    </div>
  )
}
