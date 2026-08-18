import type { ClientRequest } from 'node:http'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

const src = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: false,
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
      },
    }),
  ],
  server: {
    port: 8030,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3080',
        changeOrigin: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq: ClientRequest) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@deepseek-ai\/dsh-client-mobile-shell\/client$/,
        replacement: src('../../packages/client/mobile-shell/src/client/index.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-ui-primitives$/,
        replacement: src('../../packages/client/ui-primitives/src/index.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-connection\/client$/,
        replacement: src('../../packages/client/connection/src/client/index.ts'),
      },
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
