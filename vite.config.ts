import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,glb}']
      },
      manifest: {
        name: 'Ikigai Space',
        short_name: 'Ikigai Space',
        description: 'A local-first personal workspace for planning, focus, reflection, and memory.',
        theme_color: '#08110d',
        background_color: '#08110d',
        display: 'standalone',
        id: '/',
        scope: '/',
        orientation: 'any',
        start_url: '/',
        categories: ['productivity', 'lifestyle'],
        shortcuts: [
          { name: 'Today', short_name: 'Today', url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Focus Room', short_name: 'Focus', url: '/focus', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Sanctuary', short_name: 'Sanctuary', url: '/garden', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Memories', short_name: 'Memories', url: '/memories', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] }
        ],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  server: { host: '127.0.0.1', headers: securityHeaders },
  preview: { host: '127.0.0.1', headers: securityHeaders },
  build: { sourcemap: false, emptyOutDir: true }
});
