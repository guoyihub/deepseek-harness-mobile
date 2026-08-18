/**
 * Settings page for DSH Mobile: public base, password policy, QR,
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
    mobilePublicBaseDraft,
    setMobilePublicBaseDraft,
    settingsBusy,
    settingsMessage,
    onSavePasswordSettings,
    onConfirm,
    onDeny,
    onRevoke,
  } = useMobilePairing(true)

  const activeDevices = devices.filter(item => !item.revoked)

  return (
    <div className={css.settingsPage}>
      <p className={css.settingsLead}>
        配置手机连接方式与已连接设备。侧栏「手机连接」只展示扫码二维码。
      </p>

      {error !== undefined && <p className={css.error}>{error}</p>}

      <section className={css.settingsSection}>
        <h3 className={css.sectionTitle}>手机端访问地址（穿透 / Vite）</h3>
        <label className={css.passwordField}>
          Mobile 公网或局域网地址
          <Input
            value={mobilePublicBaseDraft}
            disabled={settingsBusy}
            placeholder="例如 https://xxx.natappfree.cc 或 http://192.168.1.10:8030"
            onChange={(event) => { setMobilePublicBaseDraft(event.target.value) }}
          />
        </label>
        <p className={css.settingsHint}>
          二维码会打开该地址上的 Mobile 页；手机通过同源 `/api` 与 WebSocket 代理访问本机 Host，勿再填 127.0.0.1。
        </p>
      </section>

      <section className={css.settingsSection}>
        <h3 className={css.sectionTitle}>连接验证</h3>
        <div className={css.settingsRow}>
          <label className={css.modeLabel}>
            <input
              type="radio"
              name="settings-pair-password-mode"
              checked={passwordMode === 'none'}
              disabled={settingsBusy}
              onChange={() => { setPasswordMode('none') }}
            />
            无密码（扫码后直接配对）
          </label>
          <label className={css.modeLabel}>
            <input
              type="radio"
              name="settings-pair-password-mode"
              checked={passwordMode === 'required'}
              disabled={settingsBusy}
              onChange={() => { setPasswordMode('required') }}
            />
            需要密码（手机端需输入连接密码）
          </label>
        </div>
        {passwordMode === 'required' && (
          <label className={css.passwordField}>
            连接密码
            <Input
              type="password"
              value={passwordDraft}
              disabled={settingsBusy}
              placeholder="设置手机连接时需输入的密码"
              onChange={(event) => { setPasswordDraft(event.target.value) }}
            />
          </label>
        )}
        <div className={css.settingsActions}>
          <Button variant="primary" disabled={settingsBusy} onClick={() => { void onSavePasswordSettings() }}>
            保存并刷新二维码
          </Button>
          {settingsMessage !== undefined && <span className={css.settingsHint}>{settingsMessage}</span>}
        </div>
      </section>

      <section className={css.settingsSection}>
        <h3 className={css.sectionTitle}>连接二维码</h3>
        <MobilePairQrBlock qrDataUrl={qrDataUrl} />
        <div className={css.metaRow}>
          <span>连接密码：<span className={css.metaStrong}>{offer?.passwordRequired === true ? '已启用' : '未启用'}</span></span>
          <span>QR 有效期：<span className={css.metaStrong}>{ttl || '—'}</span></span>
        </div>
      </section>

      {offer?.confirmMode === 'strict' && (
        <section className={css.settingsSection}>
          <h3 className={css.sectionTitle}>待确认设备</h3>
          {pending.length === 0
            ? <p className={css.empty}>暂无待确认请求</p>
            : (
              <div className={css.list}>
                {pending.map(item => (
                  <div key={item.deviceId} className={css.row}>
                    <div className={css.rowMeta}>
                      <span className={css.rowTitle}>{item.deviceLabel}</span>
                      <span className={css.rowSub}>{item.clientVersion}</span>
                    </div>
                    <div className={css.rowActions}>
                      <Button variant="primary" onClick={() => { void onConfirm(item.deviceId) }}>允许</Button>
                      <Button variant="outline" onClick={() => { void onDeny(item.deviceId) }}>拒绝</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>
      )}

      <section className={css.settingsSection}>
        <h3 className={css.sectionTitle}>已连接设备</h3>
        {activeDevices.length === 0
          ? <p className={css.empty}>暂无已配对设备</p>
          : (
            <div className={css.list}>
              {activeDevices.map(item => (
                <div key={item.deviceId} className={css.row}>
                  <div className={css.rowMeta}>
                    <span className={css.rowTitle}>{item.label}</span>
                    <span className={css.rowSub}>{item.deviceId.slice(0, 8)} · {item.issuedAt}</span>
                  </div>
                  <Button variant="outline" onClick={() => { void onRevoke(item.deviceId) }}>吊销</Button>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  )
}
