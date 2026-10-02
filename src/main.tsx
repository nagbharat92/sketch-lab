import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

async function mountApp() {
  // Justice must measure the final font before Bloom's first paint.
  if (window.location.hash.replace(/^#\//, '').trim() === 'flower-lab') {
    const family = getComputedStyle(document.body).fontFamily
    try {
      await document.fonts.load(`400 1px ${family}`)
      await document.fonts.load(`600 1px ${family}`)
    } catch (error) {
      console.error('Unable to prepare Bloom typography; using the available font', error)
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void mountApp()
