import { useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { MobilePairModal } from './MobilePairModal.tsx'

/** Props for {@link MobilePairTrigger}. */
export interface MobilePairTriggerProps {
  /** Whether the sidebar renders wide content. */
  wide: boolean
}

/**
 * Sidebar footer action that opens the mobile pairing modal.
 * @param props - sidebar layout state.
 */
export function MobilePairTrigger({ wide }: MobilePairTriggerProps): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true) }}>
        {wide ? '手机连接' : '📱'}
      </Button>
      <MobilePairModal open={open} onClose={() => { setOpen(false) }} />
    </>
  )
}
