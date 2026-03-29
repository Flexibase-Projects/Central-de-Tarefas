# Deploy em Produção

Este projeto deve ser publicado como build compilado. O fluxo recomendado é:

1. `npm ci`
2. `npm run build`
3. `pm2 start ecosystem.config.cjs --env production`

O backend serve a API e a SPA compilada na mesma porta. Em produção, o Nginx deve apontar para a porta do processo PM2 e não para o Vite dev server.

## Baseline de produção

Use `frontend/dist` como artefato servido em produção. O backend já expõe a SPA quando o diretório existe, então não há necessidade de manter o Vite público no servidor.

Configuração sugerida:

```bash
NODE_ENV=production
PORT=8088
FRONTEND_URL=https://seu-dominio-publico
```

Se houver proxy reverso, ele deve encaminhar para a porta do processo PM2 e preservar `Host` e suporte a WebSocket apenas quando necessário para o frontend local de desenvolvimento.

## Modo de desenvolvimento

O modo com `npm run dev:server` continua útil para validação em máquina local ou ambiente de rede controlada, mas não deve ser usado como baseline de produção.

```bash
npm run dev:server
```

Isso sobe o frontend com Vite e o backend para cenários de teste, incluindo HMR e proxy `/api`.

## Contrato de ambiente

Separe os valores em duas classes:

* `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`, `MANUAL_INVITE_TEMP_PASSWORD` e demais integrações são server-only.
* `VITE_*` é público por definição e entra no bundle do navegador.

O `VITE_SUPABASE_ANON_KEY` pode existir no cliente porque é a chave anônima, mas nunca deve ser confundido com `SUPABASE_SERVICE_ROLE_KEY`.

Para a baseline consolidada de segurança e a rotina de manutenção, veja [docs/security/README.md](/Users/juand/Documents/GitHub/Central-de-Tarefas/docs/security/README.md).

## Resumo

| Ambiente | Comando | Observação |
| --- | --- | --- |
| Produção | `npm ci && npm run build && pm2 start ecosystem.config.cjs --env production` | Build compilado, uma porta, sem Vite público |
| Local / LAN | `npm run dev:server` | Apenas para teste e desenvolvimento |
