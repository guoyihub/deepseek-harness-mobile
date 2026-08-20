/** Shared desktop mobile-pairing load / poll / mutate state. */

import { useCallback, useEffect, useState } from 'react'
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

/** Mutable pairing surface shared by the QR modal and settings section. */
export interface MobilePairingController {
  /** Latest pairing offer, when loaded. */
  offer: PairingOffer | undefined
  /** QR image data URL from the Host. */
  qrDataUrl: string | undefined
  /** Strict-mode pending device approvals. */
  pending: readonly PendingDeviceView[]
  /** Paired devices (caller filters revoked for display). */
  devices: readonly PairedDeviceView[]
  /** Last refresh failure message. */
  error: string | undefined
  /** Human-readable QR remaining lifetime. */
  ttl: string
  /** Draft password mode before save. */
  passwordMode: PairPasswordMode
  /** Update the password-mode draft. */
  setPasswordMode: (mode: PairPasswordMode) => void
  /** Draft connection password (write-only). */
  passwordDraft: string
  /** Update the password draft. */
  setPasswordDraft: (value: string) => void
  /** Whether a settings save is in flight. */
  settingsBusy: boolean
  /** Last settings save result or error. */
  settingsMessage: string | undefined
  /** Persist password mode / password and refresh the QR. */
  onSavePasswordSettings: () => Promise<void>
  /** Approve a strict-mode pending device. */
  onConfirm: (deviceId: string) => Promise<void>
  /** Deny a strict-mode pending device. */
  onDeny: (deviceId: string) => Promise<void>
  /** Revoke a paired device session. */
  onRevoke: (deviceId: string) => Promise<void>
}

/**
 * Poll pairing offer, devices, and password settings while `active`.
 * @param active - whether the surface is visible and should refresh.
 * @returns controller for QR display and settings mutations.
 */
export function useMobilePairing(active: boolean): MobilePairingController {
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
    if (!active) return
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
  }, [active])

  useEffect(() => {
    if (!active) return
    void fetchPairPasswordSettings().then((settings) => {
      setPasswordMode(settings.mode)
    }).catch(() => { /* settings load is best-effort */ })
  }, [active])

  useEffect(() => {
    if (!active) return
    void refresh()
    const timer = globalThis.setInterval(() => { void refresh() }, 1000)
    return () => { globalThis.clearInterval(timer) }
  }, [active, refresh])

  useEffect(() => {
    if (!active || offer === undefined) return
    if (offer.passwordRequired) {
      setTtl('长期有效（直至重新生成）')
      return
    }
    const tick = (): void => { setTtl(formatTtl(offer.expiresAt)) }
    tick()
    const timer = globalThis.setInterval(tick, 1000)
    return () => { globalThis.clearInterval(timer) }
  }, [active, offer])

  const onConfirm = useCallback(async (deviceId: string): Promise<void> => {
    await confirmPendingDevice(deviceId)
    await refresh()
  }, [refresh])

  const onDeny = useCallback(async (deviceId: string): Promise<void> => {
    await denyPendingDevice(deviceId)
    await refresh()
  }, [refresh])

  const onRevoke = useCallback(async (deviceId: string): Promise<void> => {
    await revokePairedDevice(deviceId)
    await refresh()
  }, [refresh])

  const onSavePasswordSettings = useCallback(async (): Promise<void> => {
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
  }, [passwordDraft, passwordMode, refresh])

  return {
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
  }
}
