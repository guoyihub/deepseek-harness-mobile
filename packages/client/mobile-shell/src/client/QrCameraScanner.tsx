import { useEffect, useRef } from 'react'

import { decodeQrFromVideoFrame } from './qr-decode.ts'
import css from './mobile-shell.module.css'

/** Props for {@link QrCameraScanner}. */
export interface QrCameraScannerProps {
  /** Whether the scanner should acquire and read from the camera. */
  active: boolean
  /** Called once when a QR payload is recognized. */
  onDecode: (text: string) => void
  /** Called when camera permission or startup fails. */
  onError: (message: string) => void
}

/**
 * Live rear-camera QR scanner using {@link jsqr} on video frames.
 * @param props - active flag and decode/error callbacks.
 */
export function QrCameraScanner({ active, onDecode, onError }: QrCameraScannerProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDecodeRef = useRef(onDecode)
  const onErrorRef = useRef(onError)

  onDecodeRef.current = onDecode
  onErrorRef.current = onError

  useEffect(() => {
    if (!active) return undefined

    let stream: MediaStream | undefined
    let frameId = 0
    let stopped = false

    const stop = (): void => {
      stopped = true
      globalThis.cancelAnimationFrame(frameId)
      for (const track of stream?.getTracks() ?? []) track.stop()
      stream = undefined
      const video = videoRef.current
      if (video !== null) video.srcObject = null
    }

    const scan = (): void => {
      if (stopped) return
      const video = videoRef.current
      if (video !== null && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        const decoded = decodeQrFromVideoFrame(video)
        if (decoded !== undefined) {
          stop()
          onDecodeRef.current(decoded)
          return
        }
      }
      frameId = globalThis.requestAnimationFrame(scan)
    }

    void (async () => {
      if (!globalThis.isSecureContext) {
        onErrorRef.current('摄像头扫码需要 HTTPS 或 localhost 安全上下文')
        return
      }
      if (navigator.mediaDevices?.getUserMedia === undefined) {
        onErrorRef.current('当前浏览器不支持摄像头扫码')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        })
        if (stopped) {
          stop()
          return
        }
        const video = videoRef.current
        if (video === null) {
          stop()
          return
        }
        video.srcObject = stream
        await video.play()
        frameId = globalThis.requestAnimationFrame(scan)
      } catch (error) {
        stop()
        const message = error instanceof Error ? error.message : String(error)
        if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('denied')) {
          onErrorRef.current('摄像头权限被拒绝，请在系统设置中允许后重试')
          return
        }
        onErrorRef.current(`无法打开摄像头：${message}`)
      }
    })()

    return stop
  }, [active])

  return (
    <div className={css.qrScanner}>
      <video ref={videoRef} className={css.qrScannerVideo} playsInline muted autoPlay />
      <div className={css.qrScannerFrame} aria-hidden="true" />
      <p className={css.qrScannerHint}>对准电脑「手机连接」弹窗中的二维码</p>
    </div>
  )
}
