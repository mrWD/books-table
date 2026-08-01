import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /<repo>/, other hosts from the root.
// BASE_PATH is set by the deploy workflow; local dev and preview stay at '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'BooksTable',
        short_name: 'BooksTable',
        description: 'Track what you read. A local-first reading tracker with no account and no sync.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f2f2f2',
        theme_color: '#f2f2f2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/openlibrary\.org\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openlibrary-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Covers never change for a given id, so they are cached outright.
            urlPattern: /^https:\/\/covers\.openlibrary\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: { host: true },
  preview: { host: true },
})
