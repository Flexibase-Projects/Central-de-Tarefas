# Deploy em produção (PM2 / Nginx)

Este projeto sobe **dois processos**: backend (Express na porta 3002) e frontend (Vite). Em produção, há duas opções:

## Opção 1: Modo desenvolvimento no servidor (recomendado para testes)

Use o script `dev:server` que roda o frontend na porta 8088 (acessível externamente) e o backend na 3002 (interno, via proxy do Vite):

```bash
npm run dev:server
```

Para PM2:
```bash
pm2 start "npm run dev:server" --name CDT
```

O Nginx aponta para a porta **8088** (frontend). O Vite faz proxy de `/api` para o backend (porta 3002).

---

## Opção 2: Modo produção (build compilado)

Para melhor performance, use o build compilado. O backend serve API + frontend na mesma porta.

### Fluxo

1. **Build** (gera `frontend/dist` e `backend/dist`):
   ```bash
   npm run build
   ```

2. **Iniciar o servidor** com variável `PORT` (ex.: 8088):
   ```bash
   PORT=8088 npm run start
   ```
   Ou com PM2, usando o arquivo de exemplo na raiz do projeto:
   ```bash
   pm2 start ecosystem.config.cjs
   ```

O backend escuta em `PORT` e, se existir o diretório `frontend/dist`, serve a SPA e a API na mesma porta.

---

## Não usar diretamente

- **Não** use `npm run dev` (sem `:server`) no PM2. Ele inicia o frontend na porta 3003 (localhost), não acessível externamente.
- Use `npm run dev:server` para desenvolvimento no servidor ou `npm run start` para produção (após build).

## Variáveis de ambiente no servidor

- **PORT**: porta em que o backend escuta (ex.: `8088`). Pode estar no `.env.local` na raiz ou no `env` do PM2.
- **NODE_ENV**: defina `production` para o backend escutar em `0.0.0.0` (acessível atrás do Nginx).
- **FRONTEND_URL**: em produção, use a URL pública do site (ex.: `https://central-tarefas.seudominio.com`) para CORS e cookies.

## Resumo

| Ambiente              | Comando                    | Portas                              |
|-----------------------|----------------------------|-------------------------------------|
| Desenvolvimento local | `npm run dev`              | Backend 3002, Frontend 3003         |
| Servidor (dev mode)   | `npm run dev:server`       | Backend 3002, Frontend 8088         |
| Servidor (produção)   | `npm run build` + `start`  | Uma porta (ex.: 8088) para API + SPA |
