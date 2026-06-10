/// <reference types="vitest" />
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa';

function getAppVersion() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }

  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

const appVersion = getAppVersion();
const buildTime = new Date().toISOString();

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    sourcemap: 'hidden',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globIgnores: [
          '**/*.wasm',
        ],
        maximumFileSizeToCacheInBytes: 5000000 // 5MB
      },
      manifest: {
        name: '轉角遇到貓',
        short_name: '遇到貓',
        description: '記錄每一次街角與貓相遇',
        theme_color: '#FFF3E0',
        background_color: '#FFF3E0',
        display: 'standalone',
        icons: [
          {
            src: 'cat-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'cat-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'cat-icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'cat-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ]
      }
    }),
    tsconfigPaths()
  ],
})
