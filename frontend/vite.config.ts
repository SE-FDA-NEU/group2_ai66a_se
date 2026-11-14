import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const isDocker = fs.existsSync('/.dockerenv')
const rawViteApiUrl = process.env.VITE_API_URL?.trim()
let apiOriginTarget: string | undefined
if (rawViteApiUrl && (rawViteApiUrl.startsWith('http://') || rawViteApiUrl.startsWith('https://'))) {
  try {
    apiOriginTarget = new URL(rawViteApiUrl).origin
  } catch {
    apiOriginTarget = undefined
  }
}
const backendTarget = process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || apiOriginTarget || (isDocker ? 'http://backend:8000' : 'http://localhost:8000')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
  envDir: '../',
  envPrefix: ['VITE_', 'GOOGLE_'],
  server: {
    host: true, // Listen on all local IPs (needed for Docker)
    port: 3000,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

