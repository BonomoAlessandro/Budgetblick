/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Budgetblick – Ausgaben-Manager',
        short_name: 'Budgetblick',
        description:
          'Fixkosten, Verträge und Ausgaben im Blick. Alle Daten bleiben auf deinem Gerät.',
        lang: 'de-CH',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Ausgabe erfassen',
            short_name: 'Erfassen',
            description: 'Neue Ausgabe schnell erfassen',
            url: '/?erfassen',
            icons: [{ src: '/icons/shortcut-add-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // App-Shell vorab cachen; die grossen Tesseract-Dateien nicht (erst beim ersten Scan).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        globIgnores: ['tesseract/**'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tesseract/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract',
              expiration: { maxEntries: 10 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
