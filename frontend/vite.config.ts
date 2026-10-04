import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const isDocker = fs.existsSync('/.dockerenv')
const backendTarget = process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || (isDocker ? 'http://backend:8000' : 'http://localhost:8000')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs (needed for Docker)
    port: 3000,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

