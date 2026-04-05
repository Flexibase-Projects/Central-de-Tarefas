# Critical Flows

## Local Development

1. `npm run dev` starts the orchestrated workspace development flow.
2. Frontend runs through Vite.
3. Backend runs through the TypeScript watch/dev server.
4. The browser talks to the backend API while the frontend shell handles routing and workspace UI state.

## Frontend Runtime Data Flow

1. App bootstrap mounts providers and router state.
2. Auth/workspace guards decide whether a module route can render.
3. Pages fetch or refresh workspace-scoped data.
4. Shared feedback components such as sync banners and loading surfaces communicate in-flight refresh state without dropping the current page context.

## Autenticação e API (`/api/users/me`)

1. O browser envia `Authorization: Bearer <access_token>` (sessão Supabase) nas chamadas à API (via proxy Vite `/api` em dev ou URL configurada).
2. O Express aplica `requestIdMiddleware` e depois `authMiddleware`, que chama `supabase.auth.getUser(token)` **no backend** com a mesma instância configurada em `SUPABASE_URL` / chaves (ou fallbacks `VITE_*` documentados em `.env.example`). Se o JWT for de outro projeto ou o client estiver placeholder, o middleware define `authFailureCode = AUTH_TOKEN_INVALID` e rotas como `GET /api/users/me` respondem **401** com `code: AUTH_TOKEN_INVALID` (e **401** com `AUTH_MISSING` se não houver Bearer).
3. Com JWT válido e vínculo em `cdt_users`, o middleware preenche o contexto efetivo (`x-user-id`); `GET /api/users/me` devolve o perfil. Sem linha em `cdt_users` mas com identidade Auth válida, a API responde **403** com `code: ACCESS_PENDING`.
4. O `AuthProvider` deduplica requisições concorrentes ao mesmo `access_token` (mapa in-flight) e ignora resultados obsoletos via geração monotônica, reduzindo rajadas em Strict Mode.
5. Respostas de erro passam a expor `requestId` (header `X-Request-Id` e, quando usar `jsonError`, no JSON) para correlacionar com logs do servidor.

## Operação e readiness

- **Liveness**: `GET /health` ou `GET /api/health` — processo ativo.
- **Readiness**: `GET /ready` — checagem leve ao Postgres/Supabase via `cdt_users`; **503** com `code: SUPABASE_UNAVAILABLE` se a dependência falhar.
- **Rate limit**: rotas sob `/api/auth` limitadas por IP (`API_AUTH_RATE_LIMIT_MAX`, janela 15 minutos); atrás de proxy, configurar `TRUST_PROXY_HOPS` se necessário.

## Production Serving

1. `npm run build` produces `frontend/dist` and backend output.
2. PM2 starts the backend process.
3. The backend serves API responses and compiled SPA assets from one runtime.
4. Nginx or another reverse proxy should forward public traffic to that backend process, not to a Vite dev server.

## Workspace shell: delivery heat (gamificação)

Com o módulo de gamificação ativo, o mapa `userId → todos_delivered_30d` alimenta `DeliveryHeatMapProvider` e tiers em `frontend/src/utils/delivery-heat.ts`. O tier **Super quente** usa partículas leves em React (`SuperhotEmberParticles`, `superhot-ember-seed.ts`) com parâmetros determinísticos por utilizador; animação em `frontend/src/index.css` (`@keyframes cdt-superhot-ember-rise`, classes `cdt-superhot-embers`). Integração em `DeliveryHeatAvatarWrap`, tooltip rico de membro no `MainLayout` e `DeliveryHeatAssigneeInline`. Com `prefers-reduced-motion: reduce`, `.cdt-superhot-embers` fica oculto.
