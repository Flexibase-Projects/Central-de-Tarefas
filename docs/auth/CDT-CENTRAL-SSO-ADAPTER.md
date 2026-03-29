# Adapter do Central de Tarefas para SSO Central

## Resumo

O CDT hoje autentica direto no Supabase do projeto, valida o bearer token no backend e resolve o usuário local via `cdt_users.id` ou fallback por e-mail. Para entrar no ecossistema de SSO central sem perder autoria, vínculos operacionais ou histórico, o CDT precisa manter `cdt_users.id` como identidade local estável e passar a vincular o usuário central em `cdt_users.central_user_id`.

Este repositório agora tem a fundação para isso:

- migração de vínculo explícito com identidade central;
- middleware backend que resolve primeiro por `central_user_id`;
- endpoints `start/exchange/logout-url` para o Portal/Bridge central;
- callback frontend para concluir `authorization code -> session`.

## Estado Atual Encontrado

- O frontend ainda usa `supabase.auth.signInWithPassword` como fluxo principal em [AuthContext.tsx](/Users/juand/Documents/GitHub/Central-de-Tarefas/frontend/src/contexts/AuthContext.tsx).
- O backend valida o JWT via Supabase e resolve o usuário local em [auth.ts](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/src/middleware/auth.ts).
- O modelo local continua fortemente acoplado a `cdt_users.id` para autoria, atribuição, notificações, custos, papéis e gamificação.
- A UX de workspace já começou no frontend, mas o roteamento e a API de workspaces ainda não sustentam o fluxo inteiro.
- O backend ainda precisa de hardening adicional para o rollout final: reduzir dependência de `service role`, fechar rotas abertas, endurecer `auth-hint`, aplicar escopo por workspace e avançar em RLS.

## Arquitetura de Integração

- O Portal Central continua sendo o ponto de login e sessão global.
- O CDT passa a se registrar como cliente do Portal com `client_id`, `redirect_uri` e `post_logout_redirect_uri`.
- O frontend do CDT recebe o callback em `/auth/callback`.
- O frontend envia `code + state` para `POST /api/sso/exchange`.
- O backend valida `state`, reenviando `code`, `client_id`, `client_secret`, `redirect_uri` e `nonce` ao Bridge central.
- O Bridge devolve uma sessão reaproveitável do Supabase central para o adapter atual do CDT.
- O frontend aplica `supabase.auth.setSession(...)`, e o backend continua validando o JWT.
- A identidade local é resolvida por `central_user_id` primeiro, sem reescrever FKs históricas.

## Mudanças por Camada

### Backend

- Nova migration em [012_central_identity_sso.sql](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/migrations/012_central_identity_sso.sql).
- Novo config central de SSO em [central-sso.ts](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/src/config/central-sso.ts).
- Novas rotas em [sso.ts](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/src/routes/sso.ts):
  - `GET /api/sso/config`
  - `POST /api/sso/start`
  - `POST /api/sso/exchange`
  - `GET /api/sso/logout-url`
- O middleware de auth em [auth.ts](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/src/middleware/auth.ts) agora busca por `central_user_id` antes de cair no legado por `id` e e-mail.
- Provisionamento/admin em [users.ts](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/src/routes/users.ts) e [native-admin.ts](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/src/services/native-admin.ts) já marca vínculos `linked`.

### Banco

- `cdt_users.central_user_id`
- `cdt_users.identity_status`
- `cdt_users.last_identity_sync_at`
- Índice único parcial para impedir dois usuários locais apontarem para a mesma identidade central.
- Check constraint para o estado de vínculo.

### Frontend

- Novo cliente do adapter em [central-sso.ts](/Users/juand/Documents/GitHub/Central-de-Tarefas/frontend/src/lib/central-sso.ts).
- Novo callback em [AuthCallback.tsx](/Users/juand/Documents/GitHub/Central-de-Tarefas/frontend/src/pages/AuthCallback.tsx).
- Nova rota `/auth/callback` em [App.tsx](/Users/juand/Documents/GitHub/Central-de-Tarefas/frontend/src/App.tsx).
- `logout()` limpa corretamente o estado de impersonação em [AuthContext.tsx](/Users/juand/Documents/GitHub/Central-de-Tarefas/frontend/src/contexts/AuthContext.tsx).

## Migração e Preservação de Dados

- `cdt_users.id` continua sendo a chave local do CDT.
- Nenhuma FK histórica precisa ser reescrita para o rollout inicial.
- O vínculo automático só acontece quando o match é inequívoco:
  - primeiro por `central_user_id`
  - depois por `cdt_users.id == auth user id`
  - por fim por e-mail, apenas sem conflito explícito
- Se um usuário local já estiver ligado a outro `central_user_id`, o backend passa a retornar conflito em operações administrativas de vínculo.
- O rollout recomendado continua sendo:
  - backfill/dry-run fora do request path
  - revisão manual dos ambíguos
  - feature flag por app
  - corte gradual do login legado

## Testes e Aceite

- Aplicar a migration `012`.
- Configurar `CENTRAL_SSO_*` no backend e `CENTRAL_SSO_REDIRECT_URI` apontando para `/auth/callback`.
- Validar `POST /api/sso/start` com SSO desligado e ligado.
- Validar callback com `state` inválido, expirado e ausente.
- Validar `POST /api/sso/exchange` com resposta válida e inválida do Bridge.
- Confirmar que um usuário com `central_user_id` autenticado entra no CDT sem alterar `created_by`, `assigned_to` ou `user_id` históricos.
- Confirmar que logout limpa impersonação residual.

## Riscos

- O adapter atual do CDT ainda usa sessão Supabase no frontend; a migração para cookie `httpOnly` local continua como etapa futura.
- A UX de workspace ainda não está totalmente conectada ao router e à API.
- Ainda existem gaps de hardening fora do adapter:
  - rotas abertas em `projects/tasks/activities`
  - dependência ampla de `service role`
  - uso estrutural de `x-user-id`
  - falta de RLS nas tabelas críticas
  - bucket `activity-covers` público

## Checklist Final

- Executar [012_central_identity_sso.sql](/Users/juand/Documents/GitHub/Central-de-Tarefas/backend/migrations/012_central_identity_sso.sql)
- Preencher `CENTRAL_SSO_*` no ambiente
- Registrar o CDT como client no Portal Central
- Ligar o callback `/auth/callback`
- Backfill `central_user_id` com dry-run e relatório
- Revisar conflitos de e-mail/identidade
- Habilitar SSO por feature flag
- Endurecer rotas críticas e reduzir superfície de `service role`
- Introduzir escopo real de workspace antes do rollout total
