import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const envDir = path.resolve(__dirname, '..')

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')

  return {
    plugins: [react()],
    envDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 3003,
      host: env.VITE_HOST || 'localhost',
      allowedHosts: ['cdt.flexibase.com'],
      hmr: env.VITE_HMR_HOST
        ? {
            host: env.VITE_HMR_HOST,
            protocol: (env.VITE_HMR_PROTOCOL as 'ws' | 'wss') || 'wss',
            clientPort: env.VITE_HMR_CLIENT_PORT ? Number(env.VITE_HMR_CLIENT_PORT) : undefined,
          }
        : true,
      proxy: {
        '/api': {
          target: `http://localhost:${env.BACKEND_PORT || 3002}`,
          changeOrigin: true,
        },
      },
    },
  }
})
