# Architecture Overview

## System Shape

The repository is a JavaScript/TypeScript monorepo with two main runtimes:

- `frontend/`: React SPA rendered with Vite during development
- `backend/`: Express API that also serves the built SPA in production

## Frontend

The frontend is organized around:

- route-driven pages in `frontend/src/pages/`
- shared UI and shell components in `frontend/src/components/`
- auth and workspace context in `frontend/src/contexts/`
- feature helpers, hooks, and utilities in `frontend/src/features/`, `hooks/`, `lib/`, and `utils/`
- a temporary compatibility layer in `frontend/src/compat/mui/` used after removing MUI packages from dependencies

## Backend

The backend exposes REST endpoints and integration services through:

- `backend/src/routes/`
- `backend/src/services/`
- `backend/src/config/`
- `backend/src/middleware/`

## Supporting Docs

- Deploy baseline: `docs/DEPLOY.md`
- Security baseline: `docs/security/README.md`
- SSO/auth material: `docs/auth/*`
- MUI removal context: `docs/SDD-MUI-REMOVAL-2026-04-02.md`
