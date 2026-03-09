import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// After OAuth, Supabase may redirect to base path without trailing slash (e.g. /-travel-planner-#hash).
// Normalize so GitHub Pages and the router see the correct path and the hash is preserved.
const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
if (base && typeof window !== 'undefined' && window.location.pathname === base) {
  const newUrl = window.location.origin + base + '/' + (window.location.search || '') + (window.location.hash || '')
  window.history.replaceState(null, '', newUrl)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
