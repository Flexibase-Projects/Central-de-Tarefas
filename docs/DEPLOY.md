# Deploy em produção (PM2 / Nginx)

Este projeto sobe **dois processos** em modo desenvolvimento (`npm run dev`): backend e frontend (Vite) em portas diferentes. Em produção, use **um único processo** na porta desejada (ex.: 8088), com o backend servindo o build do frontend.

## Fluxo correto no servidor

1. **Build** (gera `frontend/dist` e `backend/dist`):
   ```bash
   npm run build
   ```
   ou, com pnpm:
   ```bash
   pnpm build
   ```

2. **Iniciar o servidor** com variável `PORT` (ex.: 8088):
   ```bash
   PORT=8088 npm run start
   ```
   Ou com PM2, usando o arquivo de exemplo na raiz do projeto:
   ```bash
   pm2 start ecosystem.config.cjs
   ```
   O `ecosystem.config.cjs` define `PORT=8088` e `NODE_ENV=production`; ajuste a porta em `env.PORT` se necessário.

O backend escuta em `PORT` e, se existir o diretório `frontend/dist`, serve a SPA e a API na mesma porta. O Nginx deve apontar para essa porta (ex.: 8088).

## Não usar em produção

- **Não** use `npm run dev` no PM2 para este projeto. Ele inicia dois processos (backend + frontend) em portas diferentes; o Nginx apontando só para 8088 veria apenas a API, sem a interface (página em branco ou “não aparece”).

## Variáveis de ambiente no servidor

- **PORT**: porta em que o backend escuta (ex.: `8088`). Pode estar no `.env.local` na raiz ou no `env` do PM2.
- **NODE_ENV**: defina `production` para o backend escutar em `0.0.0.0` (acessível atrás do Nginx).
- **FRONTEND_URL**: em produção, use a URL pública do site (ex.: `https://central-tarefas.seudominio.com`) para CORS e cookies, se aplicável.
- As demais variáveis (Supabase, GitHub etc.) seguem iguais ao desenvolvimento; use `.env.local` na raiz do projeto.

## Resumo

| Ambiente   | Comando           | Portas                    |
|-----------|-------------------|---------------------------|
| Desenvolvimento | `npm run dev` | Backend 3002, Frontend 3003 |
| Produção  | `npm run build` depois `npm run start` com `PORT=8088` | Uma porta (ex.: 8088) para API + SPA |
