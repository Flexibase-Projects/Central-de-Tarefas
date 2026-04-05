# Architecture Overview

## System Shape

The repository is a JavaScript/TypeScript monorepo with two main runtimes:

- `frontend/`: React SPA rendered with Vite during development
- `backend/`: Express API that also serves the built SPA in production

## Frontend

### Pré-autenticação e funil de workspace

Há fluxos públicos antes do contexto de workspace estar estabelecido: landing, login reutilizável e refinamentos do funil de acesso (commits recentes `b01dc86`, `2dbe1ef`). O seletor de tema nas telas pré-login segue o grid da aplicação.

### Estrutura geral

The frontend is organized around:

- route-driven pages in `frontend/src/pages/`
- shared UI and shell components in `frontend/src/components/`
- auth and workspace context in `frontend/src/contexts/`
- workspace module registration and sidebar grouping in `frontend/src/features/workspace/module-manifest.tsx` (keys must stay consistent with backend module definitions / Supabase)
- feature helpers, hooks, and utilities in `frontend/src/features/`, `hooks/`, `lib/`, and `utils/`
- a temporary compatibility layer in `frontend/src/compat/mui/` used after removing MUI packages from dependencies

## Backend

The backend exposes REST endpoints and integration services through:

- `backend/src/routes/`
- `backend/src/services/`
- `backend/src/config/`
- `backend/src/middleware/`

Respostas de erro da API seguem um contrato leve: `error`, opcionalmente `code` (ex.: `AUTH_TOKEN_INVALID`), `requestId` (também em `X-Request-Id`) e `details` quando aplicável; liveness em `/health` e `/api/health`, readiness em `/ready`. Ver ADR `docs/adr/0003-api-error-contract-and-observability.md`.

## Supporting Docs

- Deploy baseline: `docs/DEPLOY.md`
- Security baseline: `docs/security/README.md`
- SSO/auth material: `docs/auth/*`
- MUI removal context: `docs/SDD-MUI-REMOVAL-2026-04-02.md`
