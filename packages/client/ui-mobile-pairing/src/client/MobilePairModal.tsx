import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  confirmPendingDevice,
  denyPendingDevice,
  fetchPairingOffer,
  fetchPairPasswordSettings,
  fetchPairedDevices,
  fetchPendingDevices,
  formatTtl,
  revokePairedDevice,
  updatePairPasswordSettings,
  type PairingOffer,
  type PairPasswordMode,
  type PairedDeviceView,
  type PendingDeviceView,
} from './desktop-pair-api.ts'
import css from './mobile-pairing.module.css'

/** Props for {@link MobilePairModal}. */
export interface MobilePairModalProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Close handler. */
  onClose: () => void
}

/**
 * Desktop modal for QR display, pending approval, and paired device management.
 * @param props - open state and close callback.
 */
export function MobilePairModal({ open, onClose }: MobilePairModalProps): JSX.Element | null {
  const [offer, setOffer] = useState<PairingOffer | undefined>(undefined)
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<readonly PendingDeviceView[]>([])
  const [devices, setDevices] = useState<readonly PairedDeviceView[]>([])
  const [error, setError] = useState<string | undefined>(undefined)
  const [ttl, setTtl] = useState('')
  const [passwordMode, setPasswordMode] = useState<PairPasswordMode>('none')
  const [passwordDraft, setPasswordDraft] = useState('')
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string | undefined>(undefined)

  const refresh = useCallback(async (): Promise<void> => {
    if (!open) return
    try {
      const nextOffer = await fetchPairingOffer()
      setOffer(nextOffer)
      setQrDataUrl(nextOffer.qrDataUrl)
      setPending(
        nextOffer.confirmMode === 'strict'
          ? await fetchPendingDevices()
          : [],
      )
      setDevices(await fetchPairedDevices())
      setError(undefined)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    void fetchPairPasswordSettings().then((settings) => {
      setPasswordMode(settings.mode)
    }).catch(() => { /* settings load is best-effort */ })
  }, [open])

  useEffect(() => {
    if (!open) return
    void refresh()
    const timer = globalThis.setInterval(() => { void refresh() }, 1000)
    return () => { globalThis.clearInterval(timer) }
  }, [open, refresh])

  useEffect(() => {
    if (!open || offer === undefined) return
    if (offer.passwordRequired) {
      setTtl('长期有效（直至重新生成）')
      return
    }
    const tick = (): void => { setTtl(formatTtl(offer.expiresAt)) }
    tick()
    const timer = globalThis.setInterval(tick, 1000)
    return () => { globalThis.clearInterval(timer) }
  }, [open, offer])

  const onConfirm = async (deviceId: string): Promise<void> => {
    await confirmPendingDevice(deviceId)
    await refresh()
  }

  const onDeny = async (deviceId: string): Promise<void> => {
    await denyPendingDevice(deviceId)
    await refresh()
  }

  const onRevoke = async (deviceId: string): Promise<void> => {
    await revokePairedDevice(deviceId)
    await refresh()
  }

  const onSavePasswordSettings = async (): Promise<void> => {
    setSettingsBusy(true)
    setSettingsMessage(undefined)
    try {
      const next = await updatePairPasswordSettings(
        passwordMode,
        passwordMode === 'required' ? passwordDraft : undefined,
      )
      setPasswordMode(next.mode)
      setSettingsMessage(passwordMode === 'required' ? '已启用连接密码' : '已切换为无密码连接')
      setPasswordDraft('')
      await refresh()
    } catch (saveError) {
      setSettingsMessage(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setSettingsBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="手机连接"
      description={
        offer?.confirmMode === 'strict'
          ? '在同一局域网内扫码或输入配对码；新设备需在下方确认后才会连接。'
          : '在同一局域网内扫码或输入配对码，手机将直接连接本机 MetaCode Host。'
      }
      footer={<Button variant="outline" onClick={onClose}>关闭</Button>}
    >
      <div className={css.mobilePairing}>
        {error !== undefined && <p className={css.error}>{error}</p>}
        <section>
          <h3 className={css.sectionTitle}>连接验证</h3>
          <div className={css.settingsRow}>
            <label className={css.modeLabel}>
              <input
                type="radio"
                name="pair-password-mode"
                checked={passwordMode === 'none'}
                disabled={settingsBusy}
                onChange={() => { setPasswordMode('none') }}
              />
              无密码（扫码或配对码后直接配对）
            </label>
            <label className={css.modeLabel}>
              <input
                type="radio"
                name="pair-password-mode"
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
              保存连接方式
            </Button>
            {settingsMessage !== undefined && <span className={css.settingsHint}>{settingsMessage}</span>}
          </div>
        </section>

        <div className={css.qrBlock}>
          {qrDataUrl !== undefined && (
            <img className={css.qrImage} src={qrDataUrl} alt="Mobile pairing QR code" />
          )}
          <div className={css.metaRow}>
            <span>LAN 地址：<span className={css.metaStrong}>{offer?.host}:{String(offer?.port ?? '')}</span></span>
            <span>配对码：<span className={css.metaStrong}>{offer?.shortCode ?? '—'}</span></span>
            <span>连接密码：<span className={css.metaStrong}>{offer?.passwordRequired === true ? '已启用' : '未启用'}</span></span>
            <span>QR 有效期：<span className={css.metaStrong}>{ttl || '—'}</span></span>
          </div>
        </div>

        {offer?.confirmMode === 'strict' && (
          <section>
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

        <section>
          <h3 className={css.sectionTitle}>已连接设备</h3>
          {devices.length === 0
            ? <p className={css.empty}>暂无已配对设备</p>
            : (
              <div className={css.list}>
                {devices.filter(item => !item.revoked).map(item => (
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
    </Modal>
  )
}
