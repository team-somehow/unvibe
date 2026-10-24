import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}', 'audio/**/*.mp3'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/app',
        scope: '/',
        name: 'Unvibe',
        short_name: 'Unvibe',
        description: 'Your Claude Code sessions, as explainer reels.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/app',
        lang: 'en',
        categories: ['education', 'productivity'],
        prefer_related_applications: false,
        shortcuts: [
          { name: 'Open your feed', short_name: 'Feed', url: '/app', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] },
          { name: 'Connect local sessions', short_name: 'Connect', url: '/connect', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  server: { host: true },
})
