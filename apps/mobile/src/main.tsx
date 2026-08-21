import './base.css'
import { createRoot } from 'react-dom/client'
import { MobileApp } from '@deepseek-ai/dsh-client-mobile-shell/client'

/** Block legacy iOS pinch-zoom gestures that ignore viewport `maximum-scale`. */
function installPinchZoomGuard(): void {
  const blockGesture = (event: Event): void => { event.preventDefault() }
  document.addEventListener('gesturestart', blockGesture, { passive: false })
  document.addEventListener('gesturechange', blockGesture, { passive: false })
  document.addEventListener('gestureend', blockGesture, { passive: false })
}

installPinchZoomGuard()

const root = document.getElementById('root')
if (root === null) throw new Error('mobile app: missing #root')
createRoot(root).render(<MobileApp />)
