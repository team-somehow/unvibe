import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Learnagram',
        short_name: 'Learnagram',
        description: 'Your Claude Code sessions, as explainer reels.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/app',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
    }),
  ],
  server: { host: true },
})
