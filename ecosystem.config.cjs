/**
 * Exemplo de configuração PM2 para deploy em produção.
 * Uso: após "npm run build", execute "pm2 start ecosystem.config.cjs"
 *
 * O backend serve a API e o build do frontend (frontend/dist) na mesma porta.
 * Variáveis adicionais (Supabase, GitHub etc.): use .env.local na raiz do projeto (o backend já carrega).
 */
module.exports = {
  apps: [
    {
      name: 'cdt-inteligencia',
      script: 'backend/dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8088,
      },
    },
  ],
};
