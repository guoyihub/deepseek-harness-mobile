import './base.css'
import { createRoot } from 'react-dom/client'
import { MobileApp } from '@deepseek-ai/dsh-client-mobile-shell/client'

const root = document.getElementById('root')
if (root === null) throw new Error('mobile app: missing #root')
createRoot(root).render(<MobileApp />)
