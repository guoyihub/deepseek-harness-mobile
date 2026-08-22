import './base.css'
import { Capacitor } from '@capacitor/core'
import { createRoot } from 'react-dom/client'
import { MobileApp } from '@deepseek-ai/dsh-client-mobile-shell/client'
import { configureNativeMobileKeyboard } from './configure-native-keyboard.ts'

/** Block legacy iOS pinch-zoom gestures that ignore viewport `maximum-scale`. */
function installPinchZoomGuard(): void {
  const blockGesture = (event: Event): void => { event.preventDefault() }
  document.addEventListener('gesturestart', blockGesture, { passive: false })
  document.addEventListener('gesturechange', blockGesture, { passive: false })
  document.addEventListener('gestureend', blockGesture, { passive: false })
}

installPinchZoomGuard()
configureNativeMobileKeyboard()
if (Capacitor.isNativePlatform()) {
  void import('./configure-native-back.ts').then(({ configureNativeMobileBack }) => {
    configureNativeMobileBack()
  })
}

const root = document.getElementById('root')
if (root === null) throw new Error('mobile app: missing #root')
createRoot(root).render(<MobileApp />)
