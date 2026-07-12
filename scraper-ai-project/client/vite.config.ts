import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/chat": "http://[::1]:3004",
      "/sessions": "http://[::1]:3004",
      "/monitors": "http://[::1]:3004",
      "/api": "http://127.0.0.1:8001"
    }
  },
  css: {
    postcss: './postcss.config.js',
  }
})
