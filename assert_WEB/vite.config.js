import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/vi-api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vi-api/, '/api'),
      },
      '/api/eastmoney': {
        target: 'https://fund.eastmoney.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/eastmoney/, ''),
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
