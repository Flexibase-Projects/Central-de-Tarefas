# PROJECT

## Purpose

Central de Tarefas is an internal workspace application for the Departamento de Inteligencia da Flexibase.
It combines task and project management, workspace-aware dashboards, operational modules (declared in the frontend module manifest and aligned with Supabase module definitions), and Supabase-backed data flows. Optional GitHub API usage (Octokit, `GITHUB_TOKEN`) supports repository metadata and version checks for linked projects.

## Stack

- Frontend: React 18, TypeScript, Vite
- UI: Tailwind CSS, Radix primitives, local `frontend/src/compat/mui/*` bridge, lucide-react
- Backend: Node.js, Express, TypeScript
- Data: Supabase
- Optional integrations: GitHub API via Octokit (see Key Integrations)

## Current version

- Monorepo `package.json` (raiz): **1.2.4** — manter alinhado ao que está em produção ou na branch de release; ao bump, atualizar `STATE.md` e notas de release se existirem. A sidebar exibe essa versão (injetada em build via Vite como `import.meta.env.VITE_APP_VERSION`).

## Repo Map

- `frontend/`: SPA, routes, auth guards, workspace modules (`frontend/src/features/workspace/module-manifest.tsx`), feature UIs under `frontend/src/components/` and `frontend/src/pages/`, compat UI layer
- `backend/`: REST API, services, route handlers, config, middleware
- `docs/`: SDD modular (`docs/architecture`, `docs/ops`, `docs/domain`), deploy, security, auth, and focused implementation notes
- `backend/migrations/`: schema and data alignment (e.g. module categories vs manifest)
- `scripts/`: local dev/build orchestration from the workspace root

## SDD entrypoints

- First read: `PROJECT.md`, `STATE.md`
- Architecture: `docs/architecture/overview.md`, `components.md`, `flows.md`
- Ops: `docs/ops/deploy.md`, `environments.md`, `runbook.md` (detail also in `docs/DEPLOY.md` where applicable)
- Domain rules: `docs/domain/invariants.md`
- Decisions: `docs/adr/`
- Methodology for keeping this pack aligned: [sdd-guardian](https://github.com/JuanDalvit1/sdd-guardian)

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
- GitHub (optional): Octokit in `backend/src/services/github.ts` when `GITHUB_TOKEN` is set; project records may store `github_*` fields for version checks
- Workspace-aware routing and guarded module access in the frontend shell

## Constraints

- Do not reintroduce direct `@mui/*` package imports into `frontend/src`.
- Keep server-only credentials out of `VITE_*` variables.
- Treat the compat layer as transitional infrastructure, not the final design system.
- Update code, validation, and impacted docs together when system behavior changes.
