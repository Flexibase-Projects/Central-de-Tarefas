# ADR 0003: Contrato de erros HTTP, requestId e health da API

## Status

Aceito (implementado).

## Contexto

Respostas 401 genéricas em `GET /api/users/me` dificultavam distinguir “sem token”, “JWT rejeitado pelo Supabase do backend” (URL/chave desalinhadas) e outros estados. Em desenvolvimento, o React Strict Mode e eventos duplicados do Supabase geravam rajadas de chamadas idênticas ao mesmo endpoint.

## Decisão

1. **Códigos estáveis** no JSON de erro (`code`), além do texto em `error`, para o cliente e operação tratarem sem depender de mensagem livre. Códigos principais: `AUTH_MISSING`, `AUTH_TOKEN_INVALID`, `AUTH_CONTEXT_INCOMPLETE`, `ACCESS_PENDING`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `SUPABASE_UNAVAILABLE`, `INTERNAL_ERROR`, `PAYLOAD_TOO_LARGE`, `RATE_LIMIT_EXCEEDED`.
2. **`requestId`** por requisição: gerado no servidor (ou reutilizado de `X-Request-Id` do cliente, até 128 caracteres), devolvido no header `X-Request-Id` e no corpo quando a resposta usa o helper `jsonError`.
3. **Auth**: o middleware define `req.authFailureCode = 'AUTH_TOKEN_INVALID'` quando existe Bearer mas `supabase.auth.getUser` falha; rotas como `/api/users/me` retornam 401 com código explícito.
4. **Health**: `GET /health` e `GET /api/health` (liveness); `GET /ready` verifica acesso ao banco via leitura mínima em `cdt_users` e responde 503 com `SUPABASE_UNAVAILABLE` quando aplicável.
5. **Rate limit**: `express-rate-limit` apenas em `/api/auth`, configurável por `API_AUTH_RATE_LIMIT_MAX` (padrão 300 / 15 min por IP).
6. **Proxy**: `TRUST_PROXY_HOPS` opcional para `trust proxy` quando o rate limit precisar do IP real atrás de Nginx.

## Consequências

- Clientes podem correlacionar logs com `requestId` e tratar `AUTH_TOKEN_INVALID` com mensagem orientando conferência de `SUPABASE_URL` / chaves no backend.
- Respostas de workspace mantêm campos legados (`workspace`, códigos `WORKSPACE_*`) e passam a incluir `requestId` quando o middleware de request id rodou.
- Novas rotas devem preferir `jsonError` para 4xx/5xx “de API” a fim de manter o contrato.

## Referências no código

- `backend/src/utils/api-error.ts`, `backend/src/middleware/request-id.ts`, `backend/src/middleware/auth.ts`, `backend/src/index.ts`, `backend/src/utils/supabase-health.ts`.
