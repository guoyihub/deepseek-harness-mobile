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
  /** Called after the camera stream is playing. */
  onReady?: (() => void) | undefined
}

/**
 * Acquire a camera stream, preferring the rear camera then falling back.
 * @returns live media stream.
 */
async function openCameraStream(): Promise<MediaStream> {
  if (!globalThis.isSecureContext) {
    throw new Error('摄像头扫码需要 HTTPS 或 localhost 安全上下文')
  }
  if (navigator.mediaDevices?.getUserMedia === undefined) {
    throw new Error('当前浏览器不支持摄像头扫码')
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
  } catch {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    })
  }
}

/**
 * Full-bleed camera video that feeds QR frames to {@link jsqr}.
 * @param props - active flag and decode/error callbacks.
 */
export function QrCameraScanner({
  active,
  onDecode,
  onError,
  onReady,
}: QrCameraScannerProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDecodeRef = useRef(onDecode)
  const onErrorRef = useRef(onError)
  const onReadyRef = useRef(onReady)

  onDecodeRef.current = onDecode
  onErrorRef.current = onError
  onReadyRef.current = onReady

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

    /** Throttle decode so jsQR does not contend with CSS compositing every paint. */
    const scanIntervalMs = 200
    let lastScanAt = 0

    const scan = (now: number): void => {
      if (stopped) return
      frameId = globalThis.requestAnimationFrame(scan)
      if (now - lastScanAt < scanIntervalMs) return
      lastScanAt = now
      const video = videoRef.current
      if (video === null || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return
      const decoded = decodeQrFromVideoFrame(video)
      if (decoded === undefined) return
      stop()
      onDecodeRef.current(decoded)
    }

    void (async () => {
      try {
        stream = await openCameraStream()
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
        onReadyRef.current?.()
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
    <div className={css.qrScannerFill}>
      <video ref={videoRef} className={css.qrScannerVideoFill} playsInline muted autoPlay />
    </div>
  )
}
