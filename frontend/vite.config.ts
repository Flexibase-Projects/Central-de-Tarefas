import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Porta: usa VITE_PORT do ambiente ou 3003 (dev local)
    port: Number(process.env.VITE_PORT) || 3003,
    // Host: 0.0.0.0 para aceitar conexões externas (servidor)
    host: process.env.VITE_HOST || 'localhost',
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3002}`,
        changeOrigin: true,
      },
    },
  },
})
