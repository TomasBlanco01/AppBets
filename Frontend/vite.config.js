import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // Sin esto, el service worker responde index.html a cualquier
        // navegación, incluidas las rutas del backend.
        navigateFallbackDenylist: [/^\/api\//, /^\/health$/],
      },
      manifest: {
        name: 'Ges.Eco - Gestión Financiera',
        short_name: 'Ges.Eco',
        description: 'Gestión financiera personal: ingresos, gastos, bets y balances.',
        theme_color: '#0f1923',
        background_color: '#0f1923',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist', // 👈 Render busca esta carpeta
  },
})
