# PROJECT

## Purpose

Central de Tarefas is an internal workspace application for the Departamento de Inteligencia da Flexibase.
It combines task and project management, workspace-aware dashboards, operational modules, and GitHub/Supabase-backed data flows.

## Stack

- Frontend: React 18, TypeScript, Vite
- UI: Tailwind CSS, Radix primitives, local `frontend/src/compat/mui/*` bridge, lucide-react
- Backend: Node.js, Express, TypeScript
- Data: Supabase
- Integrations: GitHub API via Octokit

## Repo Map

- `frontend/`: SPA, routes, auth guards, workspace modules, compat UI layer
- `backend/`: REST API, services, route handlers, config, middleware
- `docs/`: deploy, security, auth, and task-specific implementation notes
- `scripts/`: local dev/build orchestration from the workspace root

## Main Commands

- `npm run dev`: start frontend and backend for local development
- `npm run dev:server`: start the LAN/dev-server variant
- `npm run build`: build frontend and backend
- `npm run lint`: run workspace linting
- `npm run ci`: lint, build, and runtime audit

## Runtime Shape

- Local development usually runs frontend on `http://localhost:3003` and backend on `http://localhost:3002`.
- Production serves the compiled SPA from the backend process behind PM2/Nginx.
- The frontend still contains a temporary compatibility bridge in `frontend/src/compat/mui/` after MUI package removal.

## Key Integrations

- Supabase for application data and auth-adjacent flows
- GitHub token-backed repository metadata and activity ingestion
- Workspace-aware routing and guarded module access in the frontend shell

## Constraints

- Do not reintroduce direct `@mui/*` package imports into `frontend/src`.
- Keep server-only credentials out of `VITE_*` variables.
- Treat the compat layer as transitional infrastructure, not the final design system.
- Update code, validation, and impacted docs together when system behavior changes.
