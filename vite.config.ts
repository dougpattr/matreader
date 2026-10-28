import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

/* BASE_PATH permite publicar em subpasta (GitHub Pages: /matreader/). */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg', 'icons/*.png', 'robots.txt'],
      manifest: {
        id: './',
        name: 'MatReader — Matrículas de imóveis',
        short_name: 'MatReader',
        description:
          'Transforma a matrícula do imóvel em documento conferido, desenha o terreno sobre o satélite e junta PDFs — funciona offline.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4ede3',
        theme_color: '#5f6787',
        categories: ['productivity', 'utilities', 'business'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        shortcuts: [
          { name: 'Converter matrícula', short_name: 'Converter', url: './#/tabs/inicio' },
          { name: 'Acervo de matrículas', short_name: 'Acervo', url: './#/tabs/acervo' },
        ],
        file_handlers: [
          {
            action: './',
            accept: {
              'application/pdf': ['.pdf'],
              'application/json': ['.json'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
            },
          },
        ],
        launch_handler: { client_mode: 'focus-existing' },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,webmanifest,ico,txt}'],
        // OCR e recursos do pdf.js são grandes: entram no cache na primeira
        // utilização (ou pelo botão "Preparar uso offline").
        globIgnores: ['vendor/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/vendor/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'matreader-vendor',
              expiration: { maxEntries: 120 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/(server|services)\.arcgisonline\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tiles-esri',
              expiration: { maxEntries: 2500, maxAgeSeconds: 60 * 60 * 24 * 45, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/clarity\.maptiles\.arcgis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tiles-esri-hd',
              expiration: { maxEntries: 2500, maxAgeSeconds: 60 * 60 * 24 * 45, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tiles-osm',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          ionic: ['@ionic/vue', '@ionic/vue-router'],
          leaflet: ['leaflet'],
          'pdf-lib': ['pdf-lib'],
        },
      },
    },
  },
  worker: { format: 'es' },
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
  },
});
