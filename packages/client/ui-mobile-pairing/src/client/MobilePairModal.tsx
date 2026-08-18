import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { MobilePairQrBlock } from './MobilePairQrBlock.tsx'
import { useMobilePairing } from './use-mobile-pairing.ts'
import css from './mobile-pairing.module.css'

/** Props for {@link MobilePairModal}. */
export interface MobilePairModalProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Close handler. */
  onClose: () => void
}

/**
 * Sidebar quick-scan modal: QR only (password / devices live in 设置 → DSH 移动端).
 * @param props - open state and close callback.
 */
export function MobilePairModal({ open, onClose }: MobilePairModalProps): JSX.Element | null {
  const { qrDataUrl, error } = useMobilePairing(open)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="手机连接"
      description="用手机扫描二维码即可连接。"
      footer={<Button variant="outline" onClick={onClose}>关闭</Button>}
    >
      <div className={css.qrOnly}>
        <MobilePairQrBlock qrDataUrl={qrDataUrl} error={error} />
      </div>
    </Modal>
  )
}
