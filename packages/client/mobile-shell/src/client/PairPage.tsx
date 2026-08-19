import { useCallback, useEffect, useRef, useState } from 'react'

import {
  IconChevronLeftOutline14,
  IconFolderOpenOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { resolveMobileApiBase } from '@deepseek-ai/dsh-client-connection/client'

import { useMobileConnection } from './MobileConnectionContext.tsx'
import { clearPairingStorage, writePairingResult } from './mobile-session.ts'
import {
  pairWithPolling,
  parsePairingInput,
  verifyHostDescribe,
} from './pair-api.ts'
import { QrCameraScanner } from './QrCameraScanner.tsx'
import { decodeQrFromFile } from './qr-decode.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Pairing page phase for UI state machine. */
type PairPhase = 'idle' | 'pairing' | 'pendingDesktop' | 'success' | 'error'

/** Fixed label sent to the Host for this mobile device. */
const DEVICE_LABEL = 'Mobile device'

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
 * WeChat-style full-screen scan pairing with DeepSeek blue chrome.
 * @param props - navigation and success callback.
 */
export function PairPage({
  onBack,
  onPaired,
  autoStartCamera = true,
  initialPairingRaw,
}: PairPageProps): JSX.Element {
  const { reloadPairing } = useMobileConnection()
  const [pairPassword, setPairPassword] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [pendingDecoded, setPendingDecoded] = useState<string | undefined>(undefined)
  const [cameraActive, setCameraActive] = useState(autoStartCamera && initialPairingRaw === undefined)
  const [phase, setPhase] = useState<PairPhase>('idle')
  const [status, setStatus] = useState(
    autoStartCamera && initialPairingRaw === undefined
      ? '正在打开摄像头…'
      : '对准二维码，或点右下角从相册选择',
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const finishPair = useCallback(async (decoded: string): Promise<void> => {
    const input = parsePairingInput(decoded)
    if (input === undefined) {
      setPhase('error')
      setStatus('QR 内容无法识别，请重新扫码或换一张图片')
      setCameraActive(true)
      return
    }
    const needsPassword = input.passwordRequired || passwordRequired
    if (needsPassword) setPasswordRequired(true)
    if (needsPassword && pairPassword.trim() === '') {
      setPendingDecoded(decoded)
      setCameraActive(false)
      setPhase('idle')
      setStatus('请输入连接密码后继续')
      return
    }

    setPendingDecoded(undefined)
    setCameraActive(false)
    setPhase('pairing')
    setStatus('正在配对…')
    try {
      const options = pairPassword.trim() === '' ? {} : { pairPassword: pairPassword.trim() }
      const result = await pairWithPolling(input, DEVICE_LABEL, options)
      setPhase('success')
      setStatus('配对成功，正在验证连接…')
      const storedBase = resolveMobileApiBase(input.baseUrl)
      writePairingResult(storedBase, result.sessionToken, result.deviceId, result.fingerprint)
      await verifyHostDescribe(storedBase, result.sessionToken)
      reloadPairing()
      onPaired()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('pending desktop confirmation') || message.includes('等待桌面确认')) {
        setPhase('pendingDesktop')
      } else {
        setPhase('error')
        setCameraActive(true)
      }
      setStatus(message)
    }
  }, [onPaired, pairPassword, passwordRequired, reloadPairing])

  const onCameraDecode = useCallback((decoded: string): void => {
    setStatus('已识别二维码，正在配对…')
    void finishPair(decoded)
  }, [finishPair])

  const onCameraError = useCallback((message: string): void => {
    setCameraActive(false)
    setPhase('error')
    setStatus(message)
  }, [])

  const onCameraReady = useCallback((): void => {
    setPhase('idle')
    setStatus('对准电脑「手机连接」弹窗中的二维码')
  }, [])

  const launchedRef = useRef(false)
  useEffect(() => {
    if (initialPairingRaw === undefined || launchedRef.current) return
    launchedRef.current = true
    setCameraActive(false)
    const input = parsePairingInput(initialPairingRaw)
    if (input === undefined) {
      setPhase('error')
      setStatus('链接无法识别，请改用摄像头或相册扫码')
      setCameraActive(true)
      return
    }
    if (input.passwordRequired) {
      setPasswordRequired(true)
      setPendingDecoded(initialPairingRaw)
      setStatus('请输入连接密码后继续')
      return
    }
    setStatus('正在从链接配对…')
    void finishPair(initialPairingRaw)
  }, [finishPair, initialPairingRaw])

  const onPickImage = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return
    setPhase('pairing')
    setStatus('正在解析二维码…')
    try {
      const decoded = await decodeQrFromFile(file)
      if (decoded === undefined) {
        setPhase('error')
        setStatus('未在图片中识别到 QR 码')
        setCameraActive(true)
        return
      }
      await finishPair(decoded)
    } catch (error) {
      setPhase('error')
      setStatus(error instanceof Error ? error.message : String(error))
      setCameraActive(true)
    }
  }

  const onContinueWithPassword = (): void => {
    if (pendingDecoded === undefined) return
    if (pairPassword.trim() === '') {
      setPhase('error')
      setStatus('请输入连接密码')
      return
    }
    void finishPair(pendingDecoded)
  }

  const busy = phase === 'pairing' || phase === 'pendingDesktop' || phase === 'success'
  const showPasswordSheet = pendingDecoded !== undefined && !busy
  const showErrorSheet = phase === 'error' && !cameraActive

  return (
    <div className={css.page}>
      <div className={css.scanPage}>
        {cameraActive && !busy && (
          <QrCameraScanner
            active={cameraActive}
            onDecode={onCameraDecode}
            onError={onCameraError}
            onReady={onCameraReady}
          />
        )}

        <div className={css.scanMaskTop} aria-hidden="true" />
        <div className={css.scanMaskBottom} aria-hidden="true" />

        <header className={css.scanHeader}>
          <button
            type="button"
            className={css.scanBackBtn}
            aria-label={mobileConversationT('nav.back')}
            onClick={onBack}
          >
            <IconChevronLeftOutline14 size={16} aria-hidden />
          </button>
          <h1 className={css.scanTitle}>连接我的电脑</h1>
        </header>

        {cameraActive && !busy && (
          <div className={css.scanLaser} aria-hidden="true" />
        )}

        <p className={css.scanStatus} role="status">
          {phase === 'pendingDesktop'
            ? '请在电脑上点击「允许」，手机会自动继续…'
            : status}
        </p>

        {!busy && (
          <button
            type="button"
            className={css.scanAlbumBtn}
            aria-label="从相册选择 QR 图片"
            onClick={() => { fileInputRef.current?.click() }}
          >
            <IconFolderOpenOutline16 size={22} aria-hidden />
          </button>
        )}

        <input
          ref={fileInputRef}
          className={css.pairFileInput}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => { void onPickImage(event.target.files?.[0]) }}
        />

        {(showPasswordSheet || showErrorSheet) && (
          <div className={css.scanSheet}>
            {showErrorSheet && (
              <>
                <p className={css.scanSheetError}>{status}</p>
                <button
                  type="button"
                  className={css.settingsPrimaryBtn}
                  onClick={() => {
                    setPhase('idle')
                    setStatus('正在打开摄像头…')
                    setCameraActive(true)
                  }}
                >
                  重新打开摄像头
                </button>
              </>
            )}
            {showPasswordSheet && (
              <>
                <p className={css.scanSheetCopy}>电脑端已启用连接密码，请输入后继续</p>
                <input
                  className={css.pairInput}
                  type="password"
                  value={pairPassword}
                  placeholder="连接密码"
                  onChange={(event) => { setPairPassword(event.target.value) }}
                />
                <button
                  type="button"
                  className={css.settingsPrimaryBtn}
                  onClick={onContinueWithPassword}
                >
                  继续连接
                </button>
              </>
            )}
            <button
              type="button"
              className={css.settingsDangerBtn}
              onClick={() => {
                clearPairingStorage()
                reloadPairing()
                setPendingDecoded(undefined)
                setPhase('idle')
                setStatus('已清除本地连接信息')
                setCameraActive(true)
              }}
            >
              清除本地信息
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Back-compat export for the Phase 1 entry name. */
export const MobilePairApp = PairPage
