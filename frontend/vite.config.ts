import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const rootPackageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
) as { version?: string }
const appVersion = rootPackageJson.version ?? '0.0.0'

const envDir = path.resolve(__dirname, '..')

/**
 * Alvo do proxy /api → backend Express (lê .env.local na raiz do monorepo).
 * Não usar SUPABASE_URL aqui: são serviços/portas diferentes (API ≠ :54321).
 */
function resolveApiProxyTarget(env: Record<string, string>): string {
  const fromUrl = (env.BACKEND_DEV_URL || env.VITE_API_PROXY_TARGET || '').trim()
  if (fromUrl) {
    try {
      return new URL(fromUrl).origin
    } catch {
      console.warn(
        '[vite] BACKEND_DEV_URL / VITE_API_PROXY_TARGET inválido; usando BACKEND_HOST + BACKEND_PORT.',
      )
    }
  }
  const port = Number(env.BACKEND_PORT) || 3002
  const host = (env.BACKEND_HOST || '127.0.0.1').trim() || '127.0.0.1'
  return `http://${host}:${port}`
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  const apiProxyTarget = resolveApiProxyTarget(env)
  if (mode === 'development') {
    console.info(`[vite] proxy /api → ${apiProxyTarget}`)
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
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
          target: apiProxyTarget,
          changeOrigin: true,
          timeout: 120_000,
          proxyTimeout: 120_000,
        },
      },
    },
  }
})
