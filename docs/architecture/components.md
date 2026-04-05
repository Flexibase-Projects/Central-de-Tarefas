# Components And Boundaries

## Frontend Shell

- `frontend/src/App.tsx` and the route tree own application bootstrap and top-level providers.
- Auth and workspace guards control which modules are visible for the current user/session.
- `module-manifest.tsx` defines module metadata (paths, icons, sidebar section, order). Static sidebar items (e.g. Prioridades, Mapa) are merged into sections by resolver helpers in the same module.
- Pages should compose shared components instead of re-implementing layout primitives.

## Compat UI Layer

- `frontend/src/compat/mui/` exists only to preserve application behavior during the post-MUI transition.
- Wrappers in this layer must behave like ordinary React components and must not violate hook ordering rules.
- New UI work should prefer local/shared primitives first and touch the compat layer only when maintaining existing consumers.

## Backend Services

- Routes should stay thin and delegate data/integration work to `backend/src/services/`.
- Secrets and privileged Supabase access belong on the backend only.
- The backend is the production entrypoint for API traffic and compiled frontend asset serving.

## Workspace profile UI

- `frontend/src/components/profile/` groups the Perfil page: hero card with edit affordance, Radix dialog for name and local image upload, optional team gamification chart (Recharts), ranking snippet, and personal performance (indicators + compact level/XP line).

## Gamification UI (delivery heat)

- `frontend/src/utils/delivery-heat.ts`: tier thresholds and labels from 30-day delivered to-do count.
- `frontend/src/contexts/DeliveryHeatContext.tsx`: map `userId → count` from workspace members; `useDeliveryHeatForUser` for consumers.
- `frontend/src/components/gamification/DeliveryHeatAvatarWrap.tsx` and `DeliveryHeatAssigneeInline.tsx`: optional visual wrappers; no-op when gamification is disabled or tier is `none`.

## Documentation Boundary

- `PROJECT.md` is the short project map.
- `STATE.md` tracks current status and active risks.
- Detailed operational and architectural truth belongs under `docs/`.
