import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, ConnectionBanner, Input } from '@deepseek-ai/dsh-client-ui-primitives'

import { useMobileConnection } from './MobileConnectionContext.tsx'
import { MobileShellLayout } from './MobileShellLayout.tsx'
import { clearPairingStorage, writePairingResult } from './mobile-session.ts'
import {
  buildHostBaseUrl,
  fetchPairPolicy,
  pairShortCodeWithPolling,
  pairWithPolling,
  parsePairingInput,
  verifyHostDescribe,
} from './pair-api.ts'
import { QrCameraScanner } from './QrCameraScanner.tsx'
import { decodeQrFromFile } from './qr-decode.ts'
import { StatusPanel } from './StatusPanel.tsx'
import css from './mobile-shell.module.css'

/** Pairing page phase for UI state machine. */
type PairPhase = 'idle' | 'pairing' | 'pendingDesktop' | 'success' | 'error'

/** Props for {@link PairPage}. */
export interface PairPageProps {
  /** Navigate back without pairing. */
  onBack: () => void
  /** Called after pairing storage is written. */
  onPaired: () => void
  /** Open the live camera scanner immediately on mount. Defaults to true. */
  autoStartCamera?: boolean
  /** QR deep-link URL to pair automatically on mount (skips camera). */
  initialPairingRaw?: string
}

/**
 * QR/manual pairing page styled with desktop primitives.
 * @param props - navigation and success callback.
 */
export function PairPage({
  onBack,
  onPaired,
  autoStartCamera = true,
  initialPairingRaw,
}: PairPageProps): JSX.Element {
  const { reloadPairing, connectionState } = useMobileConnection()
  const [rawInput, setRawInput] = useState('')
  const [deviceLabel, setDeviceLabel] = useState('Mobile device')
  const [manualHost, setManualHost] = useState('192.168.1.10')
  const [manualPort, setManualPort] = useState('3080')
  const [manualShortCode, setManualShortCode] = useState('')
  const [pairPassword, setPairPassword] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [cameraActive, setCameraActive] = useState(autoStartCamera)
  const [phase, setPhase] = useState<PairPhase>('idle')
  const [status, setStatus] = useState(
    autoStartCamera ? '正在打开摄像头…' : '等待扫码、相册选图或手动输入',
  )

  const finishPair = async (
    baseUrl: string,
    runPair: () => Promise<{ sessionToken: string; deviceId: string; fingerprint: string }>,
  ): Promise<void> => {
    setCameraActive(false)
    setPhase('pairing')
    setStatus('正在配对…')
    try {
      const result = await runPair()
      setPhase('success')
      setStatus('配对成功，正在验证连接…')
      writePairingResult(baseUrl, result.sessionToken, result.deviceId, result.fingerprint)
      await verifyHostDescribe(baseUrl, result.sessionToken)
      reloadPairing()
      onPaired()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('pending desktop confirmation') || message.includes('等待桌面确认')) {
        setPhase('pendingDesktop')
      } else {
        setPhase('error')
      }
      setStatus(message)
    }
  }

  const pairFromDecoded = useCallback(async (decoded: string): Promise<void> => {
    setRawInput(decoded)
    const input = parsePairingInput(decoded)
    if (input === undefined) {
      setPhase('error')
      setStatus('QR 内容无法识别，请改用手动输入或相册选图')
      setCameraActive(false)
      return
    }
    const needsPassword = input.passwordRequired || passwordRequired
    if (needsPassword) setPasswordRequired(true)
    if (needsPassword && pairPassword.trim() === '') {
      setCameraActive(false)
      setPhase('idle')
      setStatus('请输入连接密码后点击连接')
      return
    }
    const options = pairPassword.trim() === '' ? {} : { pairPassword: pairPassword.trim() }
    await finishPair(input.baseUrl, () => pairWithPolling(input, deviceLabel, options))
  }, [deviceLabel, pairPassword, passwordRequired])

  useEffect(() => {
    if (!showManual) return
    const baseUrl = buildHostBaseUrl(manualHost, manualPort)
    if (baseUrl === '') return
    void fetchPairPolicy(baseUrl).then((policy) => {
      setPasswordRequired(policy.passwordRequired)
    }).catch(() => { /* policy fetch is best-effort */ })
  }, [showManual, manualHost, manualPort])

  const onCameraDecode = useCallback((decoded: string): void => {
    setStatus('已识别二维码，正在配对…')
    void pairFromDecoded(decoded)
  }, [pairFromDecoded])

  const onCameraError = useCallback((message: string): void => {
    setCameraActive(false)
    setPhase('error')
    setStatus(message)
  }, [])

  const launchedRef = useRef(false)
  useEffect(() => {
    if (initialPairingRaw === undefined || launchedRef.current) return
    launchedRef.current = true
    setCameraActive(false)
    const input = parsePairingInput(initialPairingRaw)
    if (input === undefined) {
      setPhase('error')
      setStatus('链接无法识别，请改用手动输入')
      return
    }
    setRawInput(initialPairingRaw)
    if (input.passwordRequired) {
      setPasswordRequired(true)
      setStatus('请输入连接密码后点击连接')
      return
    }
    setStatus('正在从链接配对…')
    void pairFromDecoded(initialPairingRaw)
  }, [initialPairingRaw, pairFromDecoded])

  const onPairFromRaw = async (): Promise<void> => {
    const input = parsePairingInput(rawInput)
    if (input === undefined) {
      setPhase('error')
      setStatus('无法识别配对内容，请粘贴完整 QR URL 或「host:port token」')
      return
    }
    if (input.passwordRequired) setPasswordRequired(true)
    if ((input.passwordRequired || passwordRequired) && pairPassword.trim() === '') {
      setPhase('error')
      setStatus('请输入连接密码')
      return
    }
    const options = pairPassword.trim() === '' ? {} : { pairPassword: pairPassword.trim() }
    await finishPair(input.baseUrl, () => pairWithPolling(input, deviceLabel, options))
  }

  const onPairFromShortCode = async (): Promise<void> => {
    const baseUrl = buildHostBaseUrl(manualHost, manualPort)
    if (baseUrl === '' || manualShortCode.trim().length !== 6) {
      setPhase('error')
      setStatus('请输入 Host、Port 和 6 位配对码')
      return
    }
    if (passwordRequired && pairPassword.trim() === '') {
      setPhase('error')
      setStatus('请输入连接密码')
      return
    }
    let policyRequired = passwordRequired
    try {
      policyRequired = (await fetchPairPolicy(baseUrl)).passwordRequired
      setPasswordRequired(policyRequired)
    } catch {
      /* keep cached policy */
    }
    if (policyRequired && pairPassword.trim() === '') {
      setPhase('error')
      setStatus('请输入连接密码')
      return
    }
    const options = pairPassword.trim() === '' ? {} : { pairPassword: pairPassword.trim() }
    await finishPair(baseUrl, () => pairShortCodeWithPolling({
      baseUrl,
      shortCode: manualShortCode.trim(),
    }, deviceLabel, options))
  }

  const onPickImage = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return
    setCameraActive(false)
    setPhase('pairing')
    setStatus('正在解析二维码…')
    try {
      const decoded = await decodeQrFromFile(file)
      if (decoded === undefined) {
        setPhase('error')
        setStatus('未在图片中识别到 QR 码')
        return
      }
      await pairFromDecoded(decoded)
    } catch (error) {
      setPhase('error')
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  const onDisconnect = (): void => {
    clearPairingStorage()
    reloadPairing()
    setCameraActive(false)
    setPhase('idle')
    setStatus('已清除本地连接信息')
  }

  const busy = phase === 'pairing' || phase === 'pendingDesktop'

  return (
    <>
      <ConnectionBanner reconnecting={connectionState === 'reconnecting'} />
      <MobileShellLayout title="连接我的电脑" onBack={onBack}>
        <div className={css.formStack}>
          {cameraActive && !busy && (
            <QrCameraScanner
              active={cameraActive}
              onDecode={onCameraDecode}
              onError={onCameraError}
            />
          )}

          <StatusPanel
            message={phase === 'pendingDesktop' ? '请在电脑上点击「允许」，手机会自动继续…' : status}
            error={phase === 'error' ? status : undefined}
          />

          {phase !== 'error' && phase !== 'pendingDesktop' && !cameraActive && (
            <p className={css.statusText}>{status}</p>
          )}

          {!cameraActive && !busy && (
            <Button variant="primary" onClick={() => {
              setPhase('idle')
              setStatus('正在打开摄像头…')
              setCameraActive(true)
            }}
            >
              打开摄像头扫码
            </Button>
          )}

          <label className={css.fieldLabel}>
            设备名称
            <Input
              value={deviceLabel}
              disabled={busy}
              onChange={(event) => { setDeviceLabel(event.target.value) }}
            />
          </label>

          {(passwordRequired || pairPassword !== '') && (
            <label className={css.fieldLabel}>
              连接密码
              <Input
                type="password"
                value={pairPassword}
                disabled={busy}
                placeholder={passwordRequired ? '电脑端已启用连接密码' : '可选'}
                onChange={(event) => { setPairPassword(event.target.value) }}
              />
            </label>
          )}

          <label className={css.fieldLabel}>
            从相册选择 QR 图片
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(event) => { void onPickImage(event.target.files?.[0]) }}
            />
          </label>

          <label className={css.fieldLabel}>
            QR 链接或手动输入
            <textarea
              className={css.textarea}
              value={rawInput}
              disabled={busy}
              onChange={(event) => { setRawInput(event.target.value) }}
              placeholder="http://192.168.x.x:3080/mobile/pair?t=..."
            />
          </label>

          <div className={css.actionRow}>
            <Button variant="primary" disabled={busy} onClick={() => { void onPairFromRaw() }}>连接</Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setShowManual(current => !current) }}>
              {showManual ? '收起手动配对' : '手动输入 Host + 配对码'}
            </Button>
          </div>

          {showManual && (
            <div className={css.formStack}>
              <label className={css.fieldLabel}>
                Host
                <Input value={manualHost} disabled={busy} onChange={(event) => { setManualHost(event.target.value) }} />
              </label>
              <label className={css.fieldLabel}>
                Port
                <Input value={manualPort} disabled={busy} onChange={(event) => { setManualPort(event.target.value) }} />
              </label>
              <label className={css.fieldLabel}>
                6 位配对码
                <Input
                  value={manualShortCode}
                  disabled={busy}
                  inputMode="numeric"
                  onChange={(event) => { setManualShortCode(event.target.value) }}
                />
              </label>
              <Button variant="primary" disabled={busy} onClick={() => { void onPairFromShortCode() }}>
                使用配对码连接
              </Button>
            </div>
          )}

          <p className={css.statusText}>
            在电脑 MetaCode Web 侧栏点击「手机连接」获取 QR 和配对码。
          </p>

          <div className={css.actionRow}>
            <Button variant="ghost" disabled={busy} onClick={onDisconnect}>清除本地信息</Button>
          </div>
        </div>
      </MobileShellLayout>
    </>
  )
}

/** Back-compat export for the Phase 1 entry name. */
export const MobilePairApp = PairPage
