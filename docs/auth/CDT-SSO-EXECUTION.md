# Execucao do SSO no Central de Tarefas

## Objetivo

Preparar o Central de Tarefas para entrar em um ecossistema com SSO central, preservando dados historicos, sem quebrar o login legado no rollout e sem transformar o CDT no lugar onde a identidade geral do usuario sera gerenciada.

O alvo desta execucao foi:

- fechar o funil de UX por workspace;
- preparar o adapter do CDT para o Portal SSO;
- introduzir escopo real de workspace nas camadas criticas;
- manter compatibilidade com o estado atual do produto;
- deixar o projeto pronto para ligar o Portal central quando ele existir.

## Decisao Arquitetural

O CDT nao sera o sistema central de autenticacao.

O desenho adotado foi:

- um Supabase Auth central para identidade;
- um Portal SSO central para login, sessao global, administracao e emissao de authorization code;
- o CDT como aplicacao consumidora, com sessao local e membership contextual por workspace.

Isso significa que o CDT:

- nao sera responsavel por registrar usuarios do ecossistema;
- nao sera a origem de verdade da identidade global;
- nao compartilhara sessao "magicamente" por localStorage;
- sempre dependera do Portal central para o fluxo real de SSO.

## O que foi implementado no CDT

### 1. Fundacao do adapter de SSO central

Foi criada a fundacao do adapter para conversar com o Portal SSO:

- `GET /api/sso/config`
- `POST /api/sso/start`
- `POST /api/sso/exchange`
- `GET /api/sso/logout-url`

Esses endpoints permitem:

- descobrir se o SSO central esta habilitado;
- iniciar o redirect para o Portal;
- trocar `authorization code` por sessao local;
- calcular logout central com retorno controlado.

Arquivos principais:

- `backend/src/config/central-sso.ts`
- `backend/src/routes/sso.ts`
- `frontend/src/lib/central-sso.ts`
- `frontend/src/pages/AuthCallback.tsx`

### 2. Vinculo entre identidade central e usuario local

O modelo local foi preparado para manter o usuario historico do CDT e vincula-lo a uma identidade central sem reescrever FKs antigas.

Campos principais:

- `cdt_users.central_user_id`
- `cdt_users.identity_status`
- `cdt_users.last_identity_sync_at`

A regra mantida foi:

- preservar `cdt_users.id` como identidade local do CDT;
- resolver o usuario por `central_user_id` primeiro;
- cair no legado apenas como compatibilidade;
- nunca fundir usuarios por deducao automatica agressiva.

Arquivos principais:

- `backend/migrations/012_central_identity_sso.sql`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/users.ts`
- `backend/src/services/native-admin.ts`

### 3. UX canonica por workspace

O roteamento foi reorganizado para o modelo correto:

- `/workspaces`
- `/w/:workspaceSlug/login`
- `/w/:workspaceSlug/*`

O frontend passou a:

- entrar sempre por selecao de workspace;
- redirecionar rotas protegidas para o login contextual;
- preservar `returnTo`;
- tratar callback com mensagens legiveis;
- usar o workspace da URL como fonte de verdade do contexto ativo.

Arquivos principais:

- `frontend/src/App.tsx`
- `frontend/src/components/auth/AuthGuard.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Workspaces.tsx`
- `frontend/src/lib/workspace-routing.ts`
- `frontend/src/hooks/use-workspace-access.ts`

### 4. API de workspaces para sustentar a UX

Foram adicionados ou consolidados os endpoints necessarios para a experiencia contextual:

- `GET /api/auth/public-workspaces`
- `POST /api/auth/request-access`
- `GET /api/workspaces/mine`
- `GET /api/workspaces/:workspaceSlug/context`
- `GET /api/workspaces/:workspaceSlug/members`

Esses endpoints passaram a:

- listar apenas workspaces publicos e ativos;
- informar estado de acesso do usuario;
- expor pending, blocked e not_found de forma explicita;
- sustentar tela publica, login, request access e layout autenticado.

Arquivos principais:

- `backend/src/routes/auth-hint.ts`
- `backend/src/routes/workspaces.ts`
- `backend/src/services/workspaces.ts`
- `backend/migrations/013_workspace_projection_and_scope.sql`

### 5. Hardening de escopo por workspace

As rotas principais do CDT passaram a exigir contexto de workspace.

Tambem foi ajustado o escopo de tabelas operacionais para reduzir vazamento cross-workspace.

Foram reforcados principalmente:

- `projects`
- `activities`
- `todos`
- `project-comments`
- `notifications`
- `indicators`
- `tasks`

No caso de `tasks`, alem do middleware, foi incluido o check real para garantir que projeto e tarefa pertencem ao workspace ativo.

Arquivos principais:

- `backend/src/index.ts`
- `backend/src/middleware/workspace.ts`
- `backend/src/services/workspace-access.ts`
- `backend/src/routes/tasks.ts`

## O que foi validado

### Validacoes tecnicas

Foram executados com sucesso:

- build do backend;
- build do frontend;
- lint do frontend sem novos erros;
- auditoria automatizada dos funis principais.

### Funis validados no ambiente atual

Foi validado com sucesso:

- carregamento de `/workspaces`;
- redirect de rota protegida para login contextual;
- preservacao de `returnTo`;
- renderizacao do login por workspace;
- abertura do formulario de solicitar cadastro;
- tratamento de callback sem `code/state`;
- tratamento de callback com erro do provider;
- tratamento de callback com `state` invalido;
- resposta controlada quando o SSO central esta desligado.

Relatorio:

- `output/playwright/ux_audit_report.json`

Scripts do gate:

- `output/playwright/run_ux_audit.ps1`
- `output/playwright/ux_audit_run_code.js`

## O que ficou pendente

O CDT ficou pronto para consumir o Portal SSO, mas o SSO central ainda nao foi homologado ponta a ponta porque o Portal central ainda nao foi ligado neste ambiente.

Pontos pendentes:

- criar e operar o Portal SSO central;
- registrar o CDT como client real no Portal;
- preencher `CENTRAL_SSO_*` com valores validos;
- ativar `CENTRAL_SSO_ENABLED=true`;
- executar o happy path real com Portal ligado;
- validar logout global real;
- validar multiplos workspaces com memberships reais;
- endurecer etapas futuras como cookie httpOnly local, RLS ampliado e reducao adicional de service role.

## Resposta executiva

O CDT esta preparado para o SSO central.

O que ja esta pronto:

- adapter local;
- UX publica e contextual por workspace;
- rotas e API para workspace access;
- base de vinculo entre usuario local e identidade central;
- hardening principal do fluxo.

O que ainda depende de outro projeto:

- o Portal SSO central;
- a operacao real do login unico;
- a administracao central de usuarios do ecossistema.

## Checklist de ativacao futura

- criar o projeto do Portal SSO;
- definir dominio do Portal;
- definir cookie domain;
- registrar `client_id`, `redirect_uri` e `post_logout_redirect_uri` do CDT;
- ligar `CENTRAL_SSO_ENABLED=true` no ambiente do CDT;
- validar callback real;
- validar logout global;
- acompanhar auditoria e logs na primeira onda.
