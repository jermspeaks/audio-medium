import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Sync dark mode with system preference
if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  document.documentElement.classList.toggle('dark', e.matches)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
