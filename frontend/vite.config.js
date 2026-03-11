import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin to disable host check
const disableHostCheckPlugin = {
  name: 'disable-host-check',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Allow all hosts
      next()
    })
  }
}

export default defineConfig({
  plugins: [
    react(),
    disableHostCheckPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Upkeep',
        short_name: 'Upkeep',
        description: 'Track and manage maintenance for all your assets',
        theme_color: '#282c34',
        background_color: '#282c34',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          },
          {
            urlPattern: /^\/uploads\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',  // Listen on all addresses
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true  // Better for Docker
    },
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://backend:5000',
        changeOrigin: true
      }
    }
  }
})
