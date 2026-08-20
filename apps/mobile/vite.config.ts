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
        // Rewrite Host to the local Host so the browser-trust fence sees loopback.
        // Strip Origin/Referer so tunnel/LAN page origins do not fail the Origin check.
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq: ClientRequest) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
          proxy.on('proxyReqWs', (proxyReq: ClientRequest) => {
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
        find: /^@deepseek-ai\/dsh-client-ui-directory-picker-browse\/src\/(.*)$/,
        replacement: src('../../packages/client/ui-directory-picker-browse/src/$1'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-connection\/client$/,
        replacement: src('../../packages/client/connection/src/client/index.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-host-apiproxy\/client$/,
        replacement: src('../../packages/host/apiproxy/src/fetch/client.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-host-apiproxy\/api\/(.*)$/,
        replacement: src('../../packages/host/apiproxy/src/api/$1'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-runtime\/client$/,
        replacement: src('../../packages/client/runtime/src/client/index.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-runtime\/src\/(.*)$/,
        replacement: src('../../packages/client/runtime/src/$1'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-ui-trajectory\/src\/(.*)$/,
        replacement: src('../../packages/client/ui-trajectory/src/$1'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-ui-conversation\/client$/,
        replacement: src('../../packages/client/ui-conversation/src/client/index.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-ui-slots$/,
        replacement: src('../../packages/client/ui-slots/src/index.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-client-ui-renderer\/src\/(.*)$/,
        replacement: src('../../packages/client/ui-renderer/src/$1'),
      },
      {
        find: /^@deepseek-ai\/cordis$/,
        replacement: src('../../vendor/cordis/src/index.ts'),
      },
      {
        find: /^@deepseek-ai\/dsh-llm\/types$/,
        replacement: src('../../packages/llm/llm/src/types.ts'),
      },
    ],
  },
  optimizeDeps: {
    include: [
      '@tanstack/react-virtual',
      'diff',
      'use-sync-external-store/shim/with-selector.js',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
