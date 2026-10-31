import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'
import App from './App'

// La PWA puede quedar abierta con el service worker anterior y seguir mostrando
// el bundle viejo. Cuando el navegador activa una versión nueva, recargamos una
// sola vez para que el usuario vea el deploy actual sin borrar datos locales.
if ('serviceWorker' in navigator) {
  const RELOAD_KEY = 'geseco_sw_last_reload'
  let refreshing = false
  let hadController = Boolean(navigator.serviceWorker.controller)

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true
      return
    }
    if (refreshing) return

    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - lastReload < 15000) return

    refreshing = true
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    window.location.reload()
  })

  const checkForUpdate = async () => {
    if (!navigator.onLine) return
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      await registration?.update()
    } catch (error) {
      console.warn('No se pudo buscar una actualización de la app:', error)
    }
  }

  // Si la pestaña quedó con el bundle viejo y pide un módulo que el deploy
  // nuevo ya borró, la importación falla: recargamos para tomar la versión actual.
  window.addEventListener('vite:preloadError', (event) => {
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - lastReload < 15000) return
    event.preventDefault()
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    window.location.reload()
  })

  window.addEventListener('load', checkForUpdate)
  window.setTimeout(checkForUpdate, 5000)
  window.setInterval(checkForUpdate, 60 * 60 * 1000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
)
