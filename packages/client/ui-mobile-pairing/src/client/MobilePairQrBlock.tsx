/** Centered QR image used by the sidebar modal and settings section. */

import css from './mobile-pairing.module.css'

/** Props for {@link MobilePairQrBlock}. */
export interface MobilePairQrBlockProps {
  /** QR image data URL, when available. */
  qrDataUrl: string | undefined
  /** Optional refresh failure shown above the QR. */
  error?: string | undefined
  /** Omit outer card chrome when nested inside the settings panel card. */
  embedded?: boolean
}

/**
 * Render the pairing QR (and optional error).
 * @param props - QR data URL and optional error.
 */
export function MobilePairQrBlock({ qrDataUrl, error, embedded = false }: MobilePairQrBlockProps): JSX.Element {
  return (
    <div className={embedded ? css.qrEmbedded : css.qrBlock}>
      {error !== undefined && <p className={css.error}>{error}</p>}
      {qrDataUrl !== undefined
        ? <img className={css.qrImage} src={qrDataUrl} alt="手机连接二维码" />
        : <p className={css.empty}>正在加载二维码…</p>}
    </div>
  )
}
