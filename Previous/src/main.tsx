import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

// One-time auth reset to clear corrupted session
// Remove this block after the issue is resolved
if (!localStorage.getItem('auth-reset-v1')) {
  console.log('[App] Clearing stale auth data...')
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key)
    }
  })
  localStorage.setItem('auth-reset-v1', 'done')
  window.location.reload()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
