/**
 * Exemplo de configuração PM2 para deploy em produção.
 * Uso:
 *   1. npm ci
 *   2. npm run build
 *   3. pm2 start ecosystem.config.cjs --env production
 *
 * O backend serve a API e o build do frontend (frontend/dist) na mesma porta.
 * Variáveis server-only (Supabase, GitHub, etc.): use .env.local na raiz do projeto.
 */
module.exports = {
  apps: [
    {
      name: 'cdt-inteligencia',
      script: 'backend/dist/index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      merge_logs: true,
      max_memory_restart: '512M',
      restart_delay: 5000,
      kill_timeout: 10000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8088,
      },
    },
  ],
};
